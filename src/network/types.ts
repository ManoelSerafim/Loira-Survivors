import type { RegionId, DifficultyId, CharacterId, WeaponId } from '../core/types';

export interface MultiplayerPlayerInfo {
  sessionId: string;
  nickname: string;
  status: 'alive' | 'dead' | 'disconnected';
  characterFrame: number;
}

export interface LobbySnapshot {
  roomCode: string;
  hostSessionId: string;
  started: boolean;
  maxPlayers: number;
  players: MultiplayerPlayerInfo[];
}

export interface MultiplayerJoinResult {
  roomId: string;
  roomCode: string;
  sessionId: string;
  hostSessionId: string;
  maxPlayers: number;
}

export interface MultiplayerStartConfig {
  regionId: RegionId;
  difficulty: DifficultyId;
  characterId: CharacterId;
  loadout: WeaponId[];
}

export interface RemotePlayerNetState {
  sessionId: string;
  nickname?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  anim: 'idle' | 'walk';
  hp: number;
  maxHp: number;
  status: 'alive' | 'dead' | 'disconnected';
  characterFrame: number;
}
