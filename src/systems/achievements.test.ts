import { describe, expect, it, vi } from 'vitest';
import type { RunSnapshot } from '../core/types';
import { ACHIEVEMENTS, achievementProgress } from '../data/achievements';
import { makeSave } from '../test/factories';
import { AchievementService } from './achievements';

function snapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    regionId: 'brasil',
    difficulty: 'normal',
    kills: 0,
    level: 1,
    coins: 0,
    bossKills: 0,
    hpRatio: 1,
    noHit: true,
    challenges: 0,
    ...overrides,
  };
}

describe('achievements', () => {
  it('unlocks once, pays the reward once and persists', () => {
    const save = makeSave();
    const onUnlock = vi.fn();
    const persist = vi.fn();
    const service = new AchievementService(save, onUnlock, persist);

    save.stats.totalKills = 1;
    const unlocked = service.check({ run: snapshot({ kills: 1 }) });
    expect(unlocked.map((entry) => entry.def.id)).toContain('primeiro_sangue');
    expect(save.achievements.primeiro_sangue).toBeDefined();
    expect(save.permanentCoins).toBe(25);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(service.unlockedCount).toBe(1);

    const second = service.check({ run: snapshot({ kills: 1 }) });
    expect(second).toEqual([]);
    expect(save.permanentCoins).toBe(25);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('reads achievements from a live run even before the save is updated', () => {
    const save = makeSave();
    const service = new AchievementService(save, vi.fn(), vi.fn());
    const unlocked = service.check({ run: snapshot({ kills: 3, bossKills: 1 }) });
    expect(unlocked.map((entry) => entry.def.id)).toEqual(expect.arrayContaining(['primeiro_sangue', 'sem_medo']));
    expect(save.stats.totalKills).toBe(0);
    expect(save.stats.bossKills).toBe(0);
  });

  it('ignores an achievement that throws and does not block the others', () => {
    const save = makeSave();
    const dangerous = ACHIEVEMENTS.find((achievement) => achievement.id === 'primeiro_sangue');
    expect(dangerous).toBeDefined();
    if (!dangerous) return;
    const original = dangerous.check;
    dangerous.check = () => {
      throw new Error('quebrou');
    };
    try {
      save.stats.runsWon = 1;
      const service = new AchievementService(save, vi.fn(), vi.fn());
      const unlocked = service.check();
      expect(unlocked.map((entry) => entry.def.id)).toContain('sobrevivente');
      expect(unlocked.map((entry) => entry.def.id)).not.toContain('primeiro_sangue');
    } finally {
      dangerous.check = original;
    }
  });

  it('reports progress and completed state without paying twice', () => {
    const save = makeSave();
    const first = ACHIEVEMENTS.find((achievement) => achievement.id === 'primeiro_sangue');
    const marathon = ACHIEVEMENTS.find((achievement) => achievement.id === 'maratonista');
    expect(first).toBeDefined();
    expect(marathon).toBeDefined();
    if (!first || !marathon) return;

    expect(achievementProgress(first, { save })).toEqual({ current: 0, target: 1, unlocked: false });
    save.stats.totalKills = 3;
    expect(achievementProgress(first, { save })).toEqual({ current: 1, target: 1, unlocked: false });
    save.achievements.primeiro_sangue = { unlockedAt: '2026-01-01T00:00:00.000Z' };
    expect(achievementProgress(first, { save })).toEqual({ current: 1, target: 1, unlocked: true });

    save.stats.totalTimePlayed = 3600;
    const service = new AchievementService(save, vi.fn(), vi.fn());
    const unlocked = service.check();
    expect(unlocked.map((entry) => entry.def.id)).toContain('maratonista');
  });

  it('can switch the save instance after a reset', () => {
    const first = makeSave();
    const second = makeSave();
    second.stats.totalKills = 2;
    const service = new AchievementService(first, vi.fn(), vi.fn());
    service.setSave(second);
    const unlocked = service.check();
    expect(unlocked.map((entry) => entry.def.id)).toContain('primeiro_sangue');
    expect(second.achievements.primeiro_sangue).toBeDefined();
    expect(first.achievements.primeiro_sangue).toBeUndefined();
  });
});
