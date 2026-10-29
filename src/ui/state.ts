import type { AchievementDef, CharacterId, DifficultyId, RegionId, WeaponId } from '../core/types';

export type ScreenId =
  | 'menu'
  | 'multiplayer'
  | 'character'
  | 'journey'
  | 'game'
  | 'results'
  | 'shop'
  | 'tree'
  | 'achievements'
  | 'stats'
  | 'album'
  | 'arsenal'
  | 'settings';

export interface Selection {
  characterId: CharacterId;
  regionId: RegionId;
  difficulty: DifficultyId;
  loadout: WeaponId[];
}

export type AchievementFilter = 'all' | AchievementDef['category'];

export const SCREEN_BACK: Partial<Record<ScreenId, ScreenId>> = {
  multiplayer: 'menu',
  character: 'menu',
  journey: 'character',
  shop: 'menu',
  tree: 'menu',
  achievements: 'menu',
  stats: 'menu',
  album: 'menu',
  arsenal: 'menu',
  settings: 'menu',
  results: 'menu',
};
