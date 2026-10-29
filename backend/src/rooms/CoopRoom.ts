import { Room, Client } from 'colyseus';
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { findRoomByCode, generateRoomCode, normalizeRoomCode, registerRoom, removeRoom, setRoomStarted } from './registry.js';

const WORLD_WIDTH = 2600;
const WORLD_HEIGHT = 2000;
const WORLD_PADDING = 44;
const PLAYER_RADIUS = 17;
const MAX_PLAYERS = 4;
const MOVE_EPS = 0.0001;
const MAX_MOVE_SPEED = 520;

class EnemyState extends Schema {
  @type('number') id = 0;
  @type('string') defId = 'fiscal';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('number') hp = 1;
  @type('number') maxHp = 1;
  @type('boolean') dead = false;
  @type('boolean') boss = false;
  @type('boolean') elite = false;
  @type('boolean') phase2 = false;
}

class CoopPlayerState extends Schema {
  @type('string') sessionId = '';
  @type('string') nickname = '';
  @type('number') x = WORLD_WIDTH / 2;
  @type('number') y = WORLD_HEIGHT / 2;
  @type('number') vx = 0;
  @type('number') vy = 0;
  @type('number') facing = -Math.PI / 2;
  @type('string') anim = 'idle';
  @type('number') hp = 100;
  @type('number') maxHp = 100;
  @type('string') status = 'alive';
  @type('number') inputX = 0;
  @type('number') inputY = 0;
  @type('number') lastInputAt = 0;
  @type('number') characterFrame = 0;
}

class CoopRoomState extends Schema {
  @type('string') roomCode = '';
  @type('string') hostSessionId = '';
  @type('boolean') started = false;
  @type('number') elapsed = 0;
  @type({ map: CoopPlayerState }) players = new MapSchema<CoopPlayerState>();
  @type([EnemyState]) enemies = new ArraySchema<EnemyState>();
}

interface JoinOptions {
  nickname?: string;
  roomCode?: string;
  characterFrame?: number;
}

interface MoveInput {
  x: number;
  y: number;
  facing?: number;
  anim?: string;
  seq?: number;
}

interface HitEnemyInput {
  enemyId: number;
  damage: number;
  nonce: string;
}

interface StartRoomInput {
  regionId: string;
  difficulty: string;
  characterId: string;
  loadout: string[];
}

interface EnemySyncInput {
  enemies: Array<{
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
  }>;
}

export class CoopRoom extends Room<CoopRoomState> {
  maxClients = MAX_PLAYERS;
  private processedHits = new Set<string>();

  onCreate(options: JoinOptions): void {
    const state = new CoopRoomState();
    state.roomCode = generateRoomCode();
    this.setState(state);

    registerRoom({ roomId: this.roomId, roomCode: state.roomCode, started: false });

    this.onMessage('player:move', (client, payload: MoveInput) => {
      this.handleMove(client, payload);
    });

    this.onMessage('room:start', (client, payload: StartRoomInput) => {
      if (client.sessionId !== this.state.hostSessionId) {
        client.send('error', { code: 'NOT_HOST', message: 'Somente o anfitriao pode iniciar.' });
        return;
      }
      if (this.state.started) return;
      this.state.started = true;
      setRoomStarted(this.state.roomCode, true);
      this.state.elapsed = 0;
      this.broadcast('room:started', { seed: Date.now(), config: payload });
    });

    this.onMessage('enemy:sync', (client, payload: EnemySyncInput) => {
      if (client.sessionId !== this.state.hostSessionId || !this.state.started) return;
      if (!payload || !Array.isArray(payload.enemies)) return;

      this.state.enemies.splice(0, this.state.enemies.length);
      for (const incoming of payload.enemies.slice(0, 300)) {
        const enemy = new EnemyState();
        enemy.id = Math.max(1, Math.floor(incoming.id));
        enemy.defId = String(incoming.defId || 'fiscal');
        enemy.x = clamp(incoming.x, WORLD_PADDING, WORLD_WIDTH - WORLD_PADDING);
        enemy.y = clamp(incoming.y, WORLD_PADDING, WORLD_HEIGHT - WORLD_PADDING);
        enemy.maxHp = Math.max(1, incoming.maxHp);
        enemy.hp = clamp(incoming.hp, 0, enemy.maxHp);
        enemy.dead = !!incoming.dead;
        enemy.boss = !!incoming.boss;
        enemy.elite = !!incoming.elite;
        enemy.phase2 = !!incoming.phase2;
        this.state.enemies.push(enemy);
      }

      this.broadcast('enemy:snapshot', {
        enemies: [...this.state.enemies.values()].map((enemy) => ({
          id: enemy.id,
          defId: enemy.defId,
          x: enemy.x,
          y: enemy.y,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          dead: enemy.dead,
          boss: enemy.boss,
          elite: enemy.elite,
          phase2: enemy.phase2,
        })),
      });
    });

    this.onMessage('enemy:hit', (client, payload: HitEnemyInput) => {
      this.handleEnemyHit(client, payload);
    });

    this.onMessage('player:dead', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.status = 'dead';
      this.broadcast('player:status', { sessionId: client.sessionId, status: 'dead' });
    });

    this.onMessage('run:end', (client, payload: { victory: boolean }) => {
      if (client.sessionId !== this.state.hostSessionId) return;
      this.broadcast('run:end', { victory: !!payload?.victory });
      this.state.started = false;
      setRoomStarted(this.state.roomCode, false);
    });

    this.setSimulationInterval((dtMs) => {
      const dt = dtMs / 1000;
      if (this.state.started) this.state.elapsed += dt;
      this.stepPlayers(dt);
      this.broadcast('players:snapshot', {
        players: [...this.state.players.values()].map((player) => ({
          sessionId: player.sessionId,
          nickname: player.nickname,
          x: player.x,
          y: player.y,
          vx: player.vx,
          vy: player.vy,
          facing: player.facing,
          anim: player.anim,
          hp: player.hp,
          maxHp: player.maxHp,
          status: player.status,
          characterFrame: player.characterFrame,
        })),
        elapsed: this.state.elapsed,
      });
      this.cleanupHitCache();
    }, 1000 / 20);
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<boolean> {
    if (!options.nickname || !options.nickname.trim()) return false;
    return true;
  }

  onJoin(client: Client, options: JoinOptions): void {
    if (this.state.started) {
      client.send('error', { code: 'STARTED', message: 'A partida ja comecou.' });
      client.leave(4003);
      return;
    }

    const nickname = options.nickname!.trim().slice(0, 18);
    const player = new CoopPlayerState();
    player.sessionId = client.sessionId;
    player.nickname = nickname;
    player.characterFrame = clampInt(options.characterFrame ?? 0, 0, 3);
    player.x = WORLD_WIDTH / 2 + this.clients.length * 24;
    player.y = WORLD_HEIGHT / 2;
    this.state.players.set(client.sessionId, player);

    if (!this.state.hostSessionId) {
      this.state.hostSessionId = client.sessionId;
    }

    client.send('room:joined', {
      roomId: this.roomId,
      roomCode: this.state.roomCode,
      sessionId: client.sessionId,
      hostSessionId: this.state.hostSessionId,
      maxPlayers: MAX_PLAYERS,
    });

    this.broadcast('lobby:update', this.serializeLobby(), { except: client });
    client.send('lobby:update', this.serializeLobby());
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);

    if (this.state.hostSessionId === client.sessionId) {
      const nextHost = this.clients[0]?.sessionId ?? '';
      this.state.hostSessionId = nextHost;
      this.broadcast('room:host', { hostSessionId: nextHost });
    }

    this.broadcast('lobby:update', this.serializeLobby());
  }

  onDispose(): void {
    removeRoom(this.state.roomCode);
  }

  private stepPlayers(dt: number): void {
    for (const player of this.state.players.values()) {
      if (player.status !== 'alive') continue;
      const mag = Math.hypot(player.inputX, player.inputY);
      if (mag > MOVE_EPS) {
        const nx = player.inputX / Math.max(1, mag);
        const ny = player.inputY / Math.max(1, mag);
        player.vx = nx * MAX_MOVE_SPEED;
        player.vy = ny * MAX_MOVE_SPEED;
        player.anim = 'walk';
      } else {
        player.vx *= Math.max(0, 1 - 9 * dt);
        player.vy *= Math.max(0, 1 - 9 * dt);
        if (Math.abs(player.vx) < 3 && Math.abs(player.vy) < 3) {
          player.vx = 0;
          player.vy = 0;
          player.anim = 'idle';
        }
      }

      player.x = clamp(player.x + player.vx * dt, WORLD_PADDING, WORLD_WIDTH - WORLD_PADDING);
      player.y = clamp(player.y + player.vy * dt, WORLD_PADDING, WORLD_HEIGHT - WORLD_PADDING);
    }
  }

  private handleMove(client: Client, payload: MoveInput): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.status !== 'alive') return;

    const x = Number.isFinite(payload.x) ? clamp(payload.x, -1, 1) : 0;
    const y = Number.isFinite(payload.y) ? clamp(payload.y, -1, 1) : 0;

    player.inputX = x;
    player.inputY = y;
    player.lastInputAt = Date.now();

    if (typeof payload.facing === 'number' && Number.isFinite(payload.facing)) {
      player.facing = wrapAngle(payload.facing);
    }

    if (payload.anim === 'idle' || payload.anim === 'walk') {
      player.anim = payload.anim;
    }
  }

  private handleEnemyHit(client: Client, payload: HitEnemyInput): void {
    if (!this.state.started) return;
    const player = this.state.players.get(client.sessionId);
    if (!player || player.status !== 'alive') return;
    if (!payload || typeof payload.nonce !== 'string') return;

    const key = `${client.sessionId}:${payload.nonce}`;
    if (this.processedHits.has(key)) return;
    this.processedHits.add(key);

    const enemy = this.state.enemies.find((entry) => entry.id === payload.enemyId);
    if (!enemy || enemy.dead) return;

    const amount = clamp(payload.damage, 1, 9999);
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (enemy.hp <= 0) enemy.dead = true;

    this.broadcast('enemy:state', {
      id: enemy.id,
      hp: enemy.hp,
      dead: enemy.dead,
      by: client.sessionId,
    });
  }

  private cleanupHitCache(): void {
    if (this.processedHits.size <= 20000) return;
    this.processedHits.clear();
  }

  private serializeLobby(): {
    roomCode: string;
    hostSessionId: string;
    started: boolean;
    maxPlayers: number;
    players: Array<{ sessionId: string; nickname: string; status: string; characterFrame: number }>;
  } {
    return {
      roomCode: this.state.roomCode,
      hostSessionId: this.state.hostSessionId,
      started: this.state.started,
      maxPlayers: MAX_PLAYERS,
      players: [...this.state.players.values()].map((player) => ({
        sessionId: player.sessionId,
        nickname: player.nickname,
        status: player.status,
        characterFrame: player.characterFrame,
      })),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function wrapAngle(value: number): number {
  const twoPi = Math.PI * 2;
  let next = value % twoPi;
  if (next > Math.PI) next -= twoPi;
  if (next < -Math.PI) next += twoPi;
  return next;
}

export function resolveRoomIdByCode(rawCode: string): string | null {
  const roomCode = normalizeRoomCode(rawCode);
  if (!roomCode) return null;
  const found = findRoomByCode(roomCode);
  if (!found || found.started) return null;
  return found.roomId;
}
