import type { CharacterId } from '../core/types';

export const WORLD_PADDING = 44;
export const ENEMY_PADDING = 30;
export const PLAYER_RADIUS = 17;
export const MAX_ENEMIES = 180;
export const SPECIAL_COOLDOWN = 12;
export const REROLL_COST = 15;
export const LEVELUP_REROLL_COST = REROLL_COST;

export const CHARACTER_FRAME: Record<CharacterId, number> = {
  heroi: 0,
  mochileiro: 1,
  tatico: 2,
  casual: 3,
};
