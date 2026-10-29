import type { DifficultyId, DerivedStats, EnemyDef, RegionDef } from '../core/types';
import { clamp } from '../core/format';
import { getDifficulty, getRegion } from '../data/regions';

export function xpToNext(level: number): number {
  return Math.round(6 + Math.pow(Math.max(1, level), 1.25) * 3.2);
}

export function armorMitigation(armor: number): number {
  return clamp(armor * 0.055, 0, 0.72);
}

export function mitigateDamage(rawDamage: number, armor: number): number {
  return Math.max(1, rawDamage * (1 - armorMitigation(armor)));
}

export interface AttackResult {
  damage: number;
  crit: boolean;
}

export function rollAttackDamage(
  baseDamage: number,
  stats: Pick<DerivedStats, 'damageMult' | 'critChance'>,
  roll: number,
): AttackResult {
  const crit = roll < stats.critChance;
  const multiplier = crit ? 1.85 : 1;
  return {
    damage: Math.max(1, baseDamage * stats.damageMult * multiplier),
    crit,
  };
}

export interface EnemyScaleInput {
  elapsed: number;
  duration: number;
  difficulty: DifficultyId;
  regionId: string;
  elite?: boolean;
}

export interface EnemyScaledStats {
  hp: number;
  damage: number;
  speed: number;
  xp: number;
  coinValue: number;
  scale: number;
}

export function scaleEnemy(def: EnemyDef, input: EnemyScaleInput): EnemyScaledStats {
  const difficulty = getDifficulty(input.difficulty);
  const region = getRegion(input.regionId as RegionDef['id']);
  const progress = clamp(input.elapsed / Math.max(1, input.duration), 0, 1);
  const regionPower = 1 + (region.order - 1) * 0.13;
  const elitePower = input.elite ? 2.8 : 1;
  const hp = def.hp * regionPower * elitePower * (1 + progress * 1.85) * difficulty.hp;
  const damage = def.damage * (1 + progress * 0.75) * difficulty.damage * (input.elite ? 1.35 : 1);
  const speed = def.speed * (1 + progress * 0.12) * difficulty.speed;
  const xp = def.xp * (input.elite ? 2 : 1);
  const coinValue = def.coinValue * (input.elite ? 2 : 1);
  return {
    hp: Math.round(hp),
    damage: Math.round(damage * 10) / 10,
    speed,
    xp,
    coinValue,
    scale: def.scale * (input.elite ? 1.18 : 1),
  };
}

export function spawnInterval(region: RegionDef, progress: number, difficulty: DifficultyId, count = 1): number {
  const diff = getDifficulty(difficulty);
  const base = region.spawn.start + (region.spawn.end - region.spawn.start) * clamp(progress, 0, 1);
  const rate = base * (1 + (diff.speed - 1) * 0.4) * (1 + (count - 1) * 0.08);
  return 1 / Math.max(0.4, rate);
}

export function difficultyScoreBonus(difficulty: DifficultyId): number {
  return difficulty === 'normal' ? 0 : difficulty === 'dificil' ? 1 : 2;
}
