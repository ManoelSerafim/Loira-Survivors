import Phaser from 'phaser';
import type {
  BossDef,
  EnemyDef,
  GameLaunch,
  HudSnapshot,
  OfferCard,
  RemotePlayerSnapshot,
  RunSummary,
  WeaponId,
} from '../core/types';
import { clamp } from '../core/format';
import { BOSSES, ENEMIES, getBoss, getEnemy } from '../data/enemies';
import { EVENTS } from '../data/events';
import { getWeapon, WEAPONS, weaponCooldown } from '../data/weapons';
import { audio } from '../audio/audio';
import { RunModel } from '../systems/run';
import { scaleEnemy, spawnInterval, type EnemyScaledStats } from '../systems/combat';
import { createArena, ensureUtilityTextures, WORLD_HEIGHT, WORLD_WIDTH, type ArenaVisuals } from './background';
import { updateBossAI } from './bosses';
import { updateEnemyAI } from './enemies';
import { CHARACTER_FRAME, ENEMY_PADDING, MAX_ENEMIES, PLAYER_RADIUS, REROLL_COST, SPECIAL_COOLDOWN, WORLD_PADDING } from './constants';
import { Fx } from './fx';
import { clearVirtualInput, gameInput, setVirtualInputEnabled } from './input';
import { bobOffset, clampToBounds, normalizeMoveVector, type MoveBounds } from './movement';
import type {
  Blast,
  BlastOptions,
  ChallengeState,
  DamageOptions,
  EnemyRuntime,
  Hazard,
  HazardOptions,
  Pickup,
  PlayerShotOptions,
  Projectile,
} from './runtime';
import { updateBlasts, updateHazards, updatePickups, updateProjectiles } from './updaters';
import { WeaponSystem } from './weapons';

const LOOT_TEXTURES = ['coin', 'gem', 'heart', 'chest', 'chest_red', 'star', 'key', 'map', 'potion', 'card', 'book', 'crown'];

interface RemotePlayerVisual {
  snapshot: RemotePlayerSnapshot;
  targetX: number;
  targetY: number;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

interface EnemySnapshotEntry {
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

export class GameScene extends Phaser.Scene {
  model!: RunModel;
  player!: Phaser.GameObjects.Image;
  readonly playerRadius = PLAYER_RADIUS;
  enemies: EnemyRuntime[] = [];
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  hazards: Hazard[] = [];
  blasts: Blast[] = [];
  stormUntil = 0;
  fx!: Fx;

  private launch!: GameLaunch;
  private arena!: ArenaVisuals;
  private weapons!: WeaponSystem;
  private playerShadow!: Phaser.GameObjects.Image;
  private playerGlow!: Phaser.GameObjects.Image;
  private playerIdle = 'player_idle_0';
  private playerWalk = 'player_walk_0';
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private running = false;
  private paused = false;
  private levelUpActive = false;
  private offers: OfferCard[] = [];
  private pendingLevelUps = 0;
  private rerolledThisLevel = false;
  private ending = false;
  private finished = false;
  private spawnTimer = 1;
  private bossSpawned = false;
  private bossRuntime: EnemyRuntime | null = null;
  private bossDefeated = false;
  private overtimeNotified = false;
  private hudTimer = 0;
  private specialTimer = 0;
  private dashTime = 0;
  private dashVx = 0;
  private dashVy = 0;
  private invuln = 0;
  private hurtTimer = 0;
  private playerKbX = 0;
  private playerKbY = 0;
  private playerBounds: MoveBounds = {
    minX: WORLD_PADDING,
    minY: WORLD_PADDING,
    maxX: WORLD_WIDTH - WORLD_PADDING,
    maxY: WORLD_HEIGHT - WORLD_PADDING,
  };
  private walkClock = 0;
  private facing = -Math.PI / 2;
  private nextEnemyId = 1;
  private totalXp = 0;
  private challenge: ChallengeState | null = null;
  private challengesStarted = 0;
  private challengesCompleted = 0;
  private eventIndex = 0;
  private eventThresholds: number[] = [];
  private lastSfx = new Map<string, number>();
  private remotePlayers = new Map<string, RemotePlayerVisual>();
  private enemySyncTimer = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameLaunch): void {
    this.launch = data;
  }

  preload(): void {
    this.load.setPath('sprites');
    for (let i = 0; i < 6; i++) {
      this.load.image(`player_idle_${i}`, `player_idle_${i}.png`);
      this.load.image(`player_walk_${i}`, `player_walk_${i}.png`);
    }
    for (let i = 0; i < 4; i++) this.load.image(`player_attack_${i}`, `player_attack_${i}.png`);
    for (let i = 0; i < 2; i++) this.load.image(`player_hurt_${i}`, `player_hurt_${i}.png`);
    for (let i = 0; i < 2; i++) this.load.image(`player_death_${i}`, `player_death_${i}.png`);

    for (const enemy of ENEMIES) {
      const variants = enemy.variants ?? 1;
      for (let i = 0; i < variants; i++) {
        this.load.image(`${enemy.sprite}_${i}`, `${enemy.sprite}_${i}.png`);
      }
    }
    for (const boss of BOSSES) this.load.image(boss.sprite, `${boss.sprite}.png`);
    for (const loot of LOOT_TEXTURES) this.load.image(`loot_${loot}`, `loot_${loot}.png`);
    for (const weapon of WEAPONS) {
      const file = weapon.icon.split('/').pop() ?? `weapon_${weapon.id}.png`;
      this.load.image(`weapon_${weapon.id}`, file);
    }
    this.load.setPath('');
  }

  create(): void {
    this.model = new RunModel(this.launch.config, this.launch.save, this.launch.seed ?? Date.now());
    this.fx = new Fx(this);
    this.arena = createArena(this, this.model.config.regionId, this.model.save.settings.quality);
    ensureUtilityTextures(this);

    const frame = CHARACTER_FRAME[this.model.config.characterId] ?? 0;
    this.playerIdle = `player_idle_${frame}`;
    this.playerWalk = `player_walk_${frame}`;
    const centerX = WORLD_WIDTH / 2;
    const centerY = WORLD_HEIGHT / 2;
    this.playerShadow = this.add.image(centerX, centerY - 2, 'p_shadow').setScale(0.7).setAlpha(0.42).setDepth(3);
    this.player = this.add.image(centerX, centerY, this.playerIdle).setOrigin(0.5, 1).setScale(1.05).setDepth(12);
    const topPadding = Math.max(WORLD_PADDING, Math.ceil(this.player.displayHeight) + 20);
    this.playerBounds = {
      minX: WORLD_PADDING,
      minY: topPadding,
      maxX: WORLD_WIDTH - WORLD_PADDING,
      maxY: WORLD_HEIGHT - WORLD_PADDING,
    };
    clearVirtualInput();
    setVirtualInputEnabled(true);
    this.playerGlow = this.add
      .image(centerX, centerY - 34, 'p_glow')
      .setTint(Phaser.Display.Color.HexStringToColor(this.model.character.color).color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.16)
      .setScale(0.5)
      .setDepth(2);

    this.weapons = new WeaponSystem(this);
    this.weapons.refresh();
    this.setupInput();
    this.configureCamera();
    this.eventThresholds = [0.16, 0.38, 0.62, 0.84].map((ratio) => this.model.duration * ratio);
    this.spawnTimer = 0.85;
    this.running = true;
    audio.ensure();
    audio.setMusic(this.model.region.id);
    this.launch.onChallenge(null);
    this.launch.onBoss(null);
    this.emitHud(true);
    this.time.delayedCall(900, () => {
      if (!this.finished) this.notify(this.model.region.tip, 'info');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.scale.on('resize', this.handleResize, this);
  }

  update(time: number, delta: number): void {
    if (!this.model) return;
    if (!this.running || this.paused) return;

    const dt = Math.min(0.05, delta / 1000);
    this.arena?.update(time, delta);

    this.model.tick(dt);
    this.updatePlayer(dt);
    this.sendMultiplayerInput();
    this.updateRemotePlayers(dt);
    this.syncEnemiesMultiplayer(dt);
    this.weapons.update(dt);
    this.updateSpawner(dt);
    this.updateEnemies(dt);
    updateProjectiles(this, dt);
    updateHazards(this, dt);
    updateBlasts(this, dt);
    updatePickups(this, dt);
    this.updateChallenge(dt);
    this.updateEvents();
    this.specialTimer = Math.max(0, this.specialTimer - dt);
    this.checkVictory();

    this.hudTimer += dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.emitHud(true);
    }
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
    keyboard.on('keydown-ESC', this.handleEsc, this);
    keyboard.on('keydown-SPACE', this.handleSpace, this);
  }

  private configureCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    camera.startFollow(this.player, true, 0.1, 0.1);
    camera.setZoom(this.zoomFor());
    camera.setBackgroundColor('#050a14');
    camera.roundPixels = true;
  }

  private zoomFor(): number {
    const width = this.scale.width;
    const height = this.scale.height;
    if (Math.min(width, height) < 720) return 0.92;
    return clamp(width / 1350, 1.0, 1.28);
  }

  private handleResize(): void {
    this.cameras.main.setZoom(this.zoomFor());
  }

  private handleEsc(): void {
    if (!this.running || this.ending || this.levelUpActive) return;
    if (this.paused) this.resumeRun();
    else this.pauseRun();
  }

  private handleSpace(): void {
    this.useSpecial();
  }

  private readMoveInput(): { x: number; y: number } {
    if (!this.running || this.paused || this.levelUpActive || this.ending) return { x: 0, y: 0 };

    let x = 0;
    let y = 0;
    if (this.keys) {
      if (this.keys.left?.isDown || this.keys.leftArrow?.isDown) x -= 1;
      if (this.keys.right?.isDown || this.keys.rightArrow?.isDown) x += 1;
      if (this.keys.up?.isDown || this.keys.upArrow?.isDown) y -= 1;
      if (this.keys.down?.isDown || this.keys.downArrow?.isDown) y += 1;
    }
    if (gameInput.active) {
      x += gameInput.x;
      y += gameInput.y;
    }
    return { x, y };
  }

  private resetControls(): void {
    clearVirtualInput();
    this.input.keyboard?.resetKeys();
  }

  private freezeSimulation(): void {
    this.time.paused = true;
    this.tweens.pauseAll();
    this.cameras.main.shakeEffect.reset();
  }

  private unfreezeSimulation(): void {
    this.time.paused = false;
    this.tweens.resumeAll();
  }

  private updatePlayer(dt: number): void {
    if (this.ending) return;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);

    const input = this.readMoveInput();
    let moving = false;
    let moveX = 0;
    let moveY = 0;

    if (this.dashTime > 0) {
      const dashDt = Math.min(dt, this.dashTime);
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.player.x += this.dashVx * dashDt;
      this.player.y += this.dashVy * dashDt;
      moveX = this.dashVx;
      moveY = this.dashVy;
      moving = true;
      this.facing = Math.atan2(this.dashVy, this.dashVx);
      if (Math.random() < 0.7) this.fx.dashTrail(this.player.x, this.player.y - 30, 0x8fe9ff);
    } else {
      const direction = normalizeMoveVector(input.x, input.y);
      if (direction.magnitude > 0) {
        const speed = this.model.derived.moveSpeed;
        this.player.x += direction.x * speed * dt;
        this.player.y += direction.y * speed * dt;
        moveX = direction.x;
        moveY = direction.y;
        moving = true;
        this.facing = Math.atan2(direction.y, direction.x);
      }
    }

    if (moving && Math.abs(moveX) > 0.05) this.player.setFlipX(moveX < 0);

    const position = clampToBounds(
      this.player.x + this.playerKbX * dt,
      this.player.y + this.playerKbY * dt,
      this.playerBounds,
    );
    this.player.x = position.x;
    this.player.y = position.y;
    this.playerKbX *= Math.max(0, 1 - 9 * dt);
    this.playerKbY *= Math.max(0, 1 - 9 * dt);

    if (moving) this.walkClock += dt;
    const bob = bobOffset(moving, this.walkClock, this.time.now);
    this.player
      .setTexture(moving ? this.playerWalk : this.playerIdle)
      // The bob is a render-only offset. Keep player.x/y (the logical ground
      // position used by collisions, camera, AI and weapons) untouched.
      .setOrigin(0.5, 1 + bob / Math.max(1, this.player.displayHeight))
      .setDepth(10 + this.player.y * 0.001)
      .setAlpha(this.invuln > 0 && this.dashTime <= 0 ? 0.55 + Math.sin(this.time.now * 0.04) * 0.35 : 1)
      .setTint(this.hurtTimer > 0 ? 0xff8080 : 0xffffff);
    this.playerShadow.setPosition(this.player.x, this.player.y + 2).setDepth(3 + this.player.y * 0.0005);
    this.playerGlow.setPosition(this.player.x, this.player.y - 30).setDepth(2);
  }

  private sendMultiplayerInput(): void {
    const mp = this.launch.multiplayer;
    if (!mp?.enabled || !this.running || this.paused || this.ending) return;
    const input = this.readMoveInput();
    const magnitude = Math.hypot(input.x, input.y);
    const x = magnitude > 1 ? input.x / magnitude : input.x;
    const y = magnitude > 1 ? input.y / magnitude : input.y;
    const anim: 'idle' | 'walk' = magnitude > 0.04 ? 'walk' : 'idle';
    mp.sendMove({ x, y, facing: this.facing, anim });
  }

  public syncRemotePlayers(players: RemotePlayerSnapshot[]): void {
    const mp = this.launch.multiplayer;
    if (!mp?.enabled) return;
    const ownId = mp.sessionId;
    const activeIds = new Set<string>();

    for (const player of players) {
      if (player.sessionId === ownId) continue;
      activeIds.add(player.sessionId);
      const existing = this.remotePlayers.get(player.sessionId);
      if (!existing) {
        const frame = clamp(player.characterFrame, 0, 5);
        const idleKey = this.textures.exists(`player_idle_${frame}`) ? `player_idle_${frame}` : 'player_idle_0';
        const walkKey = this.textures.exists(`player_walk_${frame}`) ? `player_walk_${frame}` : idleKey;
        const shadow = this.add.image(player.x, player.y + 2, 'p_shadow').setScale(0.65).setAlpha(0.3).setDepth(3);
        const sprite = this.add.image(player.x, player.y, idleKey).setOrigin(0.5, 1).setScale(1.0).setDepth(12);
        const label = this.add
          .text(player.x, player.y - 72, player.nickname, {
            fontFamily: 'Rubik',
            fontSize: '12px',
            color: '#dff8ff',
            stroke: '#07101d',
            strokeThickness: 3,
          })
          .setOrigin(0.5, 1)
          .setDepth(50);
        this.remotePlayers.set(player.sessionId, {
          snapshot: { ...player, anim: player.anim },
          targetX: player.x,
          targetY: player.y,
          sprite,
          shadow,
          label,
        });
        sprite.setData('idleKey', idleKey);
        sprite.setData('walkKey', walkKey);
        continue;
      }
      existing.snapshot = player;
      existing.targetX = player.x;
      existing.targetY = player.y;
      existing.label.setText(player.nickname);
    }

    for (const [sessionId, visual] of this.remotePlayers.entries()) {
      if (activeIds.has(sessionId)) continue;
      visual.shadow.destroy();
      visual.sprite.destroy();
      visual.label.destroy();
      this.remotePlayers.delete(sessionId);
    }
  }

  public syncEnemySnapshot(entries: EnemySnapshotEntry[]): void {
    const mp = this.launch.multiplayer;
    if (!mp?.enabled || mp.isHost) return;

    const byId = new Map<number, EnemyRuntime>();
    for (const enemy of this.enemies) byId.set(enemy.id, enemy);

    const keep = new Set<number>();
    for (const entry of entries) {
      keep.add(entry.id);
      let enemy = byId.get(entry.id);
      if (!enemy && !entry.dead) {
        const def = getEnemy(entry.defId);
        const scaled = scaleEnemy(def, {
          elapsed: this.model.elapsed,
          duration: this.model.duration,
          difficulty: this.model.config.difficulty,
          regionId: this.model.region.id,
          elite: entry.elite,
        });
        enemy = this.spawnEnemy(def, scaled, entry.x, entry.y, entry.elite, entry.boss);
        enemy.id = entry.id;
      }
      if (!enemy) continue;
      enemy.x = entry.x;
      enemy.y = entry.y;
      enemy.hp = entry.hp;
      enemy.maxHp = Math.max(1, entry.maxHp);
      enemy.phase2 = entry.phase2;
      if (entry.dead && !enemy.dead) this.killEnemy(enemy);
    }

    for (const enemy of this.enemies) {
      if (!keep.has(enemy.id) && !enemy.dead) enemy.dead = true;
    }
  }

  private syncEnemiesMultiplayer(dt: number): void {
    const mp = this.launch.multiplayer;
    if (!mp?.enabled) return;

    if (!mp.isHost) {
      for (const enemy of this.enemies) {
        enemy.vx = 0;
        enemy.vy = 0;
      }
      return;
    }

    this.enemySyncTimer += dt;
    if (this.enemySyncTimer < 0.12) return;
    this.enemySyncTimer = 0;

    mp.sendEnemySync({
      enemies: this.enemies
        .filter((enemy) => !enemy.dead)
        .map((enemy) => ({
          id: enemy.id,
          defId: enemy.def.id,
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
  }

  private updateRemotePlayers(dt: number): void {
    if (!this.remotePlayers.size) return;
    const follow = Math.min(1, dt * 12);
    for (const visual of this.remotePlayers.values()) {
      const snap = visual.snapshot;
      visual.sprite.x += (visual.targetX - visual.sprite.x) * follow;
      visual.sprite.y += (visual.targetY - visual.sprite.y) * follow;

      const walkKey = String(visual.sprite.getData('walkKey') ?? 'player_walk_0');
      const idleKey = String(visual.sprite.getData('idleKey') ?? 'player_idle_0');
      visual.sprite.setTexture(snap.anim === 'walk' ? walkKey : idleKey);
      if (Math.abs(snap.vx) > 3) visual.sprite.setFlipX(snap.vx < 0);
      visual.sprite.setAlpha(snap.status === 'alive' ? 0.9 : 0.45);
      visual.sprite.setDepth(10 + visual.sprite.y * 0.001);

      visual.shadow.setPosition(visual.sprite.x, visual.sprite.y + 2).setDepth(3 + visual.sprite.y * 0.0005);
      visual.shadow.setAlpha(snap.status === 'alive' ? 0.3 : 0.15);
      visual.label.setPosition(visual.sprite.x, visual.sprite.y - 72);
      visual.label.setAlpha(snap.status === 'alive' ? 1 : 0.6);
    }
  }

  private updateSpawner(dt: number): void {
    if (!this.bossSpawned && this.model.elapsed >= this.model.region.bossAt) this.spawnBoss();
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const progress = clamp(this.model.elapsed / this.model.duration, 0, 1);
    const count = 1 + Math.floor(progress * 2.2) + (this.model.elapsed < this.stormUntil ? 1 : 0);
    const modifier = (this.model.elapsed < this.stormUntil ? 0.62 : 1) * (this.bossRuntime ? 1.45 : 1) * (this.bossDefeated ? 1.4 : 1);
    this.spawnTimer = spawnInterval(this.model.region, progress, this.model.config.difficulty, count) * modifier;
    if (this.enemies.length >= MAX_ENEMIES) return;

    const picked = this.model.rng.weighted(this.model.region.enemyPool.map((entry) => ({ item: entry.id, weight: entry.weight })));
    if (!picked) return;
    const eliteChance = this.model.region.eliteChance + this.model.derived.luck * 0.0004 + progress * 0.02;
    for (let i = 0; i < count && this.enemies.length < MAX_ENEMIES; i++) {
      this.spawnEnemyById(picked, this.model.rng.chance(eliteChance));
    }
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    const def = getBoss(this.model.region.bossId);
    const scaled = scaleEnemy(def, {
      elapsed: this.model.elapsed,
      duration: this.model.duration,
      difficulty: this.model.config.difficulty,
      regionId: this.model.region.id,
      elite: false,
    });
    const point = this.safeSpawnPoint(this.player.x, this.player.y, 420, 90);
    const enemy = this.spawnEnemy(def, scaled, point.x, point.y, false, true);
    this.bossRuntime = enemy;
    this.launch.onBoss({ name: def.name, hp: enemy.hp, maxHp: enemy.maxHp });
    this.notify(`${def.name} chegou! ${def.title}`, 'bad');
    audio.play('boss');
    this.shake(420, 0.014);
    this.cameras.main.flash(300, 220, 70, 70);
    this.emitHud(true);
  }

  public spawnEnemyById(id: string, elite = false, x?: number, y?: number): EnemyRuntime {
    const def = elite ? getEnemy('fiscal') : getEnemy(id);
    const scaled = scaleEnemy(def, {
      elapsed: this.model.elapsed,
      duration: this.model.duration,
      difficulty: this.model.config.difficulty,
      regionId: this.model.region.id,
      elite: false,
    });
    const point = x !== undefined && y !== undefined ? { x, y } : this.spawnPoint();
    return this.spawnEnemy(def, scaled, point.x, point.y, elite, false);
  }

  private spawnPoint(): { x: number; y: number } {
    const view = this.cameras.main.worldView;
    const width = view.width || this.scale.width / this.cameras.main.zoom;
    const height = view.height || this.scale.height / this.cameras.main.zoom;
    const distance = Math.max(width, height) * 0.58 + this.model.rng.range(50, 170);
    return this.safeSpawnPoint(this.player.x, this.player.y, distance);
  }

  /**
   * Picks a point at the requested distance from the origin while staying
   * inside the map. Near a corner the straight line may be clamped onto the
   * player, so up to eight directions are tried and the farthest one wins.
   */
  private safeSpawnPoint(originX: number, originY: number, distance: number, padding = WORLD_PADDING): { x: number; y: number } {
    const minX = padding;
    const minY = padding;
    const maxX = WORLD_WIDTH - padding;
    const maxY = WORLD_HEIGHT - padding;
    let best = { x: clamp(originX, minX, maxX), y: clamp(originY, minY, maxY) };
    let bestDistance = -1;
    const minDistance = Math.min(360, distance * 0.55);
    const start = this.model.rng.range(0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const angle = start + (i / 8) * Math.PI * 2;
      const x = clamp(originX + Math.cos(angle) * distance, minX, maxX);
      const y = clamp(originY + Math.sin(angle) * distance, minY, maxY);
      const candidateDistance = Phaser.Math.Distance.Between(originX, originY, x, y);
      if (candidateDistance > bestDistance) {
        bestDistance = candidateDistance;
        best = { x, y };
      }
      if (candidateDistance >= minDistance) return { x, y };
    }
    return best;
  }

  private spawnEnemy(
    def: EnemyDef,
    scaled: EnemyScaledStats,
    x: number,
    y: number,
    elite: boolean,
    boss: boolean,
  ): EnemyRuntime {
    const variantCount = def.variants ?? 1;
    const variantKey = `${def.sprite}_${this.model.rng.int(0, Math.max(0, variantCount - 1))}`;
    const texture = this.textures.exists(variantKey) ? variantKey : this.textures.exists(def.sprite) ? def.sprite : 'p_dot';
    const sprite = this.add
      .image(x, y, texture)
      .setOrigin(0.5, 1)
      .setScale(scaled.scale * 0.76)
      .setAlpha(0)
      .setDepth(10 + y * 0.001);
    const shadow = this.add
      .image(x, y + 2, 'p_shadow')
      .setScale(clamp(scaled.scale * 0.72, 0.45, boss ? 1.8 : 1.15))
      .setAlpha(0.35)
      .setDepth(3);
    this.tweens.add({
      targets: sprite,
      alpha: 1,
      scale: scaled.scale,
      duration: boss ? 550 : 200,
      ease: 'Back.easeOut',
    });
    const radius = boss ? 38 : Math.max(12, 15 * scaled.scale);
    let hpBarBg: Phaser.GameObjects.Rectangle | undefined;
    let hpBar: Phaser.GameObjects.Rectangle | undefined;
    if (elite || def.elite) {
      hpBarBg = this.add.rectangle(x - 24, y - 76, 48, 4, 0x07101d, 0.9).setDepth(45).setOrigin(0.5);
      hpBar = this.add.rectangle(x - 24, y - 76, 46, 2, 0xff6b6b, 1).setDepth(46).setOrigin(0, 0.5);
    }
    const enemy: EnemyRuntime = {
      id: this.nextEnemyId++,
      def,
      bossDef: boss ? (def as BossDef) : undefined,
      sprite,
      shadow,
      hpBarBg,
      hpBar,
      x,
      y,
      hp: scaled.hp,
      maxHp: scaled.hp,
      speed: scaled.speed,
      damage: scaled.damage,
      xp: scaled.xp,
      coinValue: scaled.coinValue,
      radius,
      boss,
      elite: elite || !!def.elite,
      phase2: false,
      baseScale: scaled.scale,
      attackTimer: this.model.rng.range(0.5, 2.2),
      actionTimer: this.model.rng.range(1.5, 4),
      contactUntil: 0,
      stealUntil: 0,
      slowUntil: 0,
      stunUntil: 0,
      flashUntil: 0,
      vx: 0,
      vy: 0,
      dashUntil: 0,
      dashVx: 0,
      dashVy: 0,
      telegraph: 0,
      telegraphAction: '',
      patternTimer: boss ? 2 : 0,
      patternCycle: 0,
      dirX: 0,
      dirY: 0,
      dead: false,
      bonusCoins: 0,
      barWidth: 46,
      hitCooldowns: new Map(),
    };
    this.enemies.push(enemy);
    return enemy;
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (enemy.boss) updateBossAI(this, enemy, dt);
      else updateEnemyAI(this, enemy, dt);

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.vx *= Math.max(0, 1 - 7 * dt);
      enemy.vy *= Math.max(0, 1 - 7 * dt);
      enemy.x = clamp(enemy.x, ENEMY_PADDING, WORLD_WIDTH - ENEMY_PADDING);
      enemy.y = clamp(enemy.y, ENEMY_PADDING, WORLD_HEIGHT - ENEMY_PADDING);

      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (dist < enemy.radius + this.playerRadius + 4 && this.model.elapsed >= enemy.contactUntil) {
        enemy.contactUntil = this.model.elapsed + (enemy.boss ? 1.15 : 0.88);
        this.hurtPlayer(enemy.damage * (enemy.boss ? 1 : 0.9), enemy.x, enemy.y);
        if (enemy.def.behavior === 'drainer' && this.model.elapsed >= enemy.stealUntil && this.model.coins > 0) {
          enemy.stealUntil = this.model.elapsed + 1.4;
          const stolen = Math.min(3, this.model.coins);
          this.model.coins -= stolen;
          this.fx.text(this.player.x, this.player.y - 74, `-${stolen}`, '#ffcf6b', 15);
        }
        if (!enemy.boss) {
          const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          enemy.vx += Math.cos(angle) * 160;
          enemy.vy += Math.sin(angle) * 160;
        }
      }

      const bob = enemy.def.behavior === 'storm' ? Math.sin(this.time.now * 0.006 + enemy.id) * 3 : Math.abs(Math.sin(this.time.now * 0.006 + enemy.id)) * 1.7;
      enemy.sprite
        .setPosition(enemy.x, enemy.y - bob)
        .setDepth(10 + enemy.y * 0.001)
        .setFlipX(enemy.dirX < -2);
      enemy.shadow.setPosition(enemy.x, enemy.y + 2).setDepth(3 + enemy.y * 0.0005);
      if (this.time.now < enemy.flashUntil) enemy.sprite.setTintFill(0xffffff);
      else if (this.model.elapsed < enemy.slowUntil) enemy.sprite.setTint(0x82d7ff);
      else if (enemy.boss && enemy.phase2) enemy.sprite.setTint(0xffc2d2);
      else enemy.sprite.clearTint();

      if (enemy.hpBar && enemy.hpBarBg) {
        const top = enemy.y - enemy.sprite.displayHeight - 8;
        enemy.hpBarBg.setPosition(enemy.x, top);
        enemy.hpBar.setPosition(enemy.x - 23, top);
        enemy.hpBar.setSize(Math.max(0, 46 * (enemy.hp / enemy.maxHp)), 2);
      }
    }
    if (this.enemies.some((enemy) => enemy.dead)) {
      this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    }
  }

  public nearestEnemy(maxDistance: number, fromX = this.player.x, fromY = this.player.y): EnemyRuntime | null {
    let best: EnemyRuntime | null = null;
    let bestDistance = maxDistance;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const distance = Phaser.Math.Distance.Between(fromX, fromY, enemy.x, enemy.y);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    }
    return best;
  }

  public enemiesInRange(x: number, y: number, radius: number): EnemyRuntime[] {
    return this.enemies.filter((enemy) => !enemy.dead && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius);
  }

  public rollDamage(weaponId: WeaponId): { damage: number; crit: boolean } {
    const base = this.model.getWeaponDamage(weaponId);
    const crit = this.model.rng.chance(this.model.derived.critChance);
    return { damage: Math.max(1, base * (crit ? 1.85 : 1)), crit };
  }

  public damageEnemy(enemy: EnemyRuntime, damage: number, crit: boolean, options: DamageOptions = {}): void {
    if (enemy.dead) return;
    const amount = Math.max(1, damage);
    enemy.hp -= amount;
    enemy.flashUntil = this.time.now + 70;
    enemy.bonusCoins += options.bonusCoins ?? 0;
    const color = crit ? '#ffd166' : options.color ? `#${options.color.toString(16).padStart(6, '0')}` : '#fff4d6';
    if (!options.silent) {
      this.fx.text(enemy.x + this.model.rng.range(-8, 8), enemy.y - enemy.sprite.displayHeight - 6, `${Math.round(amount)}`, color, crit ? 20 : 15, crit);
    }
    if (crit) this.fx.burst(enemy.x, enemy.y - 20, 0xffd166, 3, 26, 0.6);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: EnemyRuntime): void {
    if (enemy.dead) return;
    enemy.dead = true;
    this.dropLoot(enemy);
    this.model.addKill(enemy.boss);
    this.challengeKill();
    const wasBoss = enemy.boss;
    if (wasBoss) {
      this.bossDefeated = true;
      this.bossRuntime = null;
      this.launch.onBoss(null);
      this.notify(`${enemy.def.name} foi derrotado!`, 'gold');
      this.cameras.main.flash(380, 255, 220, 120);
      this.shake(420, 0.017);
      this.fx.confetti(enemy.x, enemy.y);
      audio.play('victory');
    } else {
      this.playSfx('death', 45);
    }
    enemy.shadow.setAlpha(0.2);
    enemy.hpBar?.destroy();
    enemy.hpBarBg?.destroy();
    this.tweens.add({
      targets: enemy.shadow,
      alpha: 0,
      duration: 260,
      onComplete: () => enemy.shadow.destroy(),
    });
    this.tweens.add({
      targets: enemy.sprite,
      alpha: 0,
      y: enemy.sprite.y - (wasBoss ? 60 : 22),
      scale: enemy.baseScale * (wasBoss ? 1.2 : 0.62),
      duration: wasBoss ? 900 : 280,
      ease: 'Cubic.easeOut',
      onComplete: () => enemy.sprite.destroy(),
    });
    this.fx.burst(enemy.x, enemy.y - 24, wasBoss ? 0xffd166 : 0xffb56b, wasBoss ? 18 : 6, wasBoss ? 120 : 34);
    if (wasBoss || this.model.kills === 1 || this.model.kills % 25 === 0) {
      this.launch.onAchievementsDirty(this.model.makeSnapshot({ bossDefeated: this.bossDefeated, challenges: this.challengesCompleted }));
    }
  }

  private dropLoot(enemy: EnemyRuntime): void {
    const xp = enemy.xp;
    if (xp > 8) {
      const parts = Math.min(8, Math.ceil(xp / 20));
      for (let i = 0; i < parts; i++) this.spawnPickup('xp', enemy.x, enemy.y - 10, xp / parts);
    } else {
      this.spawnPickup('xp', enemy.x, enemy.y - 10, xp);
    }

    const coinChance = enemy.boss || enemy.elite ? 1 : enemy.def.coinChance + this.model.derived.luck * 0.0015;
    if (this.model.rng.chance(coinChance)) {
      const parts = enemy.boss ? 8 : enemy.elite ? 2 : 1;
      for (let i = 0; i < parts; i++) this.spawnPickup('coin', enemy.x, enemy.y - 12, enemy.coinValue / parts);
    }
    if (enemy.bonusCoins > 0) {
      for (let i = 0; i < Math.min(3, enemy.bonusCoins); i++) this.spawnPickup('coin', enemy.x, enemy.y - 8, 1);
    }
    if (enemy.boss || this.model.rng.chance(enemy.elite ? 0.2 : 0.026 + this.model.derived.luck * 0.001)) {
      this.spawnPickup('heart', enemy.x, enemy.y - 18, 1);
    }
    if (enemy.boss || this.model.rng.chance(enemy.elite ? 0.32 : 0.002)) {
      this.spawnChestAt(enemy.x, enemy.y);
    }
  }

  private spawnPickup(kind: Pickup['kind'], x: number, y: number, value: number): void {
    const texture = kind === 'coin' ? 'loot_coin' : kind === 'xp' ? 'loot_gem' : kind === 'heart' ? 'loot_heart' : 'loot_chest';
    const pickupX = clamp(x, WORLD_PADDING, WORLD_WIDTH - WORLD_PADDING);
    const pickupY = clamp(y, WORLD_PADDING, WORLD_HEIGHT - WORLD_PADDING);
    const image = this.add
      .image(pickupX, pickupY, texture)
      .setScale(kind === 'chest' ? 0.72 : kind === 'heart' ? 0.42 : kind === 'coin' ? 0.48 : 0.44)
      .setDepth(16);
    if (kind === 'xp') image.setTint(0x7df7d6);
    let glow: Phaser.GameObjects.Image | undefined;
    if (kind === 'chest' || kind === 'coin') {
      glow = this.add
        .image(pickupX, pickupY, 'p_glow')
        .setTint(kind === 'chest' ? 0xffc857 : 0xffe08a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(kind === 'chest' ? 0.35 : 0.16)
        .setScale(kind === 'chest' ? 0.55 : 0.22)
        .setDepth(15);
    }
    this.pickups.push({
      kind,
      image,
      glow,
      x: pickupX,
      y: pickupY,
      vx: this.model.rng.range(-55, 55),
      vy: this.model.rng.range(-70, -20),
      value,
      life: kind === 'chest' ? 40 : 28,
      bob: this.model.rng.range(0, Math.PI * 2),
      collected: false,
    });
  }

  public spawnChestAt(x: number, y: number): void {
    this.spawnPickup('chest', clamp(x, 40, WORLD_WIDTH - 40), clamp(y, 40, WORLD_HEIGHT - 40), 1);
  }

  public collectPickup(pickup: Pickup): void {
    if (pickup.kind === 'coin') {
      const added = this.model.addCoins(pickup.value);
      this.challengeCoin(added);
      this.fx.text(pickup.x, pickup.y - 12, `+${added}`, '#ffd166', 14);
      this.playSfx('coin', 55);
    } else if (pickup.kind === 'xp') {
      this.totalXp += pickup.value;
      const levels = this.model.addXp(pickup.value);
      if (levels > 0) {
        this.pendingLevelUps += levels;
        this.openNextLevelUp();
      }
      this.playSfx('pickup', 70);
    } else if (pickup.kind === 'heart') {
      const healed = this.model.healPercent(0.16);
      this.fx.text(pickup.x, pickup.y - 12, `+${Math.round(healed)}`, '#8ef7a0', 16);
      this.playSfx('pickup', 80);
    } else {
      this.openChest(pickup);
    }
    this.emitHud(true);
  }

  private openChest(pickup: Pickup): void {
    audio.play('chest');
    this.fx.ring(pickup.x, pickup.y - 10, 62, 0xffc857, 480, 0.6);
    this.fx.confetti(pickup.x, pickup.y);
    const roll = this.model.rng.random();
    if (roll < 0.28) {
      const added = this.model.addCoins(35 + this.model.level * 4);
      this.notify(`Baú: +${added} moedas temporárias!`, 'gold');
    } else if (roll < 0.5) {
      const healed = this.model.healPercent(0.3);
      this.notify(`Baú: recuperou ${Math.round(healed)} de vida!`, 'good');
    } else if (roll < 0.72) {
      const xp = 18 + this.model.level * 3;
      this.totalXp += xp;
      const levels = this.model.addXp(xp);
      this.notify(`Baú: +${xp} de experiência!`, 'good');
      if (levels > 0) {
        this.pendingLevelUps += levels;
        this.openNextLevelUp();
      }
    } else {
      const candidates = [...this.model.weapons.entries()].filter(([, state]) => state.level < getWeapon(state.id).maxLevel);
      if (candidates.length) {
        const picked = this.model.rng.pick(candidates);
        const nextLevel = picked[1].level + 1;
        this.model.addWeaponLevel(picked[0]);
        this.weapons.refresh();
        this.refreshVisualState();
        this.notify(`Baú: ${getWeapon(picked[0]).name} subiu para o nível ${nextLevel}!`, 'gold');
        this.launch.onAchievementsDirty(this.model.makeSnapshot({ bossDefeated: this.bossDefeated, challenges: this.challengesCompleted }));
      } else {
        const added = this.model.addCoins(60);
        this.notify(`Baú: +${added} moedas temporárias!`, 'gold');
      }
    }
    this.emitHud(true);
  }

  public spawnPlayerShot(options: PlayerShotOptions): void {
    const image = this.add
      .image(options.x, options.y, options.texture)
      .setScale(options.scale)
      .setDepth(40)
      .setRotation(this.model.rng.range(0, Math.PI * 2));
    this.projectiles.push({
      image,
      x: options.x,
      y: options.y,
      speed: options.speed,
      vx: Math.cos(Math.atan2(options.target.y - 12 - options.y, options.target.x - options.x)) * options.speed,
      vy: Math.sin(Math.atan2(options.target.y - 12 - options.y, options.target.x - options.x)) * options.speed,
      damage: options.damage,
      radius: options.radius,
      life: options.life,
      maxLife: options.life,
      hostile: false,
      pierce: options.pierce,
      crit: options.crit,
      kind: 'chinelo',
      homing: options.homing,
      target: options.target,
      hits: new Set<number>(),
      spin: options.spin,
      ember: options.ember,
      emberTimer: 0.16,
      dead: false,
      bonusCoins: options.bonusCoins ?? 0,
      weaponId: options.weaponId,
    });
  }

  public spawnHostileProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    radius: number,
    tint: number,
    scale = 1,
    texture = 'p_dot',
  ): void {
    const image = this.add
      .image(x, y, texture)
      .setTint(tint)
      .setScale(scale)
      .setDepth(41)
      .setRotation(angle);
    if (texture === 'p_dot') image.setBlendMode(Phaser.BlendModes.ADD);
    this.projectiles.push({
      image,
      x,
      y,
      speed,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      radius,
      life: 6,
      maxLife: 6,
      hostile: true,
      pierce: 0,
      crit: false,
      kind: 'enemy',
      homing: false,
      target: null,
      hits: new Set<number>(),
      spin: 0,
      ember: false,
      emberTimer: 0,
      dead: false,
      bonusCoins: 0,
    });
  }

  public spawnBossProjectile(
    enemy: EnemyRuntime,
    angle: number,
    speed: number,
    damage: number,
    tint: number,
    texture: string,
    scale: number,
  ): void {
    const x = enemy.x + Math.cos(angle) * 24;
    const y = enemy.y - 46 + Math.sin(angle) * 12;
    this.spawnHostileProjectile(x, y, angle, speed, damage, texture === 'loot_card' ? 17 : 15, tint, scale, texture);
  }

  public queueBlast(options: BlastOptions): void {
    const marker = this.add
      .image(options.x, options.y, 'p_warning')
      .setTint(options.color)
      .setDepth(35)
      .setScale(options.radius / 42)
      .setAlpha(0.7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.blasts.push({
      marker,
      x: options.x,
      y: options.y,
      radius: options.radius,
      damage: options.damage,
      delay: options.delay,
      maxDelay: Math.max(0.01, options.delay),
      hostile: options.hostile ?? false,
      kind: options.kind,
      color: options.color,
      dead: false,
    });
  }

  public resolveBlast(blast: Blast): void {
    this.fx.ring(blast.x, blast.y, blast.radius, blast.color, 420, 0.7);
    if (blast.hostile) {
      if (Phaser.Math.Distance.Between(blast.x, blast.y, this.player.x, this.player.y - 20) <= blast.radius + this.playerRadius) {
        this.hurtPlayer(blast.damage, blast.x, blast.y);
      }
      if (blast.kind === 'fire') {
        this.addHazard({ x: blast.x, y: blast.y, radius: blast.radius * 0.72, damage: blast.damage * 0.22, life: 2.2, color: blast.color, hostile: true });
        this.fx.burst(blast.x, blast.y, 0xff8a4c, 10, 52);
      }
      if (blast.kind === 'guardian') this.fx.beam(blast.x, blast.y, blast.color);
      audio.play('explosion');
      return;
    }
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (Phaser.Math.Distance.Between(blast.x, blast.y, enemy.x, enemy.y - 10) <= blast.radius + enemy.radius) {
        this.damageEnemy(enemy, blast.damage, false, { color: blast.color });
        if (blast.kind === 'lightning' && this.model.rng.chance(0.16)) enemy.stunUntil = this.model.elapsed + 0.6;
      }
    }
    if (blast.kind === 'lightning') {
      this.fx.beam(blast.x, blast.y, blast.color);
      this.playSfx('hit', 90);
    } else {
      this.fx.burst(blast.x, blast.y, blast.color, 9, 50);
      this.playSfx('explosion', 110);
      this.shake(80, 0.004);
    }
  }

  public addHazard(options: HazardOptions): void {
    if (this.hazards.length > 70) {
      const oldest = this.hazards.shift();
      oldest?.circle.destroy();
    }
    const circle = this.add
      .circle(options.x, options.y, options.radius, options.color, 0.16)
      .setStrokeStyle(2, options.color, 0.45)
      .setDepth(8);
    this.hazards.push({
      circle,
      x: options.x,
      y: options.y,
      radius: options.radius,
      damage: options.damage,
      life: options.life,
      maxLife: options.life,
      hostile: options.hostile ?? false,
      tick: 0,
      color: options.color,
      dead: false,
    });
  }

  public hurtPlayer(amount: number, sourceX: number, sourceY: number): void {
    if (!this.running || this.paused || this.invuln > 0 || this.ending) return;
    this.invuln = 0.62;
    this.hurtTimer = 0.16;
    const result = this.model.takeDamage(amount);
    const angle = Math.atan2(this.player.y - sourceY, this.player.x - sourceX);
    this.playerKbX = Math.cos(angle) * 190;
    this.playerKbY = Math.sin(angle) * 190;
    this.fx.text(this.player.x, this.player.y - 76, `-${Math.round(result.amount)}`, '#ff7b7b', 18);
    this.fx.burst(this.player.x, this.player.y - 30, 0xff5c5c, 7, 38);
    this.shake(130, 0.008);
    this.cameras.main.flash(110, 180, 26, 26);
    this.playSfx('hurt', 130);
    this.failChallenge('untouch');
    if (result.revived) {
      this.invuln = 2.4;
      audio.play('revive');
      this.fx.ring(this.player.x, this.player.y - 20, 130, 0xffe08a, 700, 0.8);
      this.notify('Segunda chance! Você voltou com 45% da vida.', 'gold');
    }
    if (result.died) this.playerDeath();
    this.emitHud(true);
  }

  private playerDeath(): void {
    if (this.ending) return;
    this.ending = true;
    this.running = false;
    this.paused = false;
    this.levelUpActive = false;
    audio.play('death');
    audio.setDucked(false);
    setVirtualInputEnabled(false);
    this.resetControls();
    this.player.setTexture('player_death_0').setTint(0xffffff).setAlpha(1);
    this.playerShadow.setAlpha(0.2);
    this.time.delayedCall(180, () => {
      if (this.player?.active) this.player.setTexture('player_death_1');
    });
    this.cameras.main.shake(300, 0.01);
    this.emitHud(true);
    this.launch.onToast('A jornada terminou antes de Portugal. Tente de novo.', 'bad');
    this.launch.multiplayer?.onPlayerDeath?.();
    this.time.delayedCall(1700, () => this.finish(false));
  }

  private checkVictory(): void {
    if (this.ending || !this.running) return;
    if (this.model.elapsed < this.model.duration) return;
    if (this.bossDefeated) {
      this.victory();
    } else if (!this.overtimeNotified) {
      this.overtimeNotified = true;
      this.notify('O tempo acabou, mas o chefe ainda está de pé! Derrote-o para vencer.', 'bad');
      this.emitHud(true);
    }
  }

  private victory(): void {
    if (this.ending) return;
    this.ending = true;
    this.running = false;
    this.paused = false;
    this.levelUpActive = false;
    audio.play('victory');
    audio.setDucked(false);
    setVirtualInputEnabled(false);
    this.resetControls();
    this.fx.confetti(this.player.x, this.player.y);
    this.cameras.main.flash(400, 255, 220, 130);
    this.launch.onToast(`Etapa concluída: ${this.model.regionName}!`, 'gold');
    this.emitHud(true);
    this.time.delayedCall(1200, () => this.finish(true));
  }

  private finish(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.paused = false;
    this.levelUpActive = false;
    audio.setDucked(false);
    setVirtualInputEnabled(false);
    this.resetControls();
    const model = this.model;
    const summary: RunSummary = {
      config: model.config,
      victory,
      time: victory ? Math.min(model.elapsed, model.duration) : model.elapsed,
      duration: model.duration,
      level: model.level,
      kills: model.kills,
      bossKills: model.bossKills,
      bossDefeated: this.bossDefeated,
      coins: model.coins,
      xp: Math.round(this.totalXp),
      upgrades: model.upgradesChosen,
      hpRatio: clamp(model.hp / model.derived.maxHp, 0, 1),
      noHit: model.noHit,
      lowHpMoment: model.lowHpMoment,
      challenges: this.challengesStarted,
      challengesCompleted: this.challengesCompleted,
      score: 0,
      endingId: '',
      loiraId: null,
      evolvedWeapons: [...model.weapons.values()].filter((state) => state.evolved).map((state) => state.id),
      ownedWeapons: [...model.weapons.keys()],
      maxWeaponLevel: model.maxWeaponLevel,
    };
    this.launch.onEnd(summary);
  }

  public pauseRun(): void {
    if (!this.running || this.paused || this.levelUpActive || this.ending) return;
    this.paused = true;
    setVirtualInputEnabled(false);
    this.resetControls();
    this.freezeSimulation();
    audio.setDucked(true);
    this.launch.onPaused(true);
  }

  public resumeRun(): void {
    if (!this.running || this.levelUpActive || this.ending) return;
    this.paused = false;
    setVirtualInputEnabled(true);
    this.unfreezeSimulation();
    audio.setDucked(false);
    this.launch.onPaused(false);
  }

  public useSpecial(): void {
    if (!this.running || this.paused || this.levelUpActive || this.ending || this.specialTimer > 0) return;

    const input = this.readMoveInput();
    let dx: number;
    let dy: number;
    const length = Math.hypot(input.x, input.y);
    if (length > 0.08) {
      // Dash at a fixed speed even if the joystick is only slightly tilted.
      dx = input.x / length;
      dy = input.y / length;
    } else {
      dx = Math.cos(this.facing);
      dy = Math.sin(this.facing);
    }
    this.facing = Math.atan2(dy, dx);
    this.playerKbX = 0;
    this.playerKbY = 0;
    this.dashVx = dx * 920;
    this.dashVy = dy * 920;
    this.dashTime = 0.24;
    this.specialTimer = SPECIAL_COOLDOWN;
    this.invuln = Math.max(this.invuln, 0.72);
    const radius = 125 * this.model.derived.areaMult;
    const damage = 34 * this.model.derived.damageMult;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) > radius + enemy.radius) continue;
      this.damageEnemy(enemy, damage, this.model.rng.chance(this.model.derived.critChance), { color: 0x8fe9ff });
      if (!enemy.boss) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        enemy.vx += Math.cos(angle) * 260;
        enemy.vy += Math.sin(angle) * 260;
      }
    }
    this.fx.ring(this.player.x, this.player.y - 20, radius, 0x8fe9ff, 420, 0.7);
    this.fx.burst(this.player.x, this.player.y - 20, 0x8fe9ff, 12, 60);
    this.playSfx('dash');
    this.shake(120, 0.006);
    this.emitHud(true);
  }

  private openNextLevelUp(): void {
    if (this.levelUpActive || this.pendingLevelUps <= 0 || !this.running || this.ending) return;
    this.pendingLevelUps -= 1;
    this.levelUpActive = true;
    this.paused = true;
    this.rerolledThisLevel = false;
    setVirtualInputEnabled(false);
    this.resetControls();
    this.offers = this.model.buildOffers();
    audio.setDucked(true);
    audio.play('levelup');
    this.fx.ring(this.player.x, this.player.y - 20, 120, 0xffd166, 650, 0.7);
    this.freezeSimulation();
    this.emitHud(true);
    this.launch.onLevelUp(this.offers);
  }

  public chooseOffer(index: number): void {
    if (!this.levelUpActive) return;
    const offer = this.offers[index];
    if (!offer) return;
    const message = this.model.applyOffer(offer);
    this.levelUpActive = false;
    this.weapons.refresh();
    this.refreshVisualState();
    audio.play(offer.isEvolution ? 'evolve' : 'upgrade');
    this.launch.onToast(message, 'good');
    this.emitHud(true);
    this.launch.onAchievementsDirty(this.model.makeSnapshot({ bossDefeated: this.bossDefeated, challenges: this.challengesCompleted }));
    if (this.pendingLevelUps > 0) {
      this.openNextLevelUp();
    } else {
      this.paused = false;
      setVirtualInputEnabled(true);
      this.unfreezeSimulation();
      audio.setDucked(false);
    }
  }

  public rerollOffers(): OfferCard[] | null {
    if (!this.levelUpActive) return null;
    if (this.rerolledThisLevel) {
      this.notify('Você já rerrolou as opções deste nível.', 'bad');
      return null;
    }
    if (!this.model.spendCoins(REROLL_COST)) {
      this.notify(`Rerrolar custa ${REROLL_COST} moedas temporárias.`, 'bad');
      return null;
    }
    this.rerolledThisLevel = true;
    this.offers = this.model.buildOffers();
    audio.play('click');
    this.emitHud(true);
    this.launch.onLevelUp(this.offers);
    return this.offers;
  }

  public abandon(): void {
    if (this.finished) return;
    this.ending = true;
    this.running = false;
    this.paused = false;
    this.levelUpActive = false;
    audio.setDucked(false);
    setVirtualInputEnabled(false);
    this.resetControls();
    this.finish(false);
  }

  private updateChallenge(dt: number): void {
    const challenge = this.challenge;
    if (!challenge) return;
    if (challenge.done) {
      challenge.doneTimer -= dt;
      if (challenge.doneTimer <= 0) {
        this.challenge = null;
        this.launch.onChallenge(null);
        this.emitHud(true);
      }
      return;
    }
    challenge.timeLeft -= dt;
    if (challenge.kind === 'untouch') {
      challenge.progress += dt;
      if (challenge.progress >= challenge.target) this.completeChallenge();
      else if (challenge.timeLeft <= 0) this.failChallenge(challenge.kind);
    } else if (challenge.timeLeft <= 0) {
      this.failChallenge(challenge.kind);
    }
  }

  private startChallenge(): boolean {
    if (this.challenge) return false;
    const kind = this.model.rng.pick(['hunt', 'untouch', 'collect'] as const);
    const challenge: ChallengeState =
      kind === 'hunt'
        ? { name: 'Caçada Relâmpago', kind, duration: 22, timeLeft: 22, target: 18 + this.model.level, progress: 0, done: false, doneTimer: 0 }
        : kind === 'untouch'
          ? { name: 'Intocável por 15s', kind, duration: 15, timeLeft: 15, target: 15, progress: 0, done: false, doneTimer: 0 }
          : { name: 'Coleta Relâmpago', kind, duration: 20, timeLeft: 20, target: 28 + this.model.level, progress: 0, done: false, doneTimer: 0 };
    this.challenge = challenge;
    this.challengesStarted += 1;
    this.launch.onChallenge(challenge.name);
    this.notify(`Desafio: ${challenge.name}. ${this.challengeHint(challenge)}`, 'info');
    audio.play('event');
    this.emitHud(true);
    return true;
  }

  private challengeHint(challenge: ChallengeState): string {
    if (challenge.kind === 'hunt') return `Derrote ${challenge.target} inimigos.`;
    if (challenge.kind === 'untouch') return 'Não receba dano até o fim.';
    return `Colete ${challenge.target} moedas.`;
  }

  private challengeKill(): void {
    if (!this.challenge || this.challenge.done || this.challenge.kind !== 'hunt') return;
    this.challenge.progress += 1;
    if (this.challenge.progress >= this.challenge.target) this.completeChallenge();
    else this.emitHud(true);
  }

  private challengeCoin(amount: number): void {
    if (!this.challenge || this.challenge.done || this.challenge.kind !== 'collect') return;
    this.challenge.progress += amount;
    if (this.challenge.progress >= this.challenge.target) this.completeChallenge();
    else this.emitHud(true);
  }

  private completeChallenge(): void {
    const challenge = this.challenge;
    if (!challenge || challenge.done) return;
    challenge.done = true;
    challenge.doneTimer = 2.4;
    this.challengesCompleted += 1;
    const reward = 55 + this.model.level * 5;
    this.model.addCoins(reward);
    this.spawnChestAt(this.player.x + 50, this.player.y);
    audio.play('achievement');
    this.fx.confetti(this.player.x, this.player.y);
    this.notify(`Desafio concluído! +${reward} moedas e um baú.`, 'gold');
    this.launch.onAchievementsDirty(this.model.makeSnapshot({ bossDefeated: this.bossDefeated, challenges: this.challengesCompleted }));
    this.emitHud(true);
  }

  private failChallenge(kind: ChallengeState['kind']): void {
    const challenge = this.challenge;
    if (!challenge || challenge.done || challenge.kind !== kind) return;
    this.challenge = null;
    this.launch.onChallenge(null);
    this.notify(`Desafio falhou: ${challenge.name}.`, 'bad');
    this.emitHud(true);
  }

  private updateEvents(): void {
    if (this.eventIndex >= this.eventThresholds.length) return;
    if (this.model.elapsed < this.eventThresholds[this.eventIndex]) return;
    this.eventIndex += 1;
    const event = this.model.rng.weighted(EVENTS.map((entry) => ({ item: entry, weight: entry.weight })));
    if (!event) return;
    const detail = this.applyEvent(event.effect);
    this.launch.onEvent(event, detail, event.tone);
    audio.play('event');
    this.emitHud(true);
  }

  private applyEvent(effect: string): string {
    const model = this.model;
    switch (effect) {
      case 'gainCoins': {
        const added = model.addCoins(Math.round((24 + model.level * 3) * (1 + model.meta.eventMultiplier)));
        return `+${added} moedas temporárias. O caixa agradece.`;
      }
      case 'skipTime': {
        model.elapsed += 8;
        return 'O relógio avançou 8 segundos. A passagem ficou mais barata.';
      }
      case 'enemyStorm': {
        this.stormUntil = model.elapsed + 15;
        for (let i = 0; i < 5; i++) this.spawnEnemyById(model.rng.pick(model.region.enemyPool).id);
        return 'Inimigos mais rápidos e numerosos por 15 segundos.';
      }
      case 'attackBuff': {
        model.addBuff('evento_cafe', 'Café Grátis', '☕', 15, { attackSpeed: 0.28, moveSpeed: 0.1 });
        return 'Velocidade de ataque e movimento aumentadas por 15s.';
      }
      case 'loseCoins': {
        const lost = Math.round(model.coins * 0.15);
        model.coins = Math.max(0, model.coins - lost);
        return lost > 0 ? `Você perdeu ${lost} moedas temporárias.` : 'Não havia moedas para perder. Ufa.';
      }
      case 'heal': {
        const healed = model.healPercent(0.24);
        return `Um viajante generoso: +${Math.round(healed)} de vida.`;
      }
      case 'randomReward': {
        const roll = model.rng.random();
        if (roll < 0.4) return `A mala tinha ${model.addCoins(30 + model.level * 2)} moedas.`;
        if (roll < 0.7) return `A mala tinha um kit médico: +${Math.round(model.healPercent(0.18))} de vida.`;
        if (roll < 0.9) {
          const xp = 16 + model.level * 2;
          this.totalXp += xp;
          const levels = model.addXp(xp);
          if (levels > 0) {
            this.pendingLevelUps += levels;
            this.openNextLevelUp();
          }
          return `A mala tinha um mapa antigo: +${xp} de experiência.`;
        }
        this.spawnChestAt(this.player.x + 40, this.player.y + 30);
        return 'A mala estava vazia... mas havia um baú escondido atrás dela.';
      }
      case 'challenge': {
        if (this.startChallenge()) return `A mensagem virou desafio: ${this.challenge?.name}.`;
        model.addCoins(20);
        return 'Você já estava em um desafio. A mensagem rendeu 20 moedas.';
      }
      default:
        return 'Algo inesperado aconteceu na estrada.';
    }
  }

  public summonMinions(count: number): void {
    if (this.enemies.length >= MAX_ENEMIES) return;
    const originX = this.bossRuntime?.x ?? this.player.x;
    const originY = this.bossRuntime?.y ?? this.player.y;
    for (let i = 0; i < count && this.enemies.length < MAX_ENEMIES; i++) {
      const angle = this.model.rng.range(0, Math.PI * 2);
      const distance = this.model.rng.range(80, 210);
      const pool = this.model.region.enemyPool;
      const picked = this.model.rng.weighted(pool.map((entry) => ({ item: entry.id, weight: entry.weight })));
      if (!picked) continue;
      this.spawnEnemyById(picked, false, clamp(originX + Math.cos(angle) * distance, ENEMY_PADDING, WORLD_WIDTH - ENEMY_PADDING), clamp(originY + Math.sin(angle) * distance, ENEMY_PADDING, WORLD_HEIGHT - ENEMY_PADDING));
    }
  }

  public notify(message: string, tone: 'good' | 'bad' | 'info' | 'gold' = 'info'): void {
    this.launch.onToast(message, tone);
  }

  public shake(intensity = 120, duration = 0.006): void {
    if (!this.model.save.settings.screenShake) return;
    this.cameras.main.shake(intensity, duration);
  }

  public playSfx(name: Parameters<typeof audio.play>[0], gap = 55): void {
    const now = this.time.now;
    const last = this.lastSfx.get(name) ?? 0;
    if (now - last < gap) return;
    this.lastSfx.set(name, now);
    audio.play(name);
  }

  public grantInvulnerability(seconds: number): void {
    this.invuln = Math.max(this.invuln, seconds);
  }

  private refreshVisualState(): void {
    this.player.setTexture(this.playerIdle);
  }

  public emitHud(_force = false): void {
    if (!this.model) return;
    this.hudTimer = 0;
    const boss = this.bossRuntime && !this.bossRuntime.dead ? this.bossRuntime : null;
    const snapshot: HudSnapshot = {
      hp: Math.max(0, this.model.hp),
      maxHp: this.model.derived.maxHp,
      xp: Math.floor(this.model.xp),
      xpToNext: this.model.xpNeeded,
      level: this.model.level,
      timeLeft: Math.max(0, this.model.duration - this.model.elapsed),
      elapsed: this.model.elapsed,
      duration: this.model.duration,
      coins: this.model.coins,
      kills: this.model.kills,
      regionId: this.model.config.regionId,
      regionName: this.model.region.name,
      difficulty: this.model.config.difficulty,
      weapons: [...this.model.weapons.values()].map((state) => {
        const def = getWeapon(state.id);
        const cooldown = weaponCooldown(def, state.level, state.evolved, this.model.derived.cooldownMult);
        return {
          id: state.id,
          level: state.level,
          evolved: state.evolved,
          cooldownRatio: def.id === 'mala' || def.id === 'carisma' ? 0 : clamp(state.cooldownLeft / Math.max(0.01, cooldown), 0, 1),
        };
      }),
      boss: boss ? { name: boss.def.name, hp: Math.max(0, boss.hp), maxHp: boss.maxHp, phase: boss.phase2 ? 2 : 1 } : null,
      buffs: this.model.getBuffInfos(),
      specialCooldown: this.specialTimer,
      specialMax: SPECIAL_COOLDOWN,
      challenge: this.challenge ? { name: this.challenge.name, seconds: Math.max(0, Math.ceil(this.challenge.timeLeft)), done: this.challenge.done } : null,
      revivesLeft: this.model.revivesLeft,
    };
    this.launch.onHud(snapshot);
  }

  private handleShutdown(): void {
    this.weapons?.destroy();
    this.arena?.destroy();
    this.scale.off('resize', this.handleResize, this);
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.off('keydown-ESC', this.handleEsc, this);
      keyboard.off('keydown-SPACE', this.handleSpace, this);
    }
    this.time.paused = false;
    this.tweens.resumeAll();
    setVirtualInputEnabled(false);
    clearVirtualInput();
    audio.setDucked(false);
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.hazards = [];
    this.blasts = [];
    for (const remote of this.remotePlayers.values()) {
      remote.shadow.destroy();
      remote.sprite.destroy();
      remote.label.destroy();
    }
    this.remotePlayers.clear();
  }
}
