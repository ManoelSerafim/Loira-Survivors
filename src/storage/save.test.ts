import { describe, expect, it } from 'vitest';
import type { SaveData } from '../core/types';
import {
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  SAVE_VERSION,
  defaultSave,
  loadSave,
  resetSave,
  sanitizeSave,
  writeSave,
} from './save';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('save sanitization', () => {
  it('falls back to a fresh save for non-object input', () => {
    for (const raw of [null, undefined, 42, 'corrupt', []]) {
      const save = sanitizeSave(raw);
      expect(save.version).toBe(SAVE_VERSION);
      expect(save.permanentCoins).toBe(0);
      expect(save.unlockedRegions).toEqual(['brasil']);
      expect(save.unlockedWeapons).toEqual(expect.arrayContaining(['chinelo', 'mala', 'cafe']));
      expect(save.unlockedCharacters).toEqual(['heroi']);
      expect(save.settings.loadout).toEqual(['chinelo', 'mala']);
    }
  });

  it('repairs ids, duplicates, counters and nested records', () => {
    const save = sanitizeSave({
      version: 99,
      permanentCoins: -50,
      unlockedRegions: ['aeroporto', 'aeroporto', 'atlantico', 'marte'],
      clearedRegions: ['aeroporto', 'marte', 'portugal'],
      unlockedCharacters: ['tatico', 'tatico', 'ze'],
      unlockedWeapons: ['pix', 'pix', 'inventada'],
      meta: { treinamento: 99, determinacao: 1.8, desconhecido: 4 },
      achievements: {
        primeiro_sangue: { unlockedAt: '2026-01-01T00:00:00.000Z' },
        conquista_falsa: { unlockedAt: '2026-01-01T00:00:00.000Z' },
      },
      stats: { runsStarted: -3, runsWon: 2.9, totalKills: Number.NaN, bestTime: 42 },
      album: {
        ana: {
          conqueredAt: '2026-01-01T00:00:00.000Z',
          order: -5,
          endingId: 'primeiro_encontro',
          difficulty: 'inventada',
        },
        falsa: { conqueredAt: '2026-01-01T00:00:00.000Z' },
      },
      endings: {
        primeiro_encontro: { count: -1, firstAt: '2026-01-01T00:00:00.000Z' },
        falso: { count: 2, firstAt: '2026-01-01T00:00:00.000Z' },
      },
      bestTimes: { brasil: 95, portugal: -1, aeroporto: 'rápido' },
      settings: {
        masterVolume: 5,
        musicVolume: -1,
        sfxVolume: 0.25,
        muted: 'sim',
        screenShake: false,
        damageNumbers: true,
        quality: 'ultra',
        joystickSide: 'cima',
        loadout: ['pix', 'pix', 'inventada'],
        showFps: true,
      },
      flags: { weaponMaxed: 1, invalido: 'sim', gigante: 1e9, longo: 2 },
      createdAt: 12,
      lastPlayedAt: '2026-02-01T00:00:00.000Z',
    });

    expect(save.version).toBe(SAVE_VERSION);
    expect(save.permanentCoins).toBe(0);
    expect(save.unlockedRegions).toEqual(['brasil', 'aeroporto', 'atlantico']);
    expect(save.clearedRegions).toEqual(['aeroporto']);
    expect(save.unlockedCharacters).toEqual(['heroi', 'tatico']);
    expect(save.unlockedWeapons).toEqual(expect.arrayContaining(['chinelo', 'mala', 'cafe', 'pix']));
    expect(save.unlockedWeapons).toHaveLength(4);
    expect(save.meta.treinamento).toBe(5);
    expect(save.meta.determinacao).toBe(1);
    expect(save.meta.desconhecido).toBeUndefined();
    expect(Object.keys(save.achievements)).toEqual(['primeiro_sangue']);
    expect(save.stats.runsStarted).toBe(0);
    expect(save.stats.runsWon).toBe(2);
    expect(save.stats.totalKills).toBe(0);
    expect(save.stats.bestTime).toBe(42);
    expect(save.album.ana?.order).toBe(1);
    expect(save.album.ana?.difficulty).toBe('normal');
    expect(save.album.falsa).toBeUndefined();
    expect(save.endings.primeiro_encontro?.count).toBe(1);
    expect(save.endings.falso).toBeUndefined();
    expect(save.bestTimes).toEqual({ brasil: 95 });
    expect(save.settings.masterVolume).toBe(1);
    expect(save.settings.musicVolume).toBe(0);
    expect(save.settings.sfxVolume).toBe(0.25);
    expect(save.settings.muted).toBe(false);
    expect(save.settings.quality).toBe('alta');
    expect(save.settings.joystickSide).toBe('esquerda');
    expect(save.settings.loadout).toEqual(['pix']);
    expect(save.settings.showFps).toBe(true);
    expect(save.flags).toEqual({ weaponMaxed: 1, gigante: 1_000_000_000, longo: 2 });
    expect(typeof save.createdAt).toBe('string');
    expect(save.lastPlayedAt).toBe('2026-02-01T00:00:00.000Z');
  });
});

describe('save persistence', () => {
  it('writes and reloads a save', () => {
    const storage = new MemoryStorage();
    const save = defaultSave();
    save.permanentCoins = 123;
    save.stats.runsWon = 2;
    expect(writeSave(save, storage)).toBe(true);
    const result = loadSave(storage);
    expect(result.corrupt).toBe(false);
    expect(result.recovered).toBe(false);
    expect(result.save.permanentCoins).toBe(123);
    expect(result.save.stats.runsWon).toBe(2);
    expect(result.save.version).toBe(SAVE_VERSION);
  });

  it('backs up corrupt JSON and starts a fresh save', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{this is not json');
    const result = loadSave(storage);
    expect(result.corrupt).toBe(true);
    expect(result.save.permanentCoins).toBe(0);
    expect(storage.getItem(SAVE_BACKUP_KEY)).toContain('this is not json');
  });

  it('backs up saves from a newer version instead of parsing them', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION + 1, permanentCoins: 9999 }));
    const result = loadSave(storage);
    expect(result.corrupt).toBe(true);
    expect(result.message).toContain('versão mais nova');
    expect(result.save.permanentCoins).toBe(0);
    expect(storage.getItem(SAVE_BACKUP_KEY)).toContain('9999');
  });

  it('marks older versions as recovered and upgrades them', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 0, permanentCoins: 25 }));
    const result = loadSave(storage);
    expect(result.recovered).toBe(true);
    expect(result.corrupt).toBe(false);
    expect(result.save.version).toBe(SAVE_VERSION);
    expect(result.save.permanentCoins).toBe(25);
  });

  it('returns a usable fresh save when storage is unavailable', () => {
    const result = loadSave(null);
    expect(result.save.version).toBe(SAVE_VERSION);
    expect(result.message).toBe('');
    expect(writeSave(result.save, null)).toBe(false);
  });

  it('resets progress and persists the fresh save', () => {
    const storage = new MemoryStorage();
    const save = defaultSave();
    save.permanentCoins = 500;
    save.stats.runsWon = 9;
    writeSave(save, storage);
    const reset = resetSave(storage);
    expect(reset.permanentCoins).toBe(0);
    expect(reset.stats.runsWon).toBe(0);
    expect(loadSave(storage).save.permanentCoins).toBe(0);
  });

  it('updates a legacy version when saving', () => {
    const storage = new MemoryStorage();
    const save = { ...defaultSave(), version: 0 } as SaveData;
    writeSave(save, storage);
    expect(save.version).toBe(SAVE_VERSION);
    expect(storage.getItem(SAVE_KEY)).toContain(`"version":${SAVE_VERSION}`);
  });
});
