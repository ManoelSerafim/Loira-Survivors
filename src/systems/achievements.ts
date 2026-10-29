import type { AchievementContext, AchievementDef, SaveData } from '../core/types';
import { ACHIEVEMENTS } from '../data/achievements';

export interface UnlockedAchievement {
  def: AchievementDef;
  reward: number;
}

export class AchievementService {
  constructor(
    private save: SaveData,
    private onUnlock: (unlocked: UnlockedAchievement) => void,
    private persist: () => void,
  ) {}

  setSave(save: SaveData): void {
    this.save = save;
  }

  get unlockedCount(): number {
    return Object.keys(this.save.achievements).length;
  }

  check(ctx?: Partial<AchievementContext>): UnlockedAchievement[] {
    const context: AchievementContext = { save: this.save, run: ctx?.run };
    const unlocked: UnlockedAchievement[] = [];
    for (const achievement of ACHIEVEMENTS) {
      if (this.save.achievements[achievement.id]) continue;
      let achieved = false;
      try {
        achieved = achievement.check(context);
      } catch {
        achieved = false;
      }
      if (!achieved) continue;
      this.save.achievements[achievement.id] = { unlockedAt: new Date().toISOString() };
      this.save.permanentCoins += achievement.reward;
      const entry = { def: achievement, reward: achievement.reward };
      unlocked.push(entry);
      this.onUnlock(entry);
    }
    if (unlocked.length) {
      this.persist();
    }
    return unlocked;
  }
}
