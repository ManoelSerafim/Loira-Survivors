import type { MetaUpgradeDef, SaveData } from '../../core/types';
import { formatNumber } from '../../core/format';
import { esc, topBar, pageHeader } from '../components';
import { META_UPGRADES, canBuyMeta, metaCategoryLabel, metaCost } from '../../data/meta';
import { metaLevel, totalMetaLevel } from '../../systems/progression';
import { metaRequirementText } from './shared';

const CATEGORY_ORDER: MetaUpgradeDef['category'][] = ['combate', 'viagem', 'sorte'];

const CATEGORY_DESCRIPTIONS: Record<MetaUpgradeDef['category'], string> = {
  combate: 'Mais dano, vida e fôlego para encarar as hordas desde o primeiro segundo.',
  viagem: 'Atalhos, experiência e conversão de moedas. A jornada fica menos injusta.',
  sorte: 'Sorte, carisma e recompensas de evento. O universo começa a conspirar a seu favor.',
};

function levelPips(level: number, max: number): string {
  return `<span class="level-pips" aria-label="Nível ${level} de ${max}">${Array.from({ length: max }, (_, index) => `<span class="${index < level ? 'is-filled' : ''}"></span>`).join('')}</span>`;
}

function costLabel(level: number, maxLevel: number, def: MetaUpgradeDef): string {
  if (level >= maxLevel) return 'Nível máximo';
  return `${formatNumber(metaCost(def, level))} 🪙`;
}

function metaCard(def: MetaUpgradeDef, save: SaveData): string {
  const level = metaLevel(save, def.id);
  const maxed = level >= def.maxLevel;
  const sellable = canBuyMeta(save.meta, def);
  const cost = maxed ? 0 : metaCost(def, level);
  const affordable = save.permanentCoins >= cost;
  const requirement = metaRequirementText(save, def);
  const nextEffect = maxed ? def.effectText(level) : def.effectText(level + 1);
  let action: string;
  if (maxed) {
    action = '<span class="meta-max">✓ Nível máximo</span>';
  } else if (!sellable) {
    action = `<span class="meta-locked">🔒 ${esc(requirement || 'Requisito pendente')}</span>`;
  } else {
    action = `<button class="btn ${affordable ? 'btn-primary' : 'btn-ghost'} btn-sm" data-action="buy-meta" data-id="${def.id}" ${affordable ? '' : 'disabled'}>
      ${affordable ? 'Melhorar' : `Faltam ${formatNumber(cost - save.permanentCoins)}`}
    </button>`;
  }
  return `<article class="meta-card ${maxed ? 'is-maxed' : ''} ${sellable ? '' : 'is-blocked'}" style="--category-color:${categoryColor(def.category)}">
    <div class="meta-card-top">
      <span class="meta-icon" aria-hidden="true">${def.emoji}</span>
      <div class="meta-title"><h3>${esc(def.name)}</h3><span class="tag ${categoryClass(def.category)}">${esc(metaCategoryLabel(def.category))}</span></div>
      <span class="meta-tier">T${def.tier + 1}</span>
    </div>
    <p class="meta-desc">${esc(def.description)}</p>
    <div class="meta-level-row"><span>Nível ${level}/${def.maxLevel}</span>${levelPips(level, def.maxLevel)}</div>
    <div class="meta-effect">
      <span class="meta-effect-current">${level > 0 ? esc(def.effectText(level)) : 'Sem bônus'}</span>
      <span aria-hidden="true">→</span>
      <strong>${esc(nextEffect)}</strong>
    </div>
    <div class="meta-card-footer">
      <span class="meta-cost">${costLabel(level, def.maxLevel, def)}</span>
      ${action}
    </div>
  </article>`;
}

function categoryColor(category: MetaUpgradeDef['category']): string {
  if (category === 'combate') return '#ff7b7b';
  if (category === 'viagem') return '#61d6aa';
  return '#d4a7ff';
}

function categoryClass(category: MetaUpgradeDef['category']): string {
  return `tag-${category}`;
}

export function renderShop(save: SaveData): string {
  const total = totalMetaLevel(save);
  const maxTotal = META_UPGRADES.reduce((sum, def) => sum + def.maxLevel, 0);
  const affordableCount = META_UPGRADES.filter((def) => {
    const level = metaLevel(save, def.id);
    return canBuyMeta(save.meta, def) && level < def.maxLevel && metaCost(def, level) <= save.permanentCoins;
  }).length;
  return `<div class="screen screen-shop">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Loja de upgrades', 'Progresso permanente', save.settings.muted)}
      ${pageHeader(
        'investimento com retorno emocional',
        'Loja de upgrades',
        'Moedas permanentes ficam com você mesmo quando a run termina. Cada nível comprado vale para todas as próximas tentativas.',
        `<div class="shop-balance"><span>Saldo</span><strong>${formatNumber(save.permanentCoins)} 🪙</strong></div>`,
      )}
      <div class="shop-summary">
        <span><strong>${total}/${maxTotal}</strong><small>níveis comprados</small></span>
        <span><strong>${affordableCount}</strong><small>melhorias ao alcance</small></span>
        <span><strong>${save.stats.metaUpgradesBought}</strong><small>compras realizadas</small></span>
        <button class="btn btn-ghost btn-sm" data-action="goto" data-screen="tree">Ver árvore completa <span aria-hidden="true">→</span></button>
      </div>
      <div class="shop-categories">
        ${CATEGORY_ORDER.map((category) => {
          const upgrades = META_UPGRADES.filter((def) => def.category === category);
          const levels = upgrades.reduce((sum, def) => sum + metaLevel(save, def.id), 0);
          const max = upgrades.reduce((sum, def) => sum + def.maxLevel, 0);
          return `<section class="meta-category" style="--category-color:${categoryColor(category)}">
            <div class="section-heading compact">
              <div><span class="eyebrow">${esc(metaCategoryLabel(category))}</span><h2>${esc(categoryTitle(category))}</h2><p>${esc(CATEGORY_DESCRIPTIONS[category])}</p></div>
              <span class="badge-soft">${levels}/${max} níveis</span>
            </div>
            <div class="meta-grid">${upgrades.map((def) => metaCard(def, save)).join('')}</div>
          </section>`;
        }).join('')}
      </div>
      <p class="shop-footnote">Precisa de mais moedas? Conclua etapas, derrote chefes e complete desafios. Derrotas também convertem parte das moedas temporárias.</p>
    </div>
  </div>`;
}

function categoryTitle(category: MetaUpgradeDef['category']): string {
  if (category === 'combate') return 'Fique mais difícil de derrubar';
  if (category === 'viagem') return 'Viaje mais longe, gaste menos';
  return 'Faça o destino trabalhar para você';
}

function treeNode(def: MetaUpgradeDef, save: SaveData): string {
  const level = metaLevel(save, def.id);
  const maxed = level >= def.maxLevel;
  const unlocked = canBuyMeta(save.meta, def);
  const requirement = metaRequirementText(save, def);
  const cost = maxed ? 0 : metaCost(def, level);
  const affordable = save.permanentCoins >= cost;
  const pips = Array.from({ length: def.maxLevel }, (_, index) => `<span class="${index < level ? 'is-filled' : ''}"></span>`).join('');
  const action = maxed
    ? '<span class="tree-max">MÁXIMO</span>'
    : unlocked
      ? `<button class="tree-buy ${affordable ? '' : 'is-short'}" data-action="buy-meta" data-id="${def.id}" ${affordable ? '' : 'disabled'} aria-label="Comprar ${esc(def.name)} por ${formatNumber(cost)} moedas">${formatNumber(cost)} 🪙 <span aria-hidden="true">+</span></button>`
      : `<span class="tree-requirement">🔒 ${esc(requirement)}</span>`;
  return `<article class="tree-node ${maxed ? 'is-maxed' : ''} ${unlocked ? '' : 'is-blocked'}" style="--category-color:${categoryColor(def.category)}">
    <div class="tree-node-top"><span class="tree-icon" aria-hidden="true">${def.emoji}</span><span class="tree-category">${esc(metaCategoryLabel(def.category))}</span></div>
    <h3>${esc(def.name)}</h3>
    <p>${esc(def.effectText(level) || 'Sem bônus ativo')}${maxed ? '' : ` <span aria-hidden="true">→</span> <strong>${esc(def.effectText(level + 1))}</strong>`}</p>
    <div class="tree-node-meta"><span class="tree-pips" aria-label="Nível ${level} de ${def.maxLevel}">${pips}</span><span>${level}/${def.maxLevel}</span></div>
    ${action}
  </article>`;
}

export function renderTree(save: SaveData): string {
  const tiers = Math.max(...META_UPGRADES.map((def) => def.tier)) + 1;
  const total = totalMetaLevel(save);
  const maxTotal = META_UPGRADES.reduce((sum, def) => sum + def.maxLevel, 0);
  const columns = [0, 1, 2];
  return `<div class="screen screen-tree">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Árvore de progressão', 'Caminhos permanentes', save.settings.muted)}
      ${pageHeader(
        'cada moeda vira um atalho',
        'Árvore de progressão',
        'Os nós mais fortes pedem pré-requisitos. Compre aqui ou na loja: o progresso é o mesmo e nunca se perde.',
        `<span class="badge-soft">${total}/${maxTotal} níveis · ${formatNumber(save.permanentCoins)} 🪙</span>`,
      )}
      <div class="tree-legend">
        ${CATEGORY_ORDER.map((category) => `<span style="--category-color:${categoryColor(category)}"><i></i>${esc(metaCategoryLabel(category))}</span>`).join('')}
        <span class="tree-legend-hint">Os nós acendem quando os pré-requisitos são cumpridos.</span>
      </div>
      <p class="tree-scroll-hint">Deslize para o lado para ver as três trilhas <span aria-hidden="true">→</span></p>
      <div class="tree-scroll">
        <div class="tree-head">
          ${columns.map((column) => `<div><span class="eyebrow">trilha ${String(column + 1).padStart(2, '0')}</span><strong>${columnTitle(column)}</strong></div>`).join('')}
        </div>
        <div class="tree-grid" style="--tree-tiers:${tiers}">
          ${Array.from({ length: tiers }, (_, tier) =>
            columns
              .map((column) => {
                const def = META_UPGRADES.find((entry) => entry.tier === tier && entry.column === column);
                return def
                  ? `<div class="tree-cell">${treeNode(def, save)}</div>`
                  : `<div class="tree-cell tree-empty" aria-hidden="true"><span>·</span></div>`;
              })
              .join(''),
          ).join('')}
        </div>
      </div>
      <section class="tree-tips panel">
        <div><span class="eyebrow">estratégia</span><h2>Por onde começar?</h2></div>
        <div class="tree-tip-grid">
          <p><strong>Primeiro passo:</strong> Treinamento e Condicionamento são baratos e valem em qualquer build.</p>
          <p><strong>Se morre cedo:</strong> priorize vida, armadura e a segunda chance de Determinação.</p>
          <p><strong>Se falta moeda:</strong> Passagem Econômica reduz o tempo de run; Planejamento Financeiro melhora a conversão.</p>
          <p><strong>Para finais raros:</strong> Charme de Campeão aumenta o score de conquista em Portugal.</p>
        </div>
        <div class="side-actions"><button class="btn btn-primary btn-sm" data-action="goto" data-screen="shop">Abrir loja de melhorias</button></div>
      </section>
    </div>
  </div>`;
}

function columnTitle(column: number): string {
  if (column === 0) return 'Corpo & planejamento';
  if (column === 1) return 'Coração & sorte';
  return 'Passos & destino';
}
