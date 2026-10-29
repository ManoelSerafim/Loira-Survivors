import { describe, expect, it } from 'vitest';
import { BASE_STATS, STAT_CAPS, computeDerived, describeBonus, mergeBonuses } from './stats';

describe('stat calculations', () => {
  it('merges bonus sources by adding their values', () => {
    expect(mergeBonuses({ damage: 0.1, armor: 1 }, undefined, { damage: 0.2, luck: 4 })).toEqual({
      damage: 0.30000000000000004,
      armor: 1,
      luck: 4,
    });
  });

  it('computes the base derived stats', () => {
    const derived = computeDerived({});
    expect(derived.maxHp).toBe(BASE_STATS.maxHp);
    expect(derived.moveSpeed).toBe(BASE_STATS.moveSpeed);
    expect(derived.damageMult).toBe(1);
    expect(derived.critChance).toBeCloseTo(0.05);
    expect(derived.xpMult).toBe(1);
    expect(derived.coinMult).toBe(1);
    expect(derived.cooldownMult).toBe(1);
  });

  it('applies every stat cap to oversized bonuses', () => {
    const derived = computeDerived({
      maxHp: 99,
      moveSpeed: 99,
      damage: 99,
      attackSpeed: 99,
      range: 99,
      critChance: 99,
      armor: 999,
      luck: 999,
      xpGain: 99,
      coinGain: 99,
      regen: 999,
      cooldown: 99,
      magnet: 9999,
      projectiles: 99,
      revives: 99,
      area: 99,
    });
    expect(derived.maxHp).toBe(STAT_CAPS.maxHp);
    expect(derived.moveSpeed).toBe(Math.round(BASE_STATS.moveSpeed * STAT_CAPS.moveSpeedMult));
    expect(derived.damageMult).toBe(STAT_CAPS.damageMult);
    expect(derived.attackSpeed).toBe(STAT_CAPS.attackSpeed);
    expect(derived.rangeMult).toBe(STAT_CAPS.rangeMult);
    expect(derived.critChance).toBe(STAT_CAPS.critChance);
    expect(derived.armor).toBe(STAT_CAPS.armor);
    expect(derived.luck).toBe(STAT_CAPS.luck);
    expect(derived.xpMult).toBe(STAT_CAPS.xpMult);
    expect(derived.coinMult).toBe(STAT_CAPS.coinMult);
    expect(derived.regen).toBe(STAT_CAPS.regen);
    expect(derived.cooldownMult).toBe(STAT_CAPS.cooldownMin);
    expect(derived.magnet).toBe(STAT_CAPS.magnet);
    expect(derived.projectiles).toBe(STAT_CAPS.projectiles);
    expect(derived.revives).toBe(STAT_CAPS.revives);
    expect(derived.areaMult).toBe(STAT_CAPS.areaMult);
  });

  it('supports a base HP override for fragile characters', () => {
    expect(computeDerived({}, 80).maxHp).toBe(80);
    expect(computeDerived({ maxHp: 0.1 }, 80).maxHp).toBe(88);
  });

  it('describes bonuses with Brazilian decimal separators', () => {
    expect(describeBonus('regen', 0.5)).toBe('+0,50 vida/s');
    expect(describeBonus('damage', 0.12)).toBe('+12% dano');
    expect(describeBonus('armor', 2)).toBe('+2 armadura');
  });
});
