import { describe, expect, it } from 'vitest';
import { META_MAP, metaCost } from '../data/meta';
import { makeSave } from '../test/factories';
import { buyMetaUpgrade, normalizeLoadout, toggleLoadoutWeapon, unlockCharacter } from './metaShop';

describe('permanent shop', () => {
  it('buys levels, spends coins and counts the purchase', () => {
    const save = makeSave({ permanentCoins: 1000 });
    const result = buyMetaUpgrade(save, 'treinamento');
    expect(result.ok).toBe(true);
    expect(result.cost).toBe(55);
    expect(save.meta.treinamento).toBe(1);
    expect(save.permanentCoins).toBe(945);
    expect(save.stats.metaUpgradesBought).toBe(1);
    expect(result.message).toContain('nível 1');
  });

  it('stops at the max level and at the coin limit', () => {
    const save = makeSave({ permanentCoins: 1000 });
    for (let i = 0; i < 5; i += 1) {
      expect(buyMetaUpgrade(save, 'treinamento').ok).toBe(true);
    }
    expect(save.meta.treinamento).toBe(META_MAP.treinamento.maxLevel);
    const maxed = buyMetaUpgrade(save, 'treinamento');
    expect(maxed.ok).toBe(false);
    expect(maxed.message).toContain('nível máximo');

    const poor = makeSave({ permanentCoins: 10 });
    const short = buyMetaUpgrade(poor, 'corrida');
    expect(short.ok).toBe(false);
    expect(short.cost).toBe(50);
    expect(short.message).toContain('Faltam 40');
    expect(poor.meta.corrida).toBeUndefined();
  });

  it('honours prerequisites and rejects unknown upgrades', () => {
    const save = makeSave({ permanentCoins: 1000 });
    const blocked = buyMetaUpgrade(save, 'financeiro');
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toContain('pré-requisitos');
    expect(save.meta.financeiro).toBeUndefined();

    save.meta.treinamento = 2;
    const unlocked = buyMetaUpgrade(save, 'financeiro');
    expect(unlocked.ok).toBe(true);
    expect(unlocked.cost).toBe(metaCost(META_MAP.financeiro, 0));

    expect(buyMetaUpgrade(save, 'nao_existe').ok).toBe(false);
  });

  it('unlocks characters once and charges their price', () => {
    const save = makeSave({ permanentCoins: 500 });
    expect(unlockCharacter(save, 'heroi').ok).toBe(false);
    expect(unlockCharacter(save, 'desconhecido' as 'mochileiro').ok).toBe(false);

    const result = unlockCharacter(save, 'mochileiro');
    expect(result.ok).toBe(true);
    expect(result.cost).toBe(160);
    expect(save.permanentCoins).toBe(340);
    expect(save.unlockedCharacters).toContain('mochileiro');
    expect(unlockCharacter(save, 'mochileiro').ok).toBe(false);
  });

  it('normalizes loadouts against unlocked weapons', () => {
    const save = makeSave();
    expect(normalizeLoadout(['pix', 'chinelo'], save)).toEqual(['chinelo']);
    expect(normalizeLoadout(['chinelo', 'chinelo', 'mala', 'cafe'], save)).toEqual(['chinelo', 'mala']);
    expect(normalizeLoadout([], save)).toEqual(['chinelo', 'mala']);
    expect(normalizeLoadout(['pix', 'marte' as 'pix'], save)).toEqual(['chinelo', 'mala']);

    save.unlockedWeapons = ['pix'];
    save.settings.loadout = ['cafe'];
    expect(normalizeLoadout([], save)).toEqual(['pix']);
  });

  it('toggles at most two weapons and keeps one equipped', () => {
    const save = makeSave();
    const add = toggleLoadoutWeapon(save, 'cafe');
    expect(add.loadout).toEqual(['chinelo', 'cafe']);
    expect(save.settings.loadout).toEqual(['chinelo', 'cafe']);

    const remove = toggleLoadoutWeapon(save, 'chinelo');
    expect(remove.loadout).toEqual(['cafe']);

    const last = toggleLoadoutWeapon(save, 'cafe');
    expect(last.loadout).toEqual(['cafe']);
    expect(last.message).toContain('pelo menos uma arma');

    const locked = toggleLoadoutWeapon(save, 'pix');
    expect(locked.loadout).toEqual(['cafe']);
    expect(locked.message).toContain('bloqueada');
  });
});
