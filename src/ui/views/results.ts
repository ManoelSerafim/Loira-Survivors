import type { EndingsDef, LoiraDef, RegionId, RunSummary, SaveData, WeaponId } from '../../core/types';
import type { CommitResult } from '../../systems/progression';
import type { UnlockedAchievement } from '../../systems/achievements';
import { formatNumber, formatTime, difficultyLabel } from '../../core/format';
import { esc, spriteImg } from '../components';
import { getNextRegion, getRegion } from '../../data/regions';
import { getCharacter } from '../../data/characters';
import { getWeapon } from '../../data/weapons';
import { travelRoute } from './shared';

export interface RunResultView {
  summary: RunSummary;
  rewards: CommitResult;
  achievements: UnlockedAchievement[];
  newRegions: RegionId[];
  newWeapons: WeaponId[];
  ending: EndingsDef | null;
  loira: LoiraDef | null;
  permanentCoins: number;
}

export function renderResults(result: RunResultView, save: SaveData): string {
  const { summary, rewards, ending, loira } = result;
  const region = getRegion(summary.config.regionId);
  const next = getNextRegion(summary.config.regionId);
  const character = getCharacter(summary.config.characterId);
  const victory = summary.victory;
  const portugal = summary.config.regionId === 'portugal';
  const achievementCoins = result.achievements.reduce((sum, entry) => sum + entry.reward, 0);
  const title = victory ? (portugal ? 'Você chegou a Portugal' : 'Etapa concluída') : 'A jornada terminou';
  const subtitle = victory
    ? portugal
      ? ending?.name ?? 'O encontro final'
      : `A rota até ${next?.name ?? 'o fim'} está aberta.`
    : 'A estrada cobrou o preço. O progresso permanente ficou.';
  return `<div class="screen screen-results ${victory ? 'is-victory' : 'is-defeat'}">
    <div class="results-bg" aria-hidden="true">
      <span class="results-glow"></span>
      <span class="results-stars">${victory ? '✦ ✧ ✦' : '· · ·'}</span>
    </div>
    <div class="screen-inner results-inner">
      <header class="results-top">
        <div class="brand-lockup compact"><span class="brand-mark"><span>LS</span></span><span class="brand-copy"><strong>LOIRA SURVIVORS</strong><small> resultado da jornada</small></span></div>
        <span class="coin-pill"><span class="coin-dot" aria-hidden="true"></span><strong>${formatNumber(result.permanentCoins)}</strong><small>permanentes</small></span>
      </header>

      <section class="results-hero">
        <div class="results-copy">
          <span class="eyebrow">${victory ? 'vitória' : 'derrota'} · ${esc(region.name)} · ${esc(difficultyLabel(summary.config.difficulty))}</span>
          <h1>${esc(title)}</h1>
          <p class="results-sub">${esc(subtitle)}</p>
          <div class="score-block">
            <span>Score da jornada</span>
            <strong>${formatNumber(summary.score)}</strong>
            <small>${victory ? 'A jornada inteira pesou nesta conta.' : 'Derrotas também constroem a próxima tentativa.'}</small>
          </div>
          <div class="results-actions">
            <button class="btn btn-primary" data-action="retry-run"><span aria-hidden="true">↻</span> Tentar novamente</button>
            ${
              victory && next
                ? `<button class="btn btn-secondary" data-action="continue-route" data-region="${next.id}"><span aria-hidden="true">→</span> Seguir para ${esc(next.name)}</button>`
                : portugal
                  ? `<button class="btn btn-secondary" data-action="goto" data-screen="album"><span aria-hidden="true">💌</span> Abrir álbum</button>`
                  : ''
            }
            <button class="btn btn-ghost" data-action="goto" data-screen="journey">Escolher outra etapa</button>
            <button class="btn btn-ghost" data-action="goto" data-screen="menu">Menu principal</button>
          </div>
        </div>

        <aside class="results-art" aria-label="Resumo visual">
          ${
            loira
              ? `<div class="result-loira-card" style="--loira-color:${loira.color};--loira-accent:${loira.accent}">
                  <span class="result-loira-stamp">ENCONTRO</span>
                  ${spriteImg(loira.portrait, loira.name, 'result-loira-img', '💌')}
                  <div class="result-loira-copy"><span class="eyebrow">${esc(loira.subtitle)}</span><h2>${esc(loira.name)}</h2><p>${esc(loira.description)}</p></div>
                  <span class="result-heart" aria-hidden="true">♥</span>
                </div>`
              : `<div class="result-poster ${victory ? 'is-win' : 'is-loss'}">
                  <img src="./${esc(region.art)}" alt="${esc(region.name)}" draggable="false">
                  <div class="result-poster-shade"></div>
                  <span class="result-poster-tag">${victory ? 'DESTINO ALCANÇADO' : 'TENTATIVA REGISTRADA'}</span>
                  <div class="result-poster-copy">
                    ${spriteImg(character.portrait, character.name, 'result-hero-img', '🧑')}
                    <div><span class="eyebrow">${esc(character.name)}</span><strong>${esc(region.name)}</strong><small>${victory ? 'viveu para contar' : 'ficou pelo caminho'}</small></div>
                  </div>
                  <div class="result-poster-stats">
                    <span><small>Nível</small><strong>${summary.level}</strong></span>
                    <span><small>Abates</small><strong>${formatNumber(summary.kills)}</strong></span>
                    <span><small>Tempo</small><strong>${formatTime(summary.time)}</strong></span>
                  </div>
                </div>`
          }
          ${
            ending
              ? `<div class="ending-reveal" style="--ending-color:${ending.color}">
                  <span class="ending-reveal-emoji" aria-hidden="true">${ending.emoji}</span>
                  <div><span class="eyebrow">final desbloqueado</span><h3>${esc(ending.name)}</h3><p>${esc(ending.description)}</p></div>
                </div>`
              : ''
          }
          ${!loira && portugal && victory ? '<p class="result-note">Portugal recebeu você, mas o encontro não aconteceu desta vez. Tente com outro desempenho ou outra dificuldade.</p>' : ''}
        </aside>
      </section>

      <div class="results-grid">
        <section class="panel result-stats-panel">
          <div class="panel-heading"><div><span class="eyebrow">desempenho</span><h2>Como foi a run</h2></div></div>
          <div class="result-stat-grid">
            <span><small>Tempo sobrevivido</small><strong>${formatTime(summary.time)}</strong></span>
            <span><small>Nível final</small><strong>${summary.level}</strong></span>
            <span><small>Inimigos</small><strong>${formatNumber(summary.kills)}</strong></span>
            <span><small>Chefes</small><strong>${formatNumber(summary.bossKills)}</strong></span>
            <span><small>Moedas temp.</small><strong>${formatNumber(summary.coins)}</strong></span>
            <span><small>Upgrades</small><strong>${formatNumber(summary.upgrades)}</strong></span>
            <span><small>Vida restante</small><strong>${Math.round(summary.hpRatio * 100)}%</strong></span>
            <span><small>Desafios</small><strong>${summary.challengesCompleted}/${summary.challenges}</strong></span>
            <span><small>Sem dano</small><strong>${summary.noHit ? 'Sim' : 'Não'}</strong></span>
            <span><small>Boss final</small><strong>${summary.bossDefeated ? 'Derrotado' : 'Não'}</strong></span>
          </div>
          <div class="result-route">${travelRoute(save, summary.config.regionId, true)}</div>
        </section>

        <section class="panel rewards-panel">
          <div class="panel-heading"><div><span class="eyebrow">mesmo ao cair</span><h2>Recompensas permanentes</h2></div><span class="tag tag-gold">+${formatNumber(rewards.total + achievementCoins)} 🪙</span></div>
          <div class="reward-breakdown">
            <div><span>Moedas temporárias convertidas <small>${Math.round(rewards.conversionRate * 100)}%</small></span><strong>+${formatNumber(rewards.convertedCoins)}</strong></div>
            ${rewards.clearBonus ? `<div><span>Bônus de conclusão</span><strong>+${formatNumber(rewards.clearBonus)}</strong></div>` : ''}
            ${rewards.bossBonus ? `<div><span>Chefe derrotado</span><strong>+${formatNumber(rewards.bossBonus)}</strong></div>` : ''}
            ${rewards.firstClearBonus ? `<div><span>Primeira conclusão</span><strong>+${formatNumber(rewards.firstClearBonus)}</strong></div>` : ''}
            ${achievementCoins ? `<div><span>Conquistas desbloqueadas</span><strong>+${formatNumber(achievementCoins)}</strong></div>` : ''}
          </div>
          <div class="reward-total"><span>Total desta jornada</span><strong>+${formatNumber(rewards.total + achievementCoins)} 🪙</strong></div>
          <p class="panel-note">${rewards.firstClear ? 'Primeira conclusão: bônus extra e próxima região liberada.' : 'Repetir etapas é uma fonte segura de moedas e prática.'}</p>
        </section>
      </div>

      ${
        result.newRegions.length || result.newWeapons.length
          ? `<section class="unlock-banner panel">
              <div class="unlock-copy"><span class="eyebrow">novos caminhos</span><h2>Desbloqueado</h2></div>
              <div class="unlock-items">
                ${result.newRegions.map((id) => `<span class="unlock-item"><span aria-hidden="true">🗺️</span><strong>${esc(getRegion(id).name)}</strong><small>nova região</small></span>`).join('')}
                ${result.newWeapons.map((id) => `<span class="unlock-item"><span aria-hidden="true">🗡️</span><strong>${esc(getWeapon(id).name)}</strong><small>nova arma no arsenal</small></span>`).join('')}
              </div>
            </section>`
          : ''
      }

      <section class="panel achievements-result-panel">
        <div class="panel-heading"><div><span class="eyebrow">troféus</span><h2>Conquistas desta jornada</h2></div><span class="badge-soft">${result.achievements.length} nova${result.achievements.length === 1 ? '' : 's'}</span></div>
        ${
          result.achievements.length
            ? `<div class="result-achievement-list">${result.achievements.map((entry) => `<div class="result-achievement"><span aria-hidden="true">${entry.def.emoji}</span><div><strong>${esc(entry.def.name)}</strong><small>${esc(entry.def.description)}</small></div><span>+${formatNumber(entry.reward)} 🪙</span></div>`).join('')}</div>`
            : '<p class="panel-note">Nenhuma conquista nova desta vez. O progresso de cada requisito já foi salvo.</p>'
        }
      </section>

      <footer class="results-footer">
        <span>Progresso, conquistas e moedas foram salvos.</span>
        <div><button class="btn btn-ghost btn-sm" data-action="goto" data-screen="shop">Loja de upgrades</button><button class="btn btn-ghost btn-sm" data-action="goto" data-screen="menu">Menu principal</button></div>
      </footer>
    </div>
  </div>`;
}
