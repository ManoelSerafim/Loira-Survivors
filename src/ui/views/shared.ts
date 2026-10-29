import type {
  CharacterId,
  DerivedStats,
  RegionDef,
  SaveData,
  StatKey,
  WeaponDef,
} from '../../core/types';
import { computeDerived, mergeBonuses } from '../../core/stats';
import { formatDecimal, formatNumber, formatTime } from '../../core/format';
import { getCharacter } from '../../data/characters';
import { getMetaEffects, metaLevel } from '../../systems/progression';
import { META_UPGRADES } from '../../data/meta';
import { REGIONS, getRegion } from '../../data/regions';
import { esc, spriteImg, tag } from '../components';

export function bonusLabel(key: StatKey, value: number): string {
  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  switch (key) {
    case 'maxHp':
      return `${sign}${Math.round(abs * 100)}% vida`;
    case 'moveSpeed':
      return `${sign}${Math.round(abs * 100)}% velocidade`;
    case 'damage':
      return `${sign}${Math.round(abs * 100)}% dano`;
    case 'attackSpeed':
      return `${sign}${Math.round(abs * 100)}% velocidade de ataque`;
    case 'range':
      return `${sign}${Math.round(abs * 100)}% alcance`;
    case 'critChance':
      return `${sign}${Math.round(abs * 100)}% crítico`;
    case 'armor':
      return `${sign}${formatNumber(abs)} armadura`;
    case 'luck':
      return `${sign}${formatNumber(abs)} sorte`;
    case 'xpGain':
      return `${sign}${Math.round(abs * 100)}% experiência`;
    case 'coinGain':
      return `${sign}${Math.round(abs * 100)}% moedas`;
    case 'regen':
      return `${sign}${formatDecimal(abs)} vida/s`;
    case 'cooldown':
      return `${sign}${Math.round(abs * 100)}% recarga`;
    case 'magnet':
      return `${sign}${formatNumber(abs)} coleta`;
    case 'projectiles':
      return `${sign}${formatNumber(abs)} projétil`;
    case 'revives':
      return `${sign}${formatNumber(abs)} segunda chance`;
    case 'area':
      return `${sign}${Math.round(abs * 100)}% área`;
    default:
      return `${sign}${formatNumber(abs)}`;
  }
}

export function characterDerivedStats(characterId: CharacterId, save: SaveData): DerivedStats {
  const character = getCharacter(characterId);
  const meta = getMetaEffects(save);
  return computeDerived(
    mergeBonuses(character.bonuses, {
      damage: meta.damage,
      maxHp: meta.maxHp,
      moveSpeed: meta.moveSpeed,
      luck: meta.luck,
      xpGain: meta.xpGain,
      armor: meta.armor,
      revives: meta.revives,
    }),
  );
}

export function activeMetaBonuses(save: SaveData): { name: string; text: string; level: number }[] {
  return META_UPGRADES.filter((upgrade) => metaLevel(save, upgrade.id) > 0).map((upgrade) => ({
    name: upgrade.name,
    text: upgrade.effectText(metaLevel(save, upgrade.id)),
    level: metaLevel(save, upgrade.id),
  }));
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'data desconhecida';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatLongDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  if (minutes > 0) return `${minutes}min`;
  return `${total}s`;
}

export function weaponTypeLabel(type: WeaponDef['type']): string {
  switch (type) {
    case 'projectile':
      return 'Projétil';
    case 'area':
      return 'Área';
    case 'passive':
      return 'Passiva';
    case 'aura':
      return 'Aura';
    case 'orbit':
      return 'Órbita';
    case 'melee':
      return 'Corpo a corpo';
    default:
      return type;
  }
}

export function weaponIcon(weapon: WeaponDef, className = 'weapon-sprite'): string {
  return spriteImg(weapon.icon, weapon.name, className, '🗡️');
}

export function weaponChip(weapon: WeaponDef, extra = ''): string {
  return `<span class="weapon-chip" style="--weapon-color:${weapon.color}">
    ${weaponIcon(weapon, 'weapon-chip-icon')}
    <span><strong>${esc(weapon.name)}</strong>${extra ? `<small>${extra}</small>` : ''}</span>
  </span>`;
}

export function regionStatus(save: SaveData, region: RegionDef): { label: string; className: string } {
  if (save.clearedRegions.includes(region.id)) return { label: 'Concluída', className: 'is-cleared' };
  if (save.unlockedRegions.includes(region.id)) return { label: 'Disponível', className: 'is-open' };
  return { label: 'Bloqueada', className: 'is-locked' };
}

export function travelRoute(save: SaveData, selectedRegionId?: string, compact = false): string {
  const cleared = save.clearedRegions.length;
  return `<div class="route-rail ${compact ? 'is-compact' : ''}">
    <div class="route-line" aria-hidden="true"><span style="width:${(cleared / (REGIONS.length - 1)) * 100}%"></span></div>
    ${REGIONS.map((region, index) => {
      const status = regionStatus(save, region);
      const unlocked = save.unlockedRegions.includes(region.id);
      const isSelected = selectedRegionId === region.id;
      const content = `<span class="route-node">${status.className === 'is-cleared' ? '✓' : index + 1}</span>
        <span class="route-thumb"><img src="./${esc(region.art)}" alt="" loading="lazy" draggable="false"></span>
        <span class="route-copy"><strong>${esc(region.name)}</strong><small>${status.label}</small></span>`;
      return unlocked
        ? `<button class="route-stop ${status.className} ${isSelected ? 'is-selected' : ''}" data-action="route-select" data-region="${region.id}" title="Abrir ${esc(region.name)}">${content}</button>`
        : `<div class="route-stop ${status.className}" aria-label="${esc(region.name)} bloqueada">${content}<span class="route-lock" aria-hidden="true">🔒</span></div>`;
    }).join('')}
  </div>`;
}

export function statTile(label: string, value: string, emoji: string): string {
  return `<div class="stat-tile"><span class="stat-tile-icon" aria-hidden="true">${emoji}</span><span class="stat-tile-copy"><small>${esc(label)}</small><strong>${esc(value)}</strong></span></div>`;
}

export function selectedRegion(save: SaveData, regionId: string): RegionDef {
  const region = REGIONS.find((candidate) => candidate.id === regionId && save.unlockedRegions.includes(candidate.id));
  return region ?? getRegion('brasil');
}

export function runDuration(region: RegionDef, save: SaveData): number {
  return Math.max(45, Math.round(region.duration * getMetaEffects(save).durationMult));
}

export function routeProgressLabel(save: SaveData): string {
  const total = REGIONS.length;
  const cleared = save.clearedRegions.length;
  return `${cleared} de ${total} etapas concluídas`;
}

export function regionalBest(save: SaveData, regionId: RegionDef['id']): string {
  const best = save.bestTimes[regionId];
  return best ? formatTime(best) : '—';
}

export function metaRequirementText(save: SaveData, upgrade: (typeof META_UPGRADES)[number]): string {
  const missing = (upgrade.requires ?? []).filter((requirement) => (save.meta[requirement.id] ?? 0) < requirement.level);
  if (!missing.length) return '';
  return `Requer ${missing
    .map((requirement) => {
      const def = META_UPGRADES.find((candidate) => candidate.id === requirement.id);
      return `${def?.name ?? requirement.id} nv. ${requirement.level}`;
    })
    .join(' e ')}`;
}

export function rarityLabel(rarity: string): string {
  switch (rarity) {
    case 'comum':
      return 'Comum';
    case 'raro':
      return 'Raro';
    case 'epico':
      return 'Épico';
    case 'lendario':
      return 'Lendário';
    default:
      return rarity;
  }
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function tinyTag(text: string, className = ''): string {
  return tag(esc(text), className);
}

export function iconLabel(emoji: string, text: string): string {
  return `<span class="icon-label"><span aria-hidden="true">${emoji}</span>${text}</span>`;
}
