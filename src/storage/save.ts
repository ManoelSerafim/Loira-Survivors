import type { CharacterId, RegionId, SaveData, SaveSettings, WeaponId } from '../core/types';
import { CHARACTERS } from '../data/characters';
import { REGIONS } from '../data/regions';
import { WEAPONS, DEFAULT_LOADOUT } from '../data/weapons';
import { META_MAP } from '../data/meta';
import { ACHIEVEMENT_MAP } from '../data/achievements';
import { LOIRAS } from '../data/loiras';
import { ENDINGS } from '../data/endings';
import { clamp } from '../core/format';

export const SAVE_KEY = 'loira-survivors-save';
export const SAVE_BACKUP_KEY = 'loira-survivors-save-corrupt';
export const SAVE_VERSION = 1;

const REGION_IDS: RegionId[] = REGIONS.map((region) => region.id);
const CHAR_IDS: CharacterId[] = CHARACTERS.map((character) => character.id);
const WEAPON_IDS: WeaponId[] = WEAPONS.map((weapon) => weapon.id);
const INITIAL_WEAPONS: WeaponId[] = ['chinelo', 'mala', 'cafe'];

export function defaultSettings(): SaveSettings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    muted: false,
    screenShake: true,
    damageNumbers: true,
    quality: 'alta',
    joystickSide: 'esquerda',
    loadout: [...DEFAULT_LOADOUT],
    showFps: false,
  };
}

export function defaultSave(): SaveData {
  const now = new Date().toISOString();
  return {
    version: SAVE_VERSION,
    permanentCoins: 0,
    unlockedRegions: ['brasil'],
    clearedRegions: [],
    unlockedCharacters: ['heroi'],
    unlockedWeapons: [...INITIAL_WEAPONS],
    meta: {},
    achievements: {},
    stats: {
      runsStarted: 0,
      runsFinished: 0,
      runsWon: 0,
      deaths: 0,
      portugalReaches: 0,
      portugalWins: 0,
      conquests: 0,
      bestTime: 0,
      bestLevel: 0,
      totalKills: 0,
      bossKills: 0,
      coinsCollected: 0,
      tempCoinsBanked: 0,
      upgradesChosen: 0,
      metaUpgradesBought: 0,
      maxWinStreak: 0,
      winStreak: 0,
      totalTimePlayed: 0,
      noHitWins: 0,
      lowHpWins: 0,
      legendaryAtlantico: 0,
      secretEndings: 0,
    },
    album: {},
    endings: {},
    bestTimes: {},
    settings: defaultSettings(),
    createdAt: now,
    lastPlayedAt: now,
    flags: {},
  };
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length <= 200 ? value : fallback;
}

function uniqueArray<T extends string>(value: unknown, valid: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is T => typeof item === 'string' && valid.includes(item as T)))];
}

function sanitizeSettings(raw: unknown, current: SaveSettings): SaveSettings {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<SaveSettings>;
  const loadout = uniqueArray(source.loadout, WEAPON_IDS);
  return {
    masterVolume: clamp(asNumber(source.masterVolume, current.masterVolume), 0, 1),
    musicVolume: clamp(asNumber(source.musicVolume, current.musicVolume), 0, 1),
    sfxVolume: clamp(asNumber(source.sfxVolume, current.sfxVolume), 0, 1),
    muted: typeof source.muted === 'boolean' ? source.muted : current.muted,
    screenShake: typeof source.screenShake === 'boolean' ? source.screenShake : current.screenShake,
    damageNumbers:
      typeof source.damageNumbers === 'boolean' ? source.damageNumbers : current.damageNumbers,
    quality: source.quality === 'alta' || source.quality === 'media' || source.quality === 'baixa' ? source.quality : current.quality,
    joystickSide: source.joystickSide === 'direita' ? 'direita' : 'esquerda',
    loadout: loadout.length ? loadout.slice(0, 2) : [...DEFAULT_LOADOUT],
    showFps: typeof source.showFps === 'boolean' ? source.showFps : current.showFps,
  };
}

export function sanitizeSave(raw: unknown): SaveData {
  const defaults = defaultSave();
  if (!raw || typeof raw !== 'object') return defaults;
  const source = raw as Partial<SaveData> & Record<string, unknown>;

  const unlockedRegions = uniqueArray(source.unlockedRegions, REGION_IDS);
  if (!unlockedRegions.includes('brasil')) unlockedRegions.unshift('brasil');
  const unlockedCharacters = uniqueArray(source.unlockedCharacters, CHAR_IDS);
  if (!unlockedCharacters.includes('heroi')) unlockedCharacters.unshift('heroi');
  const unlockedWeapons = uniqueArray(source.unlockedWeapons, WEAPON_IDS);
  for (const weapon of INITIAL_WEAPONS) if (!unlockedWeapons.includes(weapon)) unlockedWeapons.push(weapon);

  const meta: Record<string, number> = {};
  const rawMeta = source.meta && typeof source.meta === 'object' ? (source.meta as Record<string, unknown>) : {};
  for (const [id, def] of Object.entries(META_MAP)) {
    const level = Math.floor(asNumber(rawMeta[id], 0));
    if (level > 0) meta[id] = clamp(level, 0, def.maxLevel);
  }

  const achievements: Record<string, { unlockedAt: string }> = {};
  const rawAchievements =
    source.achievements && typeof source.achievements === 'object'
      ? (source.achievements as Record<string, { unlockedAt?: unknown }>)
      : {};
  for (const id of Object.keys(ACHIEVEMENT_MAP)) {
    if (rawAchievements[id]) {
      achievements[id] = { unlockedAt: asString(rawAchievements[id].unlockedAt, defaults.createdAt) };
    }
  }

  const album: SaveData['album'] = {};
  const rawAlbum = source.album && typeof source.album === 'object' ? (source.album as SaveData['album']) : {};
  for (const loira of LOIRAS) {
    const record = rawAlbum[loira.id];
    if (record && typeof record === 'object') {
      album[loira.id] = {
        loiraId: loira.id,
        conqueredAt: asString(record.conqueredAt, defaults.createdAt),
        order: Math.max(1, Math.floor(asNumber(record.order, 1))),
        endingId: asString(record.endingId, ''),
        difficulty:
          record.difficulty === 'dificil' || record.difficulty === 'lendaria' ? record.difficulty : 'normal',
      };
    }
  }

  const endings: SaveData['endings'] = {};
  const rawEndings = source.endings && typeof source.endings === 'object' ? (source.endings as SaveData['endings']) : {};
  for (const ending of ENDINGS) {
    const record = rawEndings[ending.id];
    if (record && typeof record === 'object') {
      endings[ending.id] = {
        count: Math.max(1, Math.floor(asNumber(record.count, 1))),
        firstAt: asString(record.firstAt, defaults.createdAt),
      };
    }
  }

  const bestTimes: SaveData['bestTimes'] = {};
  const rawBest = source.bestTimes && typeof source.bestTimes === 'object' ? (source.bestTimes as Record<string, unknown>) : {};
  for (const region of REGIONS) {
    const value = rawBest[region.id];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) bestTimes[region.id] = value;
  }

  const rawStats = source.stats && typeof source.stats === 'object' ? (source.stats as unknown as Record<string, unknown>) : {};
  const stats = { ...defaults.stats };
  for (const key of Object.keys(stats) as (keyof typeof stats)[]) {
    stats[key] = Math.max(0, Math.floor(asNumber(rawStats[key], stats[key])));
  }

  const flags: Record<string, number> = {};
  const rawFlags = source.flags && typeof source.flags === 'object' ? (source.flags as Record<string, unknown>) : {};
  for (const [key, value] of Object.entries(rawFlags)) {
    if (typeof value === 'number' && Number.isFinite(value) && key.length <= 60) {
      flags[key] = value;
    }
  }

  return {
    version: SAVE_VERSION,
    permanentCoins: Math.max(0, Math.floor(asNumber(source.permanentCoins, 0))),
    unlockedRegions,
    clearedRegions: uniqueArray(source.clearedRegions, REGION_IDS).filter((id) => unlockedRegions.includes(id)),
    unlockedCharacters,
    unlockedWeapons,
    meta,
    achievements,
    stats,
    album,
    endings,
    bestTimes,
    settings: sanitizeSettings(source.settings, defaults.settings),
    createdAt: asString(source.createdAt, defaults.createdAt),
    lastPlayedAt: asString(source.lastPlayedAt, defaults.lastPlayedAt),
    flags,
  };
}

export interface LoadResult {
  save: SaveData;
  recovered: boolean;
  corrupt: boolean;
  message: string;
}

export function loadSave(storage: Storage | null = safeStorage()): LoadResult {
  if (!storage) {
    return { save: defaultSave(), recovered: false, corrupt: false, message: '' };
  }
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { save: defaultSave(), recovered: false, corrupt: false, message: 'Armazenamento indisponível nesta sessão.' };
  }
  if (!raw) return { save: defaultSave(), recovered: false, corrupt: false, message: '' };

  try {
    const parsed = JSON.parse(raw) as { version?: unknown };
    if (typeof parsed.version === 'number' && parsed.version > SAVE_VERSION) {
      backupRaw(storage, raw);
      return {
        save: defaultSave(),
        recovered: false,
        corrupt: true,
        message: 'O save tinha uma versão mais nova. Um backup foi criado e um novo progresso foi iniciado.',
      };
    }
    const save = sanitizeSave(parsed);
    return { save, recovered: parsed.version !== SAVE_VERSION, corrupt: false, message: '' };
  } catch {
    backupRaw(storage, raw);
    return {
      save: defaultSave(),
      recovered: false,
      corrupt: true,
      message: 'O save estava corrompido. Guardamos um backup e começamos um novo progresso.',
    };
  }
}

function backupRaw(storage: Storage, raw: string): void {
  try {
    storage.setItem(SAVE_BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), raw }));
  } catch {
    // Ignore backup failures.
  }
}

export function writeSave(save: SaveData, storage: Storage | null = safeStorage()): boolean {
  if (!storage) return false;
  try {
    save.version = SAVE_VERSION;
    save.lastPlayedAt = new Date().toISOString();
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export function resetSave(storage: Storage | null = safeStorage()): SaveData {
  const save = defaultSave();
  writeSave(save, storage);
  return save;
}

export function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__loira_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}
