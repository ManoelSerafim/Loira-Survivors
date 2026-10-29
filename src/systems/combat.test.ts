import { describe, expect, it } from 'vitest';
import { getEnemy } from '../data/enemies';
import { getRegion } from '../data/regions';
import {
  armorMitigation,
  difficultyScoreBonus,
  mitigateDamage,
  rollAttackDamage,
  scaleEnemy,
  spawnInterval,
  xpToNext,
} from './combat';

describe('combat maths', () => {
  it('raises the XP requirement as levels grow', () => {
    expect(xpToNext(1)).toBe(9);
    expect(xpToNext(2)).toBeGreaterThan(xpToNext(1));
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(9));
    expect(xpToNext(0)).toBe(xpToNext(1));
  });

  it('caps armor mitigation and always deals at least one damage', () => {
    expect(armorMitigation(0)).toBe(0);
    expect(armorMitigation(10)).toBeCloseTo(0.55);
    expect(armorMitigation(999)).toBe(0.72);
    expect(mitigateDamage(100, 0)).toBe(100);
    expect(mitigateDamage(100, 999)).toBeCloseTo(28);
    expect(mitigateDamage(0, 0)).toBe(1);
    expect(mitigateDamage(1, 32)).toBe(1);
  });

  it('rolls critical hits above the normal multiplier', () => {
    const regular = rollAttackDamage(10, { damageMult: 2, critChance: 0.2 }, 0.8);
    const critical = rollAttackDamage(10, { damageMult: 2, critChance: 0.2 }, 0.1);
    expect(regular.crit).toBe(false);
    expect(regular.damage).toBe(20);
    expect(critical.crit).toBe(true);
    expect(critical.damage).toBeCloseTo(37);
  });

  it('scales enemies with region, progress and difficulty', () => {
    const enemy = getEnemy('turista');
    const start = scaleEnemy(enemy, {
      elapsed: 0,
      duration: 100,
      difficulty: 'normal',
      regionId: 'brasil',
    });
    const late = scaleEnemy(enemy, {
      elapsed: 100,
      duration: 100,
      difficulty: 'lendaria',
      regionId: 'portugal',
    });
    const elite = scaleEnemy(enemy, {
      elapsed: 50,
      duration: 100,
      difficulty: 'normal',
      regionId: 'brasil',
      elite: true,
    });
    expect(late.hp).toBeGreaterThan(start.hp * 4);
    expect(late.damage).toBeGreaterThan(start.damage);
    expect(late.speed).toBeGreaterThan(start.speed);
    expect(elite.hp).toBeGreaterThan(start.hp);
    expect(elite.coinValue).toBe(enemy.coinValue * 2);
    expect(elite.scale).toBeGreaterThan(start.scale);
  });

  it('spawns faster as regions progress and with larger groups', () => {
    const region = getRegion('brasil');
    expect(spawnInterval(region, 0, 'normal')).toBeGreaterThan(spawnInterval(region, 1, 'normal'));
    expect(spawnInterval(region, 1, 'lendaria')).toBeLessThan(spawnInterval(region, 1, 'normal'));
    expect(spawnInterval(region, 0.5, 'normal', 3)).toBeLessThan(spawnInterval(region, 0.5, 'normal'));
  });

  it('scores harder difficulties higher', () => {
    expect(difficultyScoreBonus('normal')).toBe(0);
    expect(difficultyScoreBonus('dificil')).toBe(1);
    expect(difficultyScoreBonus('lendaria')).toBe(2);
  });
});
