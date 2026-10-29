import { Client, type Room } from 'colyseus.js';
import type { MultiplayerJoinResult, LobbySnapshot, MultiplayerStartConfig, RemotePlayerNetState } from './types';

interface JoinedPayload {
  roomId: string;
  roomCode: string;
  sessionId: string;
  hostSessionId: string;
  maxPlayers: number;
}

interface PlayersSnapshotPayload {
  players: RemotePlayerNetState[];
  elapsed: number;
}

interface RoomStartedPayload {
  seed: number;
  config?: MultiplayerStartConfig;
}

interface EnemySnapshotPayload {
  enemies: RemoteEnemyState[];
}

interface RemoteEnemyState {
  id: number;
  defId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dead: boolean;
  boss: boolean;
  elite: boolean;
  phase2: boolean;
}

interface RoomHostPayload {
  hostSessionId: string;
}

interface ErrorPayload {
  code: string;
  message: string;
}

export class MultiplayerClient {
  private readonly httpBase: string;
  private readonly wsBase: string;
  private readonly client: Client;
  private room: Room | null = null;
  private joinInfo: MultiplayerJoinResult | null = null;
  private lobby: LobbySnapshot | null = null;
  private joinedResolver: ((value: MultiplayerJoinResult) => void) | null = null;
  private joinedRejecter: ((reason?: unknown) => void) | null = null;

  onLobbyUpdate?: (snapshot: LobbySnapshot) => void;
  onRoomStarted?: (payload: RoomStartedPayload) => void;
  onPlayersSnapshot?: (payload: PlayersSnapshotPayload) => void;
  onHostChanged?: (hostSessionId: string) => void;
  onEnemySnapshot?: (payload: EnemySnapshotPayload) => void;
  onRunEnded?: (victory: boolean) => void;
  onError?: (message: string, code?: string) => void;
  onLeave?: () => void;

  constructor(baseUrl = (import.meta.env.VITE_MULTIPLAYER_URL as string | undefined) ?? 'http://localhost:2567') {
    const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.httpBase = normalized;
    this.wsBase = normalized.replace(/^http/, 'ws');
    this.client = new Client(this.wsBase);
  }

  get connected(): boolean {
    return !!this.room;
  }

  get sessionId(): string {
    return this.joinInfo?.sessionId ?? '';
  }

  get roomCode(): string {
    return this.joinInfo?.roomCode ?? '';
  }

  get hostSessionId(): string {
    return this.joinInfo?.hostSessionId ?? this.lobby?.hostSessionId ?? '';
  }

  get isHost(): boolean {
    return !!this.sessionId && this.sessionId === this.hostSessionId;
  }

  get lobbySnapshot(): LobbySnapshot | null {
    return this.lobby;
  }

  async createRoom(nickname: string, characterFrame: number): Promise<MultiplayerJoinResult> {
    const room = await this.client.create('coop_room', { nickname, characterFrame });
    return this.attachRoom(room);
  }

  async joinByCode(roomCode: string, nickname: string, characterFrame: number): Promise<MultiplayerJoinResult> {
    const response = await fetch(`${this.httpBase}/api/rooms/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode }),
    });
    const body = (await response.json()) as { ok: boolean; roomId?: string; error?: string };
    if (!response.ok || !body.ok || !body.roomId) {
      throw new Error(body.error === 'ROOM_NOT_FOUND_OR_STARTED' ? 'Sala nao encontrada ou partida ja iniciada.' : 'Nao foi possivel localizar a sala.');
    }
    const room = await this.client.joinById(body.roomId, { nickname, characterFrame });
    return this.attachRoom(room);
  }

  leave(): void {
    const room = this.room;
    this.room = null;
    this.joinInfo = null;
    this.lobby = null;
    if (!room) return;
    room.leave(true).catch(() => undefined);
  }

  startRoom(config: MultiplayerStartConfig): void {
    if (!this.room) return;
    this.room.send('room:start', config);
  }

  sendMove(input: { x: number; y: number; facing: number; anim: 'idle' | 'walk' }): void {
    this.room?.send('player:move', input);
  }

  sendPlayerDead(): void {
    this.room?.send('player:dead', {});
  }

  sendEnemyHit(enemyId: number, damage: number, nonce: string): void {
    this.room?.send('enemy:hit', { enemyId, damage, nonce });
  }

  sendEnemySync(payload: EnemySnapshotPayload): void {
    this.room?.send('enemy:sync', payload);
  }

  sendRunEnd(victory: boolean): void {
    this.room?.send('run:end', { victory });
  }

  private attachRoom(room: Room): Promise<MultiplayerJoinResult> {
    this.room = room;
    const joined = new Promise<MultiplayerJoinResult>((resolve, reject) => {
      this.joinedResolver = resolve;
      this.joinedRejecter = reject;
    });

    room.onLeave(() => {
      if (this.joinedRejecter) {
        this.joinedRejecter(new Error('Conexao encerrada antes de concluir o ingresso na sala.'));
        this.joinedResolver = null;
        this.joinedRejecter = null;
      }
      this.room = null;
      this.joinInfo = null;
      this.lobby = null;
      this.onLeave?.();
    });

    room.onMessage('room:joined', (payload: JoinedPayload) => {
      this.joinInfo = {
        roomId: payload.roomId,
        roomCode: payload.roomCode,
        sessionId: payload.sessionId,
        hostSessionId: payload.hostSessionId,
        maxPlayers: payload.maxPlayers,
      };
      if (this.joinedResolver) {
        this.joinedResolver(this.joinInfo);
        this.joinedResolver = null;
        this.joinedRejecter = null;
      }
    });

    room.onMessage('lobby:update', (payload: LobbySnapshot) => {
      this.lobby = payload;
      if (this.joinInfo) {
        this.joinInfo.hostSessionId = payload.hostSessionId;
      }
      this.onLobbyUpdate?.(payload);
    });

    room.onMessage('players:snapshot', (payload: PlayersSnapshotPayload) => {
      this.onPlayersSnapshot?.(payload);
    });

    room.onMessage('room:started', (payload: RoomStartedPayload) => {
      this.onRoomStarted?.(payload);
    });

    room.onMessage('room:host', (payload: RoomHostPayload) => {
      if (this.joinInfo) this.joinInfo.hostSessionId = payload.hostSessionId;
      this.onHostChanged?.(payload.hostSessionId);
    });

    room.onMessage('enemy:snapshot', (payload: EnemySnapshotPayload) => {
      this.onEnemySnapshot?.(payload);
    });

    room.onMessage('run:end', (payload: { victory: boolean }) => {
      this.onRunEnded?.(!!payload?.victory);
    });

    room.onMessage('error', (payload: ErrorPayload) => {
      if (this.joinedRejecter) {
        this.joinedRejecter(new Error(payload.message ?? 'Erro de conexao.'));
        this.joinedResolver = null;
        this.joinedRejecter = null;
      }
      this.onError?.(payload.message ?? 'Erro de conexao.', payload.code);
    });

    return joined;
  }
}
