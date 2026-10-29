import type { RunSummary, SaveData } from '../core/types';
import { defaultSave } from '../storage/save';

export function makeSave(overrides: Partial<SaveData> = {}): SaveData {
  const base = defaultSave();
  const save: SaveData = { ...base, ...overrides };
  save.stats = { ...base.stats, ...(overrides.stats ?? {}) };
  save.settings = { ...base.settings, ...(overrides.settings ?? {}) };
  return save;
}

export function makeSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    config: {
      regionId: 'brasil',
      difficulty: 'normal',
      characterId: 'heroi',
      loadout: ['chinelo', 'mala'],
    },
    victory: false,
    time: 100,
    duration: 105,
    level: 5,
    kills: 10,
    bossKills: 0,
    bossDefeated: false,
    coins: 50,
    xp: 100,
    upgrades: 3,
    hpRatio: 0.5,
    noHit: false,
    lowHpMoment: false,
    challenges: 0,
    challengesCompleted: 0,
    score: 0,
    endingId: '',
    loiraId: null,
    evolvedWeapons: [],
    ownedWeapons: ['chinelo', 'mala'],
    maxWeaponLevel: 1,
    ...overrides,
  };
}
