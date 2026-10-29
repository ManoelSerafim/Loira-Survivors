import { describe, expect, it } from 'vitest';
import type { RunSummary } from '../core/types';
import { Rng } from '../core/rng';
import { ENDINGS, resolveEnding } from '../data/endings';
import { LOIRAS, chooseLoira, eligibleLoiras } from '../data/loiras';
import { getRegion } from '../data/regions';
import { makeSave, makeSummary } from '../test/factories';
import {
  REGION_WEAPON_UNLOCK,
  albumCount,
  commitRun,
  computeScore,
  determineLoira,
  finalizeSummary,
  getMetaEffects,
  isDifficultyUnlocked,
  nextRegionSuggestion,
  registerRunStart,
} from './progression';

function portugalSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return makeSummary({
    config: {
      regionId: 'portugal',
      difficulty: 'normal',
      characterId: 'heroi',
      loadout: ['chinelo', 'mala'],
    },
    victory: true,
    time: 180,
    duration: 180,
    bossDefeated: true,
    bossKills: 1,
    coins: 0,
    level: 10,
    hpRatio: 0.5,
    ...overrides,
  });
}

describe('run registration and unlocks', () => {
  it('counts starts and Portugal arrivals', () => {
    const save = makeSave();
    registerRunStart(save, 'brasil');
    registerRunStart(save, 'portugal');
    expect(save.stats.runsStarted).toBe(2);
    expect(save.stats.portugalReaches).toBe(1);
    expect(save.lastPlayedAt).toBeTruthy();
  });

  it('unlocks difficulties from real clears and Portugal wins', () => {
    const save = makeSave();
    expect(isDifficultyUnlocked(save, 'normal')).toBe(true);
    expect(isDifficultyUnlocked(save, 'dificil')).toBe(false);
    expect(isDifficultyUnlocked(save, 'lendaria')).toBe(false);

    save.clearedRegions.push('brasil');
    expect(isDifficultyUnlocked(save, 'dificil')).toBe(true);
    expect(isDifficultyUnlocked(save, 'lendaria')).toBe(false);

    save.stats.portugalWins = 1;
    expect(isDifficultyUnlocked(save, 'lendaria')).toBe(true);
  });

  it('suggests the next uncleared region', () => {
    const save = makeSave();
    expect(nextRegionSuggestion(save)).toBe('brasil');

    save.unlockedRegions.push('aeroporto');
    save.clearedRegions.push('brasil');
    expect(nextRegionSuggestion(save)).toBe('aeroporto');

    save.unlockedRegions = ['brasil', 'aeroporto', 'atlantico', 'europa', 'portugal'];
    save.clearedRegions = ['brasil', 'aeroporto', 'atlantico', 'europa'];
    expect(nextRegionSuggestion(save)).toBe('portugal');

    save.clearedRegions.push('portugal');
    expect(nextRegionSuggestion(save)).toBe('portugal');
  });

  it('derives rewards from permanent upgrades', () => {
    const save = makeSave();
    save.meta.passagem = 2;
    save.meta.financeiro = 3;
    const meta = getMetaEffects(save);
    expect(meta.durationMult).toBeCloseTo(0.94);
    expect(meta.coinConversion).toBe(3);
    expect(meta.damage).toBe(0);
  });
});

describe('scoring and endings', () => {
  it('rewards harder, cleaner and longer runs', () => {
    const base = computeScore(makeSummary(), makeSave());
    const victory = computeScore(makeSummary({ victory: true }), makeSave());
    const risky = computeScore(makeSummary({ noHit: true, lowHpMoment: true, bossDefeated: true }), makeSave());
    const hard = computeScore(
      makeSummary({ config: { ...makeSummary().config, difficulty: 'lendaria' } }),
      makeSave(),
    );
    expect(victory).toBeGreaterThan(base);
    expect(risky).toBeGreaterThan(base);
    expect(hard).toBeGreaterThan(base);
  });

  it('finalizes Portugal runs with an ending and a score', () => {
    const summary = portugalSummary();
    finalizeSummary(summary, makeSave(), 4);
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.endingId).not.toBe('');
  });

  it('resolves the expected ending tier', () => {
    const save = makeSave();
    const endingId = (summary: RunSummary): string => {
      const ending = resolveEnding(summary, save);
      return typeof ending === 'string' ? ending : ending.id;
    };
    expect(endingId(makeSummary())).toBe('');
    expect(endingId(portugalSummary({ victory: false }))).toBe('amigo_portugal');
    expect(endingId(portugalSummary({ score: 500 }))).toBe('amigo_portugal');
    expect(endingId(portugalSummary({ score: 1500 }))).toBe('primeiro_encontro');
    expect(endingId(portugalSummary({ score: 2500 }))).toBe('coracao_conquistado');
    expect(
      endingId(portugalSummary({ score: 3300, config: { ...portugalSummary().config, difficulty: 'dificil' } })),
    ).toBe('lenda_romantica');
    expect(
      endingId(
        portugalSummary({
          score: 3500,
          config: { ...portugalSummary().config, difficulty: 'lendaria' },
          bossDefeated: true,
          challengesCompleted: 2,
          hpRatio: 0.5,
        }),
      ),
    ).toBe('casanova_imortal');
    expect(ENDINGS).toHaveLength(5);
  });

  it('only chooses a loira for victorious Portugal runs', () => {
    const save = makeSave();
    expect(determineLoira(makeSummary({ victory: true }), save, 1)).toBeNull();
    expect(determineLoira(portugalSummary({ endingId: 'amigo_portugal' }), save, 1)).toBeNull();

    const ana = determineLoira(portugalSummary({ level: 5, hpRatio: 0.5, coins: 0, bossDefeated: false }), save, 1);
    expect(ana?.id).toBe('ana');
    expect(ana?.check(portugalSummary(), save)).toBe(true);
  });

  it('prefers unowned loiras and counts album entries', () => {
    const save = makeSave();
    const summary = portugalSummary({ hpRatio: 0.9, level: 20 });
    const eligible = eligibleLoiras(summary, save);
    expect(eligible.map((loira) => loira.id)).toEqual(expect.arrayContaining(['ana', 'sofia']));

    save.album.ana = {
      loiraId: 'ana',
      conqueredAt: '2026-01-01T00:00:00.000Z',
      order: 1,
      endingId: 'primeiro_encontro',
      difficulty: 'normal',
    };
    const chosen = chooseLoira(summary, save, () => 0);
    expect(chosen?.id).toBe('sofia');
    expect(albumCount(save)).toBe(1);

    save.album.falsa = {
      loiraId: 'falsa',
      conqueredAt: '2026-01-01T00:00:00.000Z',
      order: 2,
      endingId: '',
      difficulty: 'normal',
    };
    expect(albumCount(save)).toBe(1);
    expect(LOIRAS).toHaveLength(6);
  });
});

describe('run rewards', () => {
  it('pays first-clear rewards, unlocks the route and the region weapon', () => {
    const save = makeSave();
    const summary = makeSummary({
      victory: true,
      time: 100,
      coins: 100,
      bossKills: 1,
      bossDefeated: true,
      noHit: true,
      maxWeaponLevel: 6,
    });
    const result = commitRun(save, summary, new Rng(1));

    expect(result.firstClear).toBe(true);
    expect(result.convertedCoins).toBe(100);
    expect(result.clearBonus).toBe(120);
    expect(result.bossBonus).toBe(32);
    expect(result.firstClearBonus).toBe(55);
    expect(result.total).toBe(307);
    expect(result.unlockedRegion).toBe('aeroporto');
    expect(result.unlockedWeapon).toBe('pix');
    expect(save.permanentCoins).toBe(307);
    expect(save.stats.runsFinished).toBe(1);
    expect(save.stats.runsWon).toBe(1);
    expect(save.stats.winStreak).toBe(1);
    expect(save.stats.maxWinStreak).toBe(1);
    expect(save.stats.noHitWins).toBe(1);
    expect(save.stats.bestTime).toBe(100);
    expect(save.stats.bestLevel).toBe(5);
    expect(save.stats.coinsCollected).toBe(100);
    expect(save.stats.tempCoinsBanked).toBe(100);
    expect(save.clearedRegions).toEqual(['brasil']);
    expect(save.unlockedRegions).toContain('aeroporto');
    expect(save.unlockedWeapons).toContain('pix');
    expect(save.bestTimes.brasil).toBe(100);
    expect(save.flags.weaponMaxed).toBe(1);
  });

  it('pays reduced rewards on a repeated clear without duplicating unlocks', () => {
    const save = makeSave();
    const first = makeSummary({ victory: true, time: 90, coins: 100, bossDefeated: true });
    commitRun(save, first, new Rng(1));

    const again = makeSummary({ victory: true, time: 80, coins: 100, bossDefeated: true });
    const result = commitRun(save, again, new Rng(2));
    expect(result.firstClear).toBe(false);
    expect(result.clearBonus).toBe(80);
    expect(result.firstClearBonus).toBe(0);
    expect(result.total).toBe(212);
    expect(save.permanentCoins).toBe(519);
    expect(save.clearedRegions).toEqual(['brasil']);
    expect(save.stats.runsWon).toBe(2);
    expect(save.stats.winStreak).toBe(2);
    expect(save.stats.maxWinStreak).toBe(2);
    expect(save.bestTimes.brasil).toBe(80);
    expect(save.unlockedRegions.filter((id) => id === 'aeroporto')).toHaveLength(1);
    expect(save.unlockedWeapons.filter((id) => id === 'pix')).toHaveLength(1);
  });

  it('converts a third of the coins after defeat', () => {
    const save = makeSave();
    const summary = makeSummary({ victory: false, coins: 100, time: 30 });
    const result = commitRun(save, summary, new Rng(1));
    expect(result.convertedCoins).toBe(30);
    expect(result.total).toBe(30);
    expect(result.firstClear).toBe(false);
    expect(result.unlockedRegion).toBeNull();
    expect(result.unlockedWeapon).toBeNull();
    expect(save.stats.runsFinished).toBe(1);
    expect(save.stats.deaths).toBe(1);
    expect(save.stats.winStreak).toBe(0);
    expect(save.clearedRegions).toEqual([]);
    expect(save.permanentCoins).toBe(30);
  });

  it('records a Portugal victory, its ending and a new loira', () => {
    const save = makeSave();
    const summary = portugalSummary({ endingId: 'primeiro_encontro', score: 1700 });
    const result = commitRun(save, summary, new Rng(9));

    expect(result.isNewLoira).toBe(true);
    expect(result.loira).not.toBeNull();
    expect(result.endingName).toBe('Primeiro Encontro');
    expect(save.stats.portugalWins).toBe(1);
    expect(save.stats.conquests).toBe(1);
    expect(save.stats.runsWon).toBe(1);
    expect(Object.keys(save.album)).toHaveLength(1);
    expect(save.endings.primeiro_encontro?.count).toBe(1);
    expect(save.clearedRegions).toContain('portugal');
    expect(save.unlockedWeapons).toContain('combo');
    expect(save.bestTimes.portugal).toBe(180);
    expect(result.unlockedRegion).toBeNull();
    expect(result.unlockedWeapon).toBe('combo');
  });

  it('records secret endings and keeps their counters', () => {
    const save = makeSave();
    const summary = portugalSummary({
      endingId: 'casanova_imortal',
      score: 4000,
      config: { regionId: 'portugal', difficulty: 'lendaria', characterId: 'heroi', loadout: ['chinelo', 'mala'] },
      challengesCompleted: 2,
    });
    commitRun(save, summary, new Rng(1));
    expect(save.stats.secretEndings).toBe(1);
    expect(save.endings.casanova_imortal?.count).toBe(1);
    expect(save.stats.legendaryAtlantico).toBe(0);
  });

  it('unlocks every region weapon id through real data', () => {
    for (const region of Object.keys(REGION_WEAPON_UNLOCK)) {
      expect(REGION_WEAPON_UNLOCK[region as keyof typeof REGION_WEAPON_UNLOCK]).toBeTruthy();
    }
    const unlocked = new Set<string>();
    for (const weapon of Object.values(REGION_WEAPON_UNLOCK)) if (weapon) unlocked.add(weapon);
    expect(unlocked.size).toBe(5);
    expect(getRegion('portugal').bossId).toBe('guardiao_encontro');
  });
});
