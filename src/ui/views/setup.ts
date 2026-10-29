import type { CharacterDef, DifficultyId, SaveData } from '../../core/types';
import { formatDecimal, formatNumber, formatTime, plural } from '../../core/format';
import { esc, topBar, pageHeader, progressBar, spriteImg, tag } from '../components';
import { CHARACTERS, getCharacter } from '../../data/characters';
import { getBoss, getEnemy } from '../../data/enemies';
import { DIFFICULTIES, REGIONS, getDifficulty, getRegion } from '../../data/regions';
import { getWeapon } from '../../data/weapons';
import { isDifficultyUnlocked, nextRegionSuggestion, metaLevel } from '../../systems/progression';
import { normalizeLoadout } from '../../systems/metaShop';
import type { Selection } from '../state';
import {
  activeMetaBonuses,
  bonusLabel,
  characterDerivedStats,
  formatPct,
  regionStatus,
  routeProgressLabel,
  runDuration,
  statTile,
  travelRoute,
  weaponChip,
} from './shared';

function characterBonuses(character: CharacterDef): string {
  const entries = Object.entries(character.bonuses).filter(([, value]) => (value ?? 0) !== 0);
  if (!entries.length) return '<span class="tag tag-muted">Equilibrado, sem modificadores</span>';
  return entries
    .map(([key, value]) => tag(bonusLabel(key as Parameters<typeof bonusLabel>[0], value ?? 0), value && value > 0 ? 'tag-good' : 'tag-bad'))
    .join('');
}

function characterCard(character: CharacterDef, save: SaveData, selected: boolean): string {
  const unlocked = save.unlockedCharacters.includes(character.id);
  const canAfford = save.permanentCoins >= character.cost;
  const action =
    selected
      ? `<span class="character-selected">✓ Selecionado</span>`
      : unlocked
        ? `<button class="btn btn-secondary btn-sm" data-action="select-character" data-id="${character.id}">Escolher</button>`
        : `<button class="btn ${canAfford ? 'btn-primary' : 'btn-ghost'} btn-sm" data-action="unlock-character" data-id="${character.id}">
            <span aria-hidden="true">${canAfford ? '🔓' : '🔒'}</span> Desbloquear · ${formatNumber(character.cost)}
          </button>`;
  return `<article class="character-card ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}" style="--character-color:${character.color}">
    <div class="character-card-top">
      <span class="character-order">${String(CHARACTERS.indexOf(character) + 1).padStart(2, '0')}</span>
      ${tag(unlocked ? 'Disponível' : `Custa ${formatNumber(character.cost)}`, unlocked ? 'tag-good' : 'tag-locked')}
    </div>
    <div class="character-portrait-wrap">
      <span class="character-glow" aria-hidden="true"></span>
      ${spriteImg(character.portrait, character.name, 'character-portrait', '🧑')}
      ${unlocked ? '' : '<span class="character-lock" aria-label="Bloqueado">🔒</span>'}
    </div>
    <div class="character-copy">
      <span class="eyebrow">${esc(character.title)}</span>
      <h2>${esc(character.name)}</h2>
      <p>${esc(character.description)}</p>
      <div class="character-bonuses">${characterBonuses(character)}</div>
    </div>
    <div class="character-card-footer">${action}</div>
  </article>`;
}

export function renderCharacterSelect(save: SaveData, selection: Selection): string {
  const character = getCharacter(selection.characterId);
  const derived = characterDerivedStats(character.id, save);
  const permanent = activeMetaBonuses(save);
  const loadout = normalizeLoadout(save.settings.loadout, save);

  return `<div class="screen screen-character">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Preparação da viagem', 'Escolha do viajante', save.settings.muted)}
      ${pageHeader(
        'quem vai encarar o oceano?',
        'Escolha seu viajante',
        'Cada personagem muda a forma de jogar. Atributos, bônus permanentes e o loadout entram juntos na mochila.',
        `<span class="header-route">${esc(routeProgressLabel(save))}</span>`,
      )}

      <section class="character-grid" aria-label="Personagens">
        ${CHARACTERS.map((entry) => characterCard(entry, save, entry.id === character.id)).join('')}
      </section>

      <section class="character-detail-grid">
        <article class="panel character-preview">
          <div class="panel-heading">
            <div>
              <span class="eyebrow">ficha do viajante</span>
              <h2>${esc(character.name)}</h2>
            </div>
            <span class="level-badge">não é nível, é preparo</span>
          </div>
          <div class="character-preview-hero">
            <div class="character-preview-art">
              ${spriteImg(character.portrait, character.name, 'preview-portrait', '🧑')}
              <span class="preview-plinth" aria-hidden="true"></span>
            </div>
            <div class="character-preview-copy">
              <p class="character-quote">“${esc(character.description)}”</p>
              <div class="character-bonuses">${characterBonuses(character)}</div>
              <div class="loadout-inline">
                <span class="eyebrow">armas iniciais</span>
                ${loadout.map((id) => weaponChip(getWeapon(id), `Nv. 1`)).join('')}
              </div>
            </div>
          </div>
          <div class="stat-grid">
            ${statTile('Vida máxima', formatNumber(derived.maxHp), '❤️')}
            ${statTile('Velocidade', formatNumber(derived.moveSpeed), '👟')}
            ${statTile('Dano', `${formatDecimal(derived.damageMult)}×`, '⚔️')}
            ${statTile('Vel. de ataque', `${formatDecimal(derived.attackSpeed)}×`, '⚡')}
            ${statTile('Alcance', `${formatDecimal(derived.rangeMult)}×`, '🎯')}
            ${statTile('Crítico', formatPct(derived.critChance), '🎲')}
            ${statTile('Armadura', formatNumber(derived.armor), '🛡️')}
            ${statTile('Sorte', formatNumber(derived.luck), '🍀')}
            ${statTile('Experiência', `${formatDecimal(derived.xpMult)}×`, '📚')}
            ${statTile('Moedas', `${formatDecimal(derived.coinMult)}×`, '🪙')}
            ${statTile('Regeneração', `${formatDecimal(derived.regen, 1)}/s`, '💚')}
            ${statTile('Recarga', `${formatDecimal(derived.cooldownMult)}×`, '⏱️')}
          </div>
          <p class="panel-note">Efeitos temporários — buffs de café, eventos e upgrades de run — aparecem no HUD e na pausa durante a partida.</p>
        </article>

        <aside class="character-side">
          <section class="panel">
            <div class="panel-heading">
              <div><span class="eyebrow">para sempre</span><h2>Bônus permanentes</h2></div>
              <span class="badge-soft">${plural(permanent.reduce((sum, entry) => sum + entry.level, 0), 'nível', 'níveis')}</span>
            </div>
            <div class="meta-bonus-list">
              ${
                permanent.length
                  ? permanent
                      .map(
                        (entry) => `<div class="meta-bonus-row"><span><strong>${esc(entry.name)}</strong><small>nível ${entry.level}</small></span><span>${esc(entry.text)}</span></div>`,
                      )
                      .join('')
                  : `<div class="empty-inline"><span aria-hidden="true">🌱</span><p>Nenhuma melhoria permanente ainda. A primeira run já rende moedas para a loja.</p></div>`
              }
            </div>
            <div class="side-actions">
              <button class="btn btn-ghost btn-sm" data-action="goto" data-screen="shop">Ir à loja</button>
              <button class="btn btn-ghost btn-sm" data-action="goto" data-screen="tree">Ver árvore</button>
            </div>
          </section>

          <section class="panel travel-note">
            <span class="eyebrow">dica de embarque</span>
            <p>Armas atacam sozinhas. Você só precisa continuar vivo, coletar experiência e escolher bem entre três opções a cada nível.</p>
            <div class="key-row" aria-label="Controles">
              <span><kbd>WASD</kbd> mover</span>
              <span><kbd>ESPAÇO</kbd> especial</span>
              <span><kbd>ESC</kbd> pausa</span>
            </div>
          </section>
        </aside>
      </section>

      <div class="flow-actions">
        <button class="btn btn-ghost" data-action="back">← Voltar</button>
        <div class="flow-next">
          <span class="flow-hint">${esc(character.name)} entra na próxima etapa</span>
          <button class="btn btn-primary" data-action="goto" data-screen="journey">Escolher destino <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </div>
  </div>`;
}

function regionRow(save: SaveData, selection: Selection): string {
  const recommended = nextRegionSuggestion(save);
  return REGIONS.map((region) => {
    const unlocked = save.unlockedRegions.includes(region.id);
    const cleared = save.clearedRegions.includes(region.id);
    const selected = region.id === selection.regionId;
    const boss = getBoss(region.bossId);
    const status = regionStatus(save, region);
    const best = save.bestTimes[region.id];
    return `<button class="region-row ${selected ? 'is-selected' : ''} ${cleared ? 'is-cleared' : ''} ${unlocked ? '' : 'is-locked'}"
      ${unlocked ? `data-action="select-region" data-id="${region.id}"` : 'disabled aria-disabled="true"'}
      aria-pressed="${selected}">
      <span class="region-order">${String(region.order).padStart(2, '0')}</span>
      <span class="region-thumb">${spriteImg(region.art, region.name, 'region-thumb-img', '🗺️')}</span>
      <span class="region-row-copy">
        <span class="region-row-top"><strong>${esc(region.name)}</strong><small>${esc(region.subtitle)}</small></span>
        <span class="region-row-desc">${esc(region.description)}</span>
        <span class="region-row-meta">
          <span>⏱ ${Math.floor(region.duration / 60)}:${String(region.duration % 60).padStart(2, '0')}</span>
          <span>☠ ${esc(boss.name)}</span>
          ${best ? `<span>🏁 ${formatTime(best)}</span>` : ''}
        </span>
      </span>
      <span class="region-row-side">
        ${region.id === recommended && !cleared ? '<span class="tag tag-gold">Recomendada</span>' : ''}
        <span class="region-status ${status.className}">${unlocked ? status.label : `🔒 ${status.label}`}</span>
        ${cleared ? '<span class="region-stamp">✔</span>' : ''}
      </span>
    </button>`;
  }).join('');
}

function difficultyCards(save: SaveData, selection: Selection): string {
  return DIFFICULTIES.map((difficulty) => {
    const unlocked = isDifficultyUnlocked(save, difficulty.id);
    return `<button class="difficulty-card ${selection.difficulty === difficulty.id ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}"
      data-action="select-difficulty" data-id="${difficulty.id}" ${unlocked ? '' : 'disabled aria-disabled="true"'}
      style="--difficulty-color:${difficulty.color}" aria-pressed="${selection.difficulty === difficulty.id}">
      <span class="difficulty-radio" aria-hidden="true"></span>
      <span class="difficulty-copy"><strong>${esc(difficulty.name)}</strong><small>${esc(difficulty.short)}</small></span>
      <span class="difficulty-reward">×${formatDecimal(difficulty.reward)}</span>
      ${unlocked ? '' : `<span class="difficulty-lock">🔒 ${esc(difficulty.unlockText)}</span>`}
    </button>`;
  }).join('');
}

export function renderJourney(save: SaveData, selection: Selection): string {
  const region = getRegion(save.unlockedRegions.includes(selection.regionId) ? selection.regionId : nextRegionSuggestion(save));
  const boss = getBoss(region.bossId);
  const difficulty = getDifficulty(selection.difficulty);
  const duration = runDuration(region, save);
  const loadout = normalizeLoadout(save.settings.loadout, save);
  const unlockedDiff = isDifficultyUnlocked(save, selection.difficulty);
  const regionUnlocked = save.unlockedRegions.includes(region.id);
  const enemies = region.enemyPool
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map((entry) => getEnemy(entry.id));
  const best = save.bestTimes[region.id];

  return `<div class="screen screen-journey">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Planejamento de rota', 'Região & dificuldade', save.settings.muted)}
      ${pageHeader(
        'o mapa está aberto',
        'Escolha a próxima etapa',
        'Cada região tem inimigos, chefe e recompensas próprios. Conclua uma etapa para desbloquear a seguinte.',
        `<span class="header-route">${esc(routeProgressLabel(save))}</span>`,
      )}
      ${travelRoute(save, region.id, true)}

      <div class="journey-grid">
        <section class="panel region-list-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">cinco paradas</span><h2>Rota atlântica</h2></div>
            <span class="badge-soft">${save.unlockedRegions.length}/5 abertas</span>
          </div>
          <div class="region-list">${regionRow(save, selection)}</div>
        </section>

        <aside class="journey-side">
          <section class="run-summary panel" style="--region-color:${region.color}">
            <div class="run-art">
              <img src="./${esc(region.art)}" alt="${esc(region.name)}" draggable="false">
              <span class="run-art-order">${region.order}/5</span>
              <div class="run-art-caption">
                <span class="eyebrow">${esc(region.subtitle)}</span>
                <h2>${esc(region.name)}</h2>
              </div>
              <span class="run-art-stamp">${regionStatus(save, region).label}</span>
            </div>
            <div class="run-summary-body">
              <p class="run-objective"><span aria-hidden="true">🎯</span> ${esc(region.objective)}</p>
              <div class="run-facts">
                <span><small>Duração</small><strong>${formatTime(duration)}</strong></span>
                ${best ? `<span><small>Melhor</small><strong>${formatTime(best)}</strong></span>` : ''}
                <span><small>Recompensa</small><strong>+${formatNumber(region.clearReward)} 🪙</strong></span>
                <span><small>Elites</small><strong>${formatPct(region.eliteChance)}</strong></span>
              </div>
              <div class="boss-preview">
                <span class="boss-preview-art">${spriteImg(`sprites/${boss.sprite}.png`, boss.name, 'boss-preview-img', '☠️')}</span>
                <span class="boss-preview-copy"><small>Chefe da etapa</small><strong>${esc(boss.name)}</strong><span>${esc(boss.title)}</span></span>
                <span class="tag tag-danger">2 fases</span>
              </div>
              <div class="enemy-preview">
                <span class="eyebrow">inimigos frequentes</span>
                <div class="enemy-tags">${enemies.map((enemy) => `<span class="enemy-tag" style="--enemy-color:${enemy.color}">${esc(enemy.name)}</span>`).join('')}</div>
              </div>
            </div>
          </section>

          <section class="panel difficulty-panel">
            <div class="panel-heading">
              <div><span class="eyebrow">quanto de sofrimento?</span><h2>Dificuldade</h2></div>
              <span class="badge-soft" style="color:${difficulty.color}">${esc(difficulty.name)}</span>
            </div>
            <div class="difficulty-list">${difficultyCards(save, selection)}</div>
            <p class="panel-note">${esc(difficulty.description)}</p>
          </section>

          <section class="panel loadout-panel">
            <div class="panel-heading">
              <div><span class="eyebrow">mochila de mão</span><h2>Armas iniciais</h2></div>
              <button class="btn btn-ghost btn-xs" data-action="goto" data-screen="arsenal">Gerenciar</button>
            </div>
            <div class="loadout-slots">
              ${loadout.map((id, index) => `<div class="loadout-slot">${weaponChip(getWeapon(id), `Slot ${index + 1} · Nv. 1`)}</div>`).join('')}
            </div>
            <div class="loadout-meta">
              <span>${loadout.length}/2 equipadas</span>
              <span>🪙 ${formatNumber(save.permanentCoins)} permanentes</span>
            </div>
          </section>

          <button class="btn btn-primary btn-start" data-action="start-run" ${regionUnlocked && unlockedDiff ? '' : 'disabled'}>
            <span class="btn-icon" aria-hidden="true">✈</span>
            <span class="btn-copy"><strong>Iniciar jornada</strong><small>${esc(region.name)} · ${esc(difficulty.name)}</small></span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          </button>
          <p class="start-hint">${regionUnlocked && unlockedDiff ? 'A jornada salva automaticamente ao final. Boa sorte.' : 'Conclua as etapas anteriores para abrir esta combinação.'}</p>
        </aside>
      </div>

      <div class="flow-actions">
        <button class="btn btn-ghost" data-action="back">← Voltar</button>
        <button class="btn btn-ghost" data-action="goto" data-screen="character">Trocar viajante</button>
      </div>
    </div>
  </div>`;
}
