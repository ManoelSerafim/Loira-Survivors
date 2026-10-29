import type {
  DifficultyId,
  LoiraDef,
  MetaEffectSummary,
  RegionId,
  RunSummary,
  SaveData,
  WeaponId,
} from '../core/types';
import { getDifficulty, getNextRegion, getRegion, REGIONS } from '../data/regions';
import { META_UPGRADES } from '../data/meta';
import { resolveEnding, ENDINGS } from '../data/endings';
import { chooseLoira, LOIRA_MAP } from '../data/loiras';
import { Rng } from '../core/rng';

export const REGION_WEAPON_UNLOCK: Partial<Record<RegionId, WeaponId>> = {
  brasil: 'pix',
  aeroporto: 'mochila',
  atlantico: 'carisma',
  europa: 'passaporte',
  portugal: 'combo',
};

export function metaLevel(save: SaveData, id: string): number {
  return Math.max(0, Math.min(9, Math.floor(save.meta[id] ?? 0)));
}

export function getMetaEffects(save: SaveData): MetaEffectSummary {
  const lvl = (id: string) => metaLevel(save, id);
  return {
    damage: lvl('treinamento') * 0.04,
    maxHp: lvl('condicionamento') * 0.06,
    moveSpeed: lvl('corrida') * 0.03,
    luck: lvl('sorte') * 6,
    xpGain: lvl('experiencia') * 0.05,
    armor: lvl('preparacao'),
    revives: lvl('determinacao'),
    coinConversion: lvl('financeiro'),
    eventMultiplier: lvl('networking') * 0.12,
    durationMult: 1 - lvl('passagem') * 0.03,
    conquestScore: lvl('charme') * 0.08,
    coinGain: 0,
  };
}

export function isDifficultyUnlocked(save: SaveData, difficulty: DifficultyId): boolean {
  if (difficulty === 'normal') return true;
  if (difficulty === 'dificil') return save.clearedRegions.includes('brasil');
  return save.stats.portugalWins >= 1;
}

export function isRegionUnlocked(save: SaveData, regionId: RegionId): boolean {
  return save.unlockedRegions.includes(regionId);
}

export function computeScore(summary: Omit<RunSummary, 'score' | 'endingId' | 'loiraId'>, save: SaveData): number {
  const diffIndex = summary.config.difficulty === 'normal' ? 0 : summary.config.difficulty === 'dificil' ? 1 : 2;
  const base = summary.victory ? 700 : 150;
  const raw =
    base +
    summary.kills * 1.5 +
    summary.level * 30 +
    summary.coins * 1.2 +
    (summary.bossDefeated ? 450 : summary.bossKills * 120) +
    summary.challengesCompleted * 300 +
    (summary.noHit ? 250 : 0) +
    (summary.lowHpMoment ? 100 : 0) +
    diffIndex * 250 +
    summary.hpRatio * 200 +
    (summary.config.regionId === 'portugal' ? 300 : 0);
  const charm = 1 + getMetaEffects(save).conquestScore;
  return Math.max(0, Math.round(raw * charm));
}

export interface RewardBreakdown {
  coinsCollected: number;
  conversionRate: number;
  convertedCoins: number;
  clearBonus: number;
  bossBonus: number;
  firstClearBonus: number;
  total: number;
  firstClear: boolean;
  unlockedRegion: RegionId | null;
  unlockedWeapon: WeaponId | null;
  isNewLoira: boolean;
  loira: LoiraDef | null;
  endingName: string;
}

export interface CommitResult extends RewardBreakdown {
  newAchievements: string[];
}

export function determineLoira(summary: RunSummary, save: SaveData, seed = Date.now()): LoiraDef | null {
  if (!summary.victory || summary.config.regionId !== 'portugal') return null;
  if (summary.endingId === 'amigo_portugal') return null;
  const rng = new Rng(seed);
  return chooseLoira(summary, save, rng.random.bind(rng));
}

export function finalizeSummary(summary: RunSummary, save: SaveData, seed = Date.now()): RunSummary {
  const score = computeScore(summary, save);
  summary.score = score;
  summary.loiraId = null;
  const ending = resolveEnding(summary, save);
  summary.endingId = ending ? ending.id : '';
  return summary;
}

export function commitRun(save: SaveData, summary: RunSummary, rng: Rng): CommitResult {
  const stats = save.stats;
  const region = getRegion(summary.config.regionId);
  const difficulty = getDifficulty(summary.config.difficulty);
  const meta = getMetaEffects(save);
  const wasCleared = save.clearedRegions.includes(region.id);
  const firstClear = summary.victory && !wasCleared;

  const conversionBase = summary.victory ? 1 : 0.3;
  const conversionExtra = summary.victory ? meta.coinConversion * 0.04 : meta.coinConversion * 0.06;
  const conversionRate = Math.min(2, conversionBase + conversionExtra);
  const convertedCoins = Math.floor(summary.coins * conversionRate);
  const clearBonus = summary.victory
    ? Math.round(region.clearReward * difficulty.reward * (firstClear ? 1.5 : 1))
    : 0;
  const bossBonus = summary.bossDefeated ? 20 + region.order * 12 : 0;
  const firstClearBonus = firstClear ? 40 + region.order * 15 : 0;

  let loira: LoiraDef | null = null;
  let isNewLoira = false;
  if (summary.victory && region.id === 'portugal' && summary.endingId !== 'amigo_portugal') {
    loira = chooseLoira(summary, save, rng.random.bind(rng));
    if (loira) {
      summary.loiraId = loira.id;
      stats.conquests += 1;
      if (!save.album[loira.id]) {
        isNewLoira = true;
        save.album[loira.id] = {
          loiraId: loira.id,
          conqueredAt: new Date().toISOString(),
          order: Object.keys(save.album).length + 1,
          endingId: summary.endingId,
          difficulty: summary.config.difficulty,
        };
      }
    }
  }

  if (summary.endingId) {
    const ending = ENDINGS.find((candidate) => candidate.id === summary.endingId);
    if (ending) {
      save.endings[ending.id] = {
        count: (save.endings[ending.id]?.count ?? 0) + 1,
        firstAt: save.endings[ending.id]?.firstAt ?? new Date().toISOString(),
      };
      if (ending.id === 'casanova_imortal') stats.secretEndings += 1;
    }
  }

  stats.runsFinished += 1;
  stats.totalTimePlayed += Math.max(0, summary.time);
  stats.totalKills += Math.max(0, summary.kills);
  stats.bossKills += Math.max(0, summary.bossKills);
  stats.coinsCollected += Math.max(0, summary.coins);
  stats.upgradesChosen += Math.max(0, summary.upgrades);
  stats.bestTime = Math.max(stats.bestTime, summary.time);
  stats.bestLevel = Math.max(stats.bestLevel, summary.level);
  if (summary.maxWeaponLevel >= 6) save.flags['weaponMaxed'] = 1;

  if (summary.victory) {
    stats.runsWon += 1;
    stats.winStreak += 1;
    stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.winStreak);
    if (!wasCleared) save.clearedRegions.push(region.id);
    if (!save.bestTimes[region.id] || summary.time < (save.bestTimes[region.id] ?? Infinity)) {
      save.bestTimes[region.id] = summary.time;
    }
    if (summary.noHit) stats.noHitWins += 1;
    if (summary.lowHpMoment) stats.lowHpWins += 1;
    if (region.id === 'atlantico' && summary.config.difficulty === 'lendaria') stats.legendaryAtlantico += 1;

    const next = getNextRegion(region.id);
    if (next && !save.unlockedRegions.includes(next.id)) {
      save.unlockedRegions.push(next.id);
    }
    const weaponUnlock = REGION_WEAPON_UNLOCK[region.id];
    if (weaponUnlock && !save.unlockedWeapons.includes(weaponUnlock)) {
      save.unlockedWeapons.push(weaponUnlock);
    }

    if (region.id === 'portugal') stats.portugalWins += 1;
  } else {
    stats.deaths += 1;
    stats.winStreak = 0;
  }

  const total = convertedCoins + clearBonus + bossBonus + firstClearBonus;
  save.permanentCoins += total;
  stats.tempCoinsBanked += convertedCoins;
  save.lastPlayedAt = new Date().toISOString();

  return {
    coinsCollected: summary.coins,
    conversionRate,
    convertedCoins,
    clearBonus,
    bossBonus,
    firstClearBonus,
    total,
    firstClear,
    unlockedRegion: firstClear ? getNextRegion(region.id)?.id ?? null : null,
    unlockedWeapon: summary.victory ? REGION_WEAPON_UNLOCK[region.id] ?? null : null,
    isNewLoira,
    loira,
    endingName: summary.endingId ? ENDINGS.find((e) => e.id === summary.endingId)?.name ?? '' : '',
    newAchievements: [],
  };
}

export function registerRunStart(save: SaveData, regionId: RegionId): void {
  save.stats.runsStarted += 1;
  save.lastPlayedAt = new Date().toISOString();
  if (regionId === 'portugal') save.stats.portugalReaches += 1;
}

export function nextRegionSuggestion(save: SaveData): RegionId {
  const unlocked = REGIONS.filter((region) => save.unlockedRegions.includes(region.id));
  const next = [...unlocked].reverse().find((region) => !save.clearedRegions.includes(region.id));
  return next?.id ?? unlocked[unlocked.length - 1]?.id ?? 'brasil';
}

export function albumCount(save: SaveData): number {
  return Object.keys(save.album).filter((id) => LOIRA_MAP[id]).length;
}

export function totalMetaLevel(save: SaveData): number {
  return META_UPGRADES.reduce((sum, upgrade) => sum + metaLevel(save, upgrade.id), 0);
}
