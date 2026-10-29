import type { AchievementDef, SaveData } from '../../core/types';
import { formatNumber } from '../../core/format';
import { esc, topBar, pageHeader, progressBar } from '../components';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  achievementProgress,
} from '../../data/achievements';
import type { AchievementFilter } from '../state';
import { formatDate } from './shared';

const CATEGORY_ICON: Record<AchievementDef['category'], string> = {
  inicio: '🌱',
  romance: '💘',
  sobrevivencia: '🔥',
  progressao: '📈',
};

const CATEGORY_BLURB: Record<AchievementDef['category'], string> = {
  inicio: 'Os primeiros passos de uma história que começa no calçadão.',
  romance: 'Encontros, finais e a parte que não cabe na planilha.',
  sobrevivencia: 'Feitos que só acontecem quando o coração acelera.',
  progressao: 'A mala fica mais pesada — de conquistas.',
};

function categoryCount(save: SaveData, category: AchievementDef['category']): { unlocked: number; total: number } {
  const entries = ACHIEVEMENTS.filter((achievement) => achievement.category === category);
  return {
    unlocked: entries.filter((achievement) => save.achievements[achievement.id]).length,
    total: entries.length,
  };
}

function achievementCard(achievement: AchievementDef, save: SaveData): string {
  const unlocked = !!save.achievements[achievement.id];
  const hidden = !!achievement.secret && !unlocked;
  const progress = achievementProgress(achievement, { save });
  const ratio = progress.target > 0 ? Math.min(1, progress.current / progress.target) : 0;
  const date = save.achievements[achievement.id]?.unlockedAt;
  return `<article class="achievement-card ${unlocked ? 'is-unlocked' : ''} ${hidden ? 'is-secret' : ''}" style="--category-color:${categoryColor(achievement.category)}">
    <div class="achievement-icon" aria-hidden="true">${unlocked ? achievement.emoji : hidden ? '❔' : achievement.emoji}</div>
    <div class="achievement-copy">
      <div class="achievement-top">
        <span class="tag tag-category">${esc(categoryLabel(achievement.category))}</span>
        <span class="achievement-reward">+${formatNumber(achievement.reward)} 🪙</span>
      </div>
      <h3>${hidden ? 'Conquista secreta' : esc(achievement.name)}</h3>
      <p>${hidden ? 'O requisito aparece quando você chegar perto o bastante.' : esc(achievement.description)}</p>
      ${
        unlocked
          ? `<div class="achievement-unlocked"><span aria-hidden="true">✓</span> Desbloqueada em ${esc(formatDate(date ?? ''))}</div>`
          : hidden
            ? ''
            : `<div class="achievement-progress">${progressBar(progress.current, progress.target, 'progress-achievement')}<span>${formatNumber(Math.min(progress.current, progress.target))} / ${formatNumber(progress.target)}</span></div>`
      }
    </div>
    ${unlocked ? '<span class="achievement-stamp" aria-hidden="true">✓</span>' : `<span class="achievement-ratio" aria-hidden="true">${Math.round(ratio * 100)}%</span>`}
  </article>`;
}

function categoryLabel(category: AchievementDef['category']): string {
  return ACHIEVEMENT_CATEGORIES.find((entry) => entry.id === category)?.label ?? category;
}

function categoryColor(category: AchievementDef['category']): string {
  if (category === 'inicio') return '#61d6aa';
  if (category === 'romance') return '#ff85a7';
  if (category === 'sobrevivencia') return '#ffb35c';
  return '#78b7ff';
}

export function renderAchievements(save: SaveData, filter: AchievementFilter): string {
  const unlocked = Object.keys(save.achievements).length;
  const total = ACHIEVEMENTS.length;
  const completion = total ? unlocked / total : 0;
  const filters: { id: AchievementFilter; label: string; icon: string; unlocked: number; total: number }[] = [
    { id: 'all', label: 'Todas', icon: '🏆', unlocked, total },
    ...ACHIEVEMENT_CATEGORIES.map((category) => ({
      id: category.id as AchievementFilter,
      label: category.label,
      icon: category.emoji,
      ...categoryCount(save, category.id),
    })),
  ];
  const shownCategories = filter === 'all' ? ACHIEVEMENT_CATEGORIES.map((entry) => entry.id) : [filter];

  return `<div class="screen screen-achievements">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Conquistas', 'Troféus da jornada', save.settings.muted)}
      ${pageHeader(
        'nada passa em branco',
        'Conquistas',
        'Cada conquista é verificada de verdade: inimigos derrotados, chefes, finais, compras e decisões. Recompensas em moedas permanentes são pagas uma única vez.',
        `<span class="badge-soft">${unlocked}/${total} desbloqueadas</span>`,
      )}
      <section class="achievement-overview panel">
        <div class="achievement-overview-copy">
          <span class="eyebrow">progresso geral</span>
          <h2>${Math.round(completion * 100)}% do caminho</h2>
          <p>${unlocked === total ? 'Tudo desbloqueado. Até o Guardião está impressionado.' : `Falta${total - unlocked === 1 ? '' : 'm'} ${total - unlocked} conquista${total - unlocked === 1 ? '' : 's'}. Algumas exigem uma segunda viagem — ou uma decisão diferente.`}</p>
        </div>
        <div class="achievement-overview-bar">${progressBar(unlocked, total, 'progress-large', true)}</div>
        <div class="achievement-mini-stats">
          ${ACHIEVEMENT_CATEGORIES.map((category) => {
            const count = categoryCount(save, category.id);
            return `<span style="--category-color:${categoryColor(category.id)}"><i aria-hidden="true">${category.emoji}</i><strong>${count.unlocked}/${count.total}</strong><small>${esc(category.label)}</small></span>`;
          }).join('')}
        </div>
      </section>
      <div class="filter-row" role="group" aria-label="Filtrar conquistas">
        ${filters.map((entry) => `<button class="filter-btn ${filter === entry.id ? 'is-active' : ''}" data-action="filter-achievements" data-filter="${entry.id}" aria-pressed="${filter === entry.id}"><span aria-hidden="true">${entry.icon}</span>${esc(entry.label)}<small>${entry.unlocked}/${entry.total}</small></button>`).join('')}
      </div>
      <div class="achievement-sections">
        ${shownCategories
          .map((categoryId) => {
            const category = ACHIEVEMENT_CATEGORIES.find((entry) => entry.id === categoryId);
            if (!category) return '';
            const entries = ACHIEVEMENTS.filter((achievement) => achievement.category === categoryId);
            const count = categoryCount(save, categoryId);
            return `<section class="achievement-section">
              <div class="section-heading compact">
                <div><span class="eyebrow">${category.emoji} ${esc(category.label)}</span><h2>${esc(CATEGORY_BLURB[categoryId])}</h2></div>
                <span class="badge-soft" style="--category-color:${categoryColor(categoryId)}">${count.unlocked}/${count.total}</span>
              </div>
              <div class="achievement-grid">${entries.map((achievement) => achievementCard(achievement, save)).join('')}</div>
            </section>`;
          })
          .join('')}
      </div>
    </div>
  </div>`;
}
