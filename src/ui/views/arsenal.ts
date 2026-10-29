import type { SaveData, WeaponDef, WeaponId } from '../../core/types';
import { formatDecimal, formatNumber } from '../../core/format';
import { esc, topBar, pageHeader, spriteImg } from '../components';
import { WEAPONS, getWeapon, weaponDamage } from '../../data/weapons';
import { getUpgrade } from '../../data/upgrades';
import { getRegion } from '../../data/regions';
import { normalizeLoadout } from '../../systems/metaShop';
import { weaponTypeLabel } from './shared';

function regionUnlockLabel(weapon: WeaponDef): string {
  if (!weapon.unlockRegion) return 'Disponível desde o início';
  return `Conclua ${getRegion(weapon.unlockRegion).name}`;
}

function weaponCard(weapon: WeaponDef, save: SaveData, loadout: WeaponId[]): string {
  const unlocked = save.unlockedWeapons.includes(weapon.id);
  const equipped = loadout.includes(weapon.id);
  const requirementDef = getUpgrade(weapon.evolution.requiresUpgrade);
  const evolutionUnlocked = weapon.id && unlocked;
  const damage1 = weapon.baseDamage > 0 ? Math.round(weaponDamage(weapon, 1, false)) : 0;
  const damage6 = weapon.baseDamage > 0 ? Math.round(weaponDamage(weapon, weapon.maxLevel, false)) : 0;
  const action = !unlocked
    ? `<span class="weapon-locked-label">🔒 ${esc(regionUnlockLabel(weapon))}</span>`
    : `<button class="btn ${equipped ? 'btn-secondary' : 'btn-ghost'} btn-sm toggle-weapon" data-action="toggle-loadout" data-id="${weapon.id}">
        ${equipped ? '✓ Equipada' : 'Equipar'}
      </button>`;
  return `<article class="weapon-card ${equipped ? 'is-equipped' : ''} ${unlocked ? '' : 'is-locked'}" style="--weapon-color:${weapon.color}">
    <div class="weapon-card-head">
      <span class="weapon-art">${spriteImg(weapon.icon, weapon.name, 'weapon-art-img', '🗡️')}</span>
      <div class="weapon-title">
        <span class="eyebrow">${esc(weapon.subtitle)}</span>
        <h3>${esc(weapon.name)}</h3>
        <div class="weapon-tags"><span class="tag">${esc(weaponTypeLabel(weapon.type))}</span><span class="tag">Nv. máx. ${weapon.maxLevel}</span></div>
      </div>
      ${equipped ? '<span class="equipped-flag">NO LOADOUT</span>' : ''}
    </div>
    <p class="weapon-desc">${esc(weapon.description)}</p>
    <div class="weapon-stats">
      <span><small>Dano inicial</small><strong>${damage1 || '—'}</strong></span>
      <span><small>Dano no nível ${weapon.maxLevel}</small><strong>${damage6 || '—'}</strong></span>
      <span><small>Recarga</small><strong>${formatDecimal(weapon.cooldown)}s</strong></span>
    </div>
    <div class="evolution-box ${evolutionUnlocked ? '' : 'is-muted'}">
      <div class="evolution-head"><span aria-hidden="true">✨</span><strong>${esc(weapon.evolution.name)}</strong></div>
      <p>${esc(weapon.evolution.description)}</p>
      <span class="evolution-recipe">Evolução: nível máximo + ${weapon.evolution.requiresStacks}× ${esc(requirementDef?.name ?? weapon.evolution.requiresUpgrade)}</span>
    </div>
    <div class="weapon-card-footer">
      <span class="weapon-owned">${unlocked ? 'Desbloqueada' : 'Bloqueada'}</span>
      ${action}
    </div>
  </article>`;
}

export function renderArsenal(save: SaveData): string {
  const loadout = normalizeLoadout(save.settings.loadout, save);
  const unlocked = WEAPONS.filter((weapon) => save.unlockedWeapons.includes(weapon.id));
  return `<div class="screen screen-arsenal">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Arsenal & loadout', 'A mala de combate', save.settings.muted)}
      ${pageHeader(
        'armas que trabalham sozinhas',
        'Arsenal',
        'Ataques são automáticos: posicionamento é tudo. Você começa com duas armas e pode encontrar outras durante a run.',
        `<span class="badge-soft">${unlocked.length}/${WEAPONS.length} desbloqueadas</span>`,
      )}

      <section class="loadout-banner panel">
        <div class="loadout-banner-copy">
          <span class="eyebrow">equipamento da próxima jornada</span>
          <h2>Seu loadout atual</h2>
          <p>Duas armas entram na run. Se equipar uma terceira, a segunda vaga é substituída. Pelo menos uma precisa ficar com você.</p>
        </div>
        <div class="loadout-banner-slots">
          ${[0, 1].map((index) => {
            const id = loadout[index];
            if (!id) return `<div class="loadout-banner-slot is-empty"><span>+</span><small>vaga livre</small></div>`;
            const weapon = getWeapon(id);
            return `<div class="loadout-banner-slot" style="--weapon-color:${weapon.color}">
              ${spriteImg(weapon.icon, weapon.name, 'loadout-weapon-img', '🗡️')}
              <div><small>Slot ${index + 1}</small><strong>${esc(weapon.name)}</strong><span>${esc(weaponTypeLabel(weapon.type))} · Nv. 1</span></div>
            </div>`;
          }).join('')}
        </div>
        <div class="loadout-banner-actions">
          <span class="tag tag-gold">${loadout.length}/2 equipadas</span>
          <button class="btn btn-primary btn-sm" data-action="goto" data-screen="journey">Ir para a rota</button>
        </div>
      </section>

      <div class="arsenal-toolbar">
        <span><span aria-hidden="true">⚡</span> Atiram automaticamente</span>
        <span><span aria-hidden="true">🔓</span> Desbloqueie armas concluindo regiões</span>
        <span><span aria-hidden="true">✨</span> Evolua com nível máximo + upgrade específico</span>
      </div>

      <div class="weapon-grid">${WEAPONS.map((weapon) => weaponCard(weapon, save, loadout)).join('')}</div>

      <section class="arsenal-tips panel">
        <div><span class="eyebrow">manual resumido</span><h2>Como montar uma build</h2></div>
        <div class="arsenal-tip-grid">
          <p><strong>Chinelo + Mala:</strong> dano à distância e proteção por contato. Build segura para aprender.</p>
          <p><strong>Pix + Carisma:</strong> explosões em grupo e aura constante para multidões densas.</p>
          <p><strong>Café + Combo:</strong> velocidade e golpes curtos. Ótima para chefes e elites.</p>
          <p><strong>Passaporte + Mochila:</strong> sorte, moedas e sobrevivência. A viagem fica mais generosa.</p>
        </div>
        <p class="panel-note">A sexta arma de uma run pode aparecer como oferta de nível. O limite é de seis armas ativas; passivas também ocupam espaço.</p>
      </section>

      <div class="flow-actions">
        <button class="btn btn-ghost" data-action="back">← Voltar</button>
        <span class="flow-hint">${formatNumber(save.permanentCoins)} moedas permanentes guardadas</span>
      </div>
    </div>
  </div>`;
}
