import type { StatBonuses, StatKey } from './types';
import { formatDecimal } from './format';

export interface BaseStats {
  maxHp: number;
  moveSpeed: number;
  damage: number;
  attackSpeed: number;
  range: number;
  critChance: number;
  armor: number;
  luck: number;
  xpGain: number;
  coinGain: number;
  regen: number;
  cooldown: number;
  magnet: number;
  projectiles: number;
  revives: number;
  area: number;
}

export const BASE_STATS: BaseStats = {
  maxHp: 100,
  moveSpeed: 210,
  damage: 1,
  attackSpeed: 1,
  range: 1,
  critChance: 0.05,
  armor: 0,
  luck: 0,
  xpGain: 1,
  coinGain: 1,
  regen: 0,
  cooldown: 1,
  magnet: 80,
  projectiles: 0,
  revives: 0,
  area: 1,
};

export interface DerivedStats {
  maxHp: number;
  moveSpeed: number;
  damageMult: number;
  attackSpeed: number;
  rangeMult: number;
  critChance: number;
  armor: number;
  luck: number;
  xpMult: number;
  coinMult: number;
  regen: number;
  cooldownMult: number;
  magnet: number;
  projectiles: number;
  revives: number;
  areaMult: number;
}

export const STAT_CAPS = {
  maxHp: 700,
  moveSpeedMult: 2.35,
  damageMult: 16,
  attackSpeed: 4.5,
  rangeMult: 2.8,
  critChance: 1,
  armor: 32,
  luck: 100,
  xpMult: 4,
  coinMult: 5,
  regen: 8,
  cooldownMin: 0.35,
  magnet: 420,
  projectiles: 6,
  revives: 2,
  areaMult: 2.8,
};

export function mergeBonuses(...sources: (StatBonuses | undefined)[]): StatBonuses {
  const result: StatBonuses = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, value] of Object.entries(source) as [StatKey, number][]) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}

export function computeDerived(bonuses: StatBonuses, baseHpOverride?: number): DerivedStats {
  const base = { ...BASE_STATS, ...(baseHpOverride !== undefined ? { maxHp: baseHpOverride } : {}) };
  const b = bonuses;
  return {
    maxHp: Math.round(Math.min(STAT_CAPS.maxHp, base.maxHp * (1 + (b.maxHp ?? 0)))),
    moveSpeed: Math.round(base.moveSpeed * Math.min(STAT_CAPS.moveSpeedMult, 1 + (b.moveSpeed ?? 0))),
    damageMult: Math.min(STAT_CAPS.damageMult, base.damage * (1 + (b.damage ?? 0))),
    attackSpeed: Math.min(STAT_CAPS.attackSpeed, base.attackSpeed * (1 + (b.attackSpeed ?? 0))),
    rangeMult: Math.min(STAT_CAPS.rangeMult, base.range * (1 + (b.range ?? 0))),
    critChance: Math.min(STAT_CAPS.critChance, base.critChance + (b.critChance ?? 0)),
    armor: Math.min(STAT_CAPS.armor, base.armor + (b.armor ?? 0)),
    luck: Math.min(STAT_CAPS.luck, base.luck + (b.luck ?? 0)),
    xpMult: Math.min(STAT_CAPS.xpMult, base.xpGain * (1 + (b.xpGain ?? 0))),
    coinMult: Math.min(STAT_CAPS.coinMult, base.coinGain * (1 + (b.coinGain ?? 0))),
    regen: Math.min(STAT_CAPS.regen, base.regen + (b.regen ?? 0)),
    cooldownMult: Math.max(STAT_CAPS.cooldownMin, base.cooldown * (1 - (b.cooldown ?? 0))),
    magnet: Math.min(STAT_CAPS.magnet, base.magnet + (b.magnet ?? 0)),
    projectiles: Math.min(STAT_CAPS.projectiles, base.projectiles + (b.projectiles ?? 0)),
    revives: Math.min(STAT_CAPS.revives, base.revives + (b.revives ?? 0)),
    areaMult: Math.min(STAT_CAPS.areaMult, base.area * (1 + (b.area ?? 0))),
  };
}

export function getCharacterBaseHp(baseHp: number | undefined): number {
  return baseHp ?? BASE_STATS.maxHp;
}

export function describeBonus(key: StatKey, value: number): string {
  switch (key) {
    case 'maxHp':
      return `+${Math.round(value * 100)}% vida máxima`;
    case 'moveSpeed':
      return `+${Math.round(value * 100)}% velocidade`;
    case 'damage':
      return `+${Math.round(value * 100)}% dano`;
    case 'attackSpeed':
      return `+${Math.round(value * 100)}% velocidade de ataque`;
    case 'range':
      return `+${Math.round(value * 100)}% alcance`;
    case 'critChance':
      return `+${Math.round(value * 100)}% chance crítica`;
    case 'armor':
      return `+${value} armadura`;
    case 'luck':
      return `+${value} sorte`;
    case 'xpGain':
      return `+${Math.round(value * 100)}% experiência`;
    case 'coinGain':
      return `+${Math.round(value * 100)}% moedas`;
    case 'regen':
      return `+${formatDecimal(value)} vida/s`;
    case 'cooldown':
      return `-${Math.round(value * 100)}% recarga`;
    case 'magnet':
      return `+${value} alcance de coleta`;
    case 'projectiles':
      return `+${value} projétil`;
    case 'revives':
      return `+${value} segunda chance`;
    case 'area':
      return `+${Math.round(value * 100)}% área de efeito`;
  }
}
