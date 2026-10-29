import type Phaser from 'phaser';
import type { BossDef, EnemyDef, WeaponId } from '../core/types';

export interface EnemyRuntime {
  id: number;
  def: EnemyDef;
  bossDef?: BossDef;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  hpBarBg?: Phaser.GameObjects.Rectangle;
  hpBar?: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  coinValue: number;
  radius: number;
  boss: boolean;
  elite: boolean;
  phase2: boolean;
  baseScale: number;
  attackTimer: number;
  actionTimer: number;
  contactUntil: number;
  stealUntil: number;
  slowUntil: number;
  stunUntil: number;
  flashUntil: number;
  vx: number;
  vy: number;
  dashUntil: number;
  dashVx: number;
  dashVy: number;
  telegraph: number;
  telegraphAction: string;
  patternTimer: number;
  patternCycle: number;
  dirX: number;
  dirY: number;
  dead: boolean;
  bonusCoins: number;
  barWidth: number;
  hitCooldowns: Map<string, number>;
}

export type ProjectileKind = 'chinelo' | 'enemy' | 'orb' | 'card' | 'shot';

export interface Projectile {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  damage: number;
  radius: number;
  life: number;
  maxLife: number;
  hostile: boolean;
  pierce: number;
  crit: boolean;
  kind: ProjectileKind;
  homing: boolean;
  target: EnemyRuntime | null;
  hits: Set<number>;
  spin: number;
  ember: boolean;
  emberTimer: number;
  dead: boolean;
  bonusCoins: number;
  weaponId?: WeaponId;
}

export type PickupKind = 'coin' | 'xp' | 'heart' | 'chest';

export interface Pickup {
  kind: PickupKind;
  image: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  life: number;
  bob: number;
  collected: boolean;
}

export interface Hazard {
  circle: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  hostile: boolean;
  tick: number;
  color: number;
  dead: boolean;
}

export type BlastKind = 'pix' | 'lightning' | 'fire' | 'guardian';

export interface Blast {
  marker: Phaser.GameObjects.Image;
  x: number;
  y: number;
  radius: number;
  damage: number;
  delay: number;
  maxDelay: number;
  hostile: boolean;
  kind: BlastKind;
  color: number;
  dead: boolean;
}

export interface ChallengeState {
  name: string;
  kind: 'hunt' | 'untouch' | 'collect';
  duration: number;
  timeLeft: number;
  target: number;
  progress: number;
  done: boolean;
  doneTimer: number;
}

export interface DamageRoll {
  damage: number;
  crit: boolean;
}

export interface DamageOptions {
  bonusCoins?: number;
  color?: number;
  silent?: boolean;
}

export interface PlayerShotOptions {
  x: number;
  y: number;
  target: EnemyRuntime;
  speed: number;
  damage: number;
  crit: boolean;
  radius: number;
  pierce: number;
  homing: boolean;
  texture: string;
  scale: number;
  spin: number;
  life: number;
  ember: boolean;
  weaponId: WeaponId;
  bonusCoins?: number;
}

export interface BlastOptions {
  x: number;
  y: number;
  radius: number;
  damage: number;
  delay: number;
  kind: BlastKind;
  color: number;
  hostile?: boolean;
}

export interface HazardOptions {
  x: number;
  y: number;
  radius: number;
  damage: number;
  life: number;
  color: number;
  hostile?: boolean;
}
