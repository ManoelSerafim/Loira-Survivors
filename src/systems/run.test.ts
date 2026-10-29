import { describe, expect, it } from 'vitest';
import type { RunConfig } from '../core/types';
import { getWeapon } from '../data/weapons';
import { makeSave } from '../test/factories';
import { RunModel } from './run';

const CONFIG: RunConfig = {
  regionId: 'brasil',
  difficulty: 'normal',
  characterId: 'heroi',
  loadout: ['chinelo', 'mala'],
};

function createRun(overrides: Parameters<typeof makeSave>[0] = {}): RunModel {
  return new RunModel(CONFIG, makeSave(overrides), 7);
}

describe('run model', () => {
  it('starts with the requested loadout and full health', () => {
    const model = createRun();
    expect([...model.weapons.keys()]).toEqual(['chinelo', 'mala']);
    expect(model.hp).toBe(model.derived.maxHp);
    expect(model.level).toBe(1);
    expect(model.xp).toBe(0);
    expect(model.xpNeeded).toBe(9);
    expect(model.revivesLeft).toBe(0);
    expect(model.duration).toBe(105);
  });

  it('falls back to the first unlocked weapon when the loadout is invalid', () => {
    const save = makeSave({ unlockedWeapons: ['chinelo', 'mala', 'cafe'] });
    const model = new RunModel({ ...CONFIG, loadout: ['pix'] }, save, 1);
    expect([...model.weapons.keys()]).toEqual(['chinelo']);
  });

  it('gains multiple levels and respects the level cap', () => {
    const model = createRun();
    expect(model.addXp(9)).toBe(1);
    expect(model.level).toBe(2);
    expect(model.xp).toBe(0);
    expect(model.xpNeeded).toBe(14);

    model.addXp(100);
    expect(model.level).toBeGreaterThan(2);
    expect(model.xp).toBeLessThan(model.xpNeeded);

    model.addXp(1_000_000_000);
    expect(model.level).toBe(60);
    expect(model.addXp(100)).toBe(0);
  });

  it('applies coin rounding and spending', () => {
    const model = new RunModel(
      { ...CONFIG, characterId: 'mochileiro' },
      makeSave({ unlockedCharacters: ['heroi', 'mochileiro'] }),
      1,
    );
    expect(model.addCoins(10.4)).toBe(10);
    expect(model.coins).toBe(10);
    expect(model.spendCoins(11)).toBe(false);
    expect(model.spendCoins(4)).toBe(true);
    expect(model.coins).toBe(6);
  });

  it('tracks kills, bosses and damage without revives', () => {
    const model = createRun();
    model.addKill();
    model.addKill(true);
    expect(model.kills).toBe(2);
    expect(model.bossKills).toBe(1);

    expect(model.takeDamage(10)).toEqual({ amount: 10, died: false, revived: false });
    expect(model.hp).toBe(90);
    expect(model.noHit).toBe(false);

    expect(model.takeDamage(9999)).toEqual({ amount: 9999, died: true, revived: false });
    expect(model.hp).toBe(0);
  });

  it('consumes a revive before dying and flags near-death moments', () => {
    const save = makeSave();
    save.meta.determinacao = 1;
    const model = new RunModel(CONFIG, save, 1);
    expect(model.revivesLeft).toBe(1);

    const first = model.takeDamage(9999);
    expect(first.revived).toBe(true);
    expect(first.died).toBe(false);
    expect(model.hp).toBe(Math.round(model.derived.maxHp * 0.45));
    expect(model.revivesLeft).toBe(0);
    expect(model.lowHpMoment).toBe(true);

    expect(model.takeDamage(9999).died).toBe(true);
  });

  it('ticks buffs, regeneration and expiration', () => {
    const save = makeSave();
    save.meta.condicionamento = 0;
    const model = new RunModel(CONFIG, save, 1);
    model.hp = 50;
    model.addBuff('cafe', 'Café', '☕', 2, { regen: 0.5 });
    expect(model.derived.regen).toBe(0.5);
    model.tick(1);
    expect(model.hp).toBeGreaterThan(50);
    expect(model.buffs).toHaveLength(1);
    model.tick(1.1);
    expect(model.buffs).toHaveLength(0);
    expect(model.getBuffInfos()).toEqual([]);
  });

  it('always offers three choices and includes the strongest evolution first', () => {
    const model = createRun();
    const normalOffers = model.buildOffers();
    expect(normalOffers).toHaveLength(3);
    expect(new Set(normalOffers.map((offer) => offer.id)).size).toBe(3);

    const chinelo = model.weapons.get('chinelo');
    expect(chinelo).toBeDefined();
    if (!chinelo) return;
    chinelo.level = getWeapon('chinelo').maxLevel;
    model.stacks.forca = 2;
    model.recompute();
    expect(model.evolutionRequirementMet('chinelo')).toBe(true);

    const offers = model.buildOffers();
    expect(offers[0].kind).toBe('evolution');
    expect(offers[0].weaponId).toBe('chinelo');
    expect(model.applyOffer(offers[0])).toContain('Chinelo Incandescente');
    expect(chinelo.evolved).toBe(true);
    expect(model.applyOffer(offers[0])).toContain('Chinelo Incandescente');
    expect(chinelo.evolved).toBe(true);
  });

  it('applies weapon, new weapon and passive offers', () => {
    const model = createRun();
    const chinelo = model.weapons.get('chinelo');
    expect(chinelo).toBeDefined();
    if (!chinelo) return;

    model.applyOffer({
      id: 'weapon_chinelo_2',
      name: 'Chinelo',
      description: '',
      rarity: 'raro',
      icon: '',
      emoji: '',
      kind: 'weapon',
      weaponId: 'chinelo',
    });
    expect(chinelo.level).toBe(2);

    model.applyOffer({
      id: 'new_cafe',
      name: 'Café',
      description: '',
      rarity: 'epico',
      icon: '',
      emoji: '',
      kind: 'newWeapon',
      weaponId: 'cafe',
    });
    expect(model.weapons.has('cafe')).toBe(true);
    expect(model.weapons.size).toBe(3);

    model.hp = 40;
    const healMessage = model.applyOffer({
      id: 'heal',
      name: 'Lanche',
      description: '',
      rarity: 'comum',
      icon: '',
      emoji: '',
      kind: 'heal',
      upgradeId: 'lanche',
    });
    expect(healMessage).toBe('Vida recuperada.');
    expect(model.hp).toBeGreaterThan(40);

    const coinsBefore = model.coins;
    model.applyOffer({
      id: 'coins',
      name: 'Gorjeta',
      description: '',
      rarity: 'comum',
      icon: '',
      emoji: '',
      kind: 'coins',
      upgradeId: 'gorjeta',
    });
    expect(model.coins).toBeGreaterThan(coinsBefore);

    const message = model.applyOffer({
      id: 'up_forca',
      name: 'Força',
      description: '',
      rarity: 'comum',
      icon: '',
      emoji: '',
      kind: 'stat',
      upgradeId: 'forca',
    });
    expect(message).toBe('Força de Vontade adquirido!');
    expect(model.stacks.forca).toBe(1);
    expect(model.upgrades.some((upgrade) => upgrade.id === 'forca')).toBe(true);
    expect(model.upgradesChosen).toBe(5);
  });

  it('adds random weapons and snapshots the run', () => {
    const model = createRun();
    expect(model.addRandomWeaponIfPossible()).toBe('cafe');
    expect(model.addRandomWeaponIfPossible()).toBeNull();

    const snapshot = model.makeSnapshot({ challenges: 2, hpRatio: 0.25 });
    expect(snapshot.regionId).toBe('brasil');
    expect(snapshot.difficulty).toBe('normal');
    expect(snapshot.level).toBe(1);
    expect(snapshot.challenges).toBe(2);
    expect(snapshot.hpRatio).toBe(0.25);
    expect(snapshot.maxWeaponLevel).toBe(1);
  });

  it('recomputes passive bonuses from equipped weapons', () => {
    const model = createRun();
    model.weapons.set('mochila', { id: 'mochila', level: 2, evolved: false, cooldownLeft: 0, extra: 0 });
    model.weapons.set('passaporte', { id: 'passaporte', level: 1, evolved: false, cooldownLeft: 0, extra: 0 });
    model.recompute();
    expect(model.derived.armor).toBeGreaterThan(0);
    expect(model.derived.luck).toBeGreaterThan(0);
    expect(model.derived.coinMult).toBeGreaterThan(1);
  });
});
