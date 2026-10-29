export type RegionId = 'brasil' | 'aeroporto' | 'atlantico' | 'europa' | 'portugal';
export type DifficultyId = 'normal' | 'dificil' | 'lendaria';
export type CharacterId = 'heroi' | 'mochileiro' | 'tatico' | 'casual';
export type WeaponId =
  | 'chinelo'
  | 'pix'
  | 'mochila'
  | 'cafe'
  | 'carisma'
  | 'passaporte'
  | 'combo'
  | 'mala';

export type StatKey =
  | 'damage'
  | 'maxHp'
  | 'moveSpeed'
  | 'attackSpeed'
  | 'range'
  | 'critChance'
  | 'armor'
  | 'luck'
  | 'xpGain'
  | 'coinGain'
  | 'regen'
  | 'cooldown'
  | 'magnet'
  | 'projectiles'
  | 'revives'
  | 'area';

export type Rarity = 'comum' | 'raro' | 'epico' | 'lendario';

export type StatBonuses = Partial<Record<StatKey, number>>;

export interface DerivedStats {
  maxHp: number;
  moveSpeed: number;
  damageMult: number;
  attackSpeed: number;
  rangeMult: number;
  critChance: number;
  armor: number;
  luck: number;
  xpMult: number;
  coinMult: number;
  regen: number;
  cooldownMult: number;
  magnet: number;
  projectiles: number;
  revives: number;
  areaMult: number;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  portrait: string;
  sprite: string;
  color: string;
  cost: number;
  bonuses: StatBonuses;
  baseHp?: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  type: 'projectile' | 'area' | 'passive' | 'aura' | 'orbit' | 'melee';
  maxLevel: number;
  baseDamage: number;
  damagePerLevel: number;
  cooldown: number;
  cooldownReduction: number;
  unlockRegion?: RegionId;
  evolution: {
    name: string;
    description: string;
    requiresUpgrade: string;
    requiresStacks: number;
    icon: string;
  };
}

export interface WeaponState {
  id: WeaponId;
  level: number;
  evolved: boolean;
  cooldownLeft: number;
  extra: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  sprite: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  coinChance: number;
  coinValue: number;
  scale: number;
  behavior: 'chaser' | 'swarm' | 'tank' | 'shooter' | 'drainer' | 'storm' | 'elite' | 'boss';
  color: string;
  elite?: boolean;
  description: string;
  attackCooldown?: number;
  variants?: number;
}

export interface BossDef extends EnemyDef {
  title: string;
  pattern: 'bureaucracy' | 'shark' | 'kraken' | 'dragon' | 'guardian';
  phase2At: number;
}

export interface RegionDef {
  id: RegionId;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  objective: string;
  duration: number;
  art: string;
  color: string;
  gradient: [string, string];
  spawn: { start: number; end: number; maxAlive: number };
  enemyPool: { id: string; weight: number }[];
  bossId: string;
  bossAt: number;
  eliteChance: number;
  clearReward: number;
  difficultyReward: number;
  tip: string;
}

export interface RunUpgradeDef {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string;
  emoji: string;
  kind: 'stat' | 'weapon' | 'newWeapon' | 'heal' | 'coins' | 'evolution' | 'special';
  stat?: StatKey;
  amount?: number;
  weaponId?: WeaponId;
  maxStacks: number;
  minLevel?: number;
  tags?: string[];
}

export interface EvolutionOffer {
  weaponId: WeaponId;
  name: string;
  description: string;
  icon: string;
}

export interface MetaUpgradeDef {
  id: string;
  name: string;
  description: string;
  category: 'combate' | 'viagem' | 'sorte';
  icon: string;
  emoji: string;
  baseCost: number;
  maxLevel: number;
  effectPerLevel: number;
  effectText: (level: number) => string;
  requires?: { id: string; level: number }[];
  tier: number;
  column: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: 'inicio' | 'romance' | 'sobrevivencia' | 'progressao';
  icon: string;
  emoji: string;
  reward: number;
  secret?: boolean;
  check: (ctx: AchievementContext) => boolean;
  progress?: (ctx: AchievementContext) => { current: number; target: number };
}

export interface AchievementContext {
  save: SaveData;
  run?: RunSnapshot;
}

export interface LoiraDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  personality: string;
  story: string;
  portrait: string;
  color: string;
  accent: string;
  requirement: string;
  check: (summary: RunSummary, save: SaveData) => boolean;
}

export interface EndingsDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  condition: string;
  check: (summary: RunSummary, save: SaveData) => boolean;
}

export interface GameEventDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  emoji: string;
  tone: 'good' | 'bad' | 'neutral' | 'challenge';
  weight: number;
  effect: string;
}

export interface SaveSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  quality: 'alta' | 'media' | 'baixa';
  joystickSide: 'esquerda' | 'direita';
  loadout: WeaponId[];
  showFps: boolean;
}

export interface PlayerStats {
  runsStarted: number;
  runsFinished: number;
  runsWon: number;
  deaths: number;
  portugalReaches: number;
  portugalWins: number;
  conquests: number;
  bestTime: number;
  bestLevel: number;
  totalKills: number;
  bossKills: number;
  coinsCollected: number;
  tempCoinsBanked: number;
  upgradesChosen: number;
  metaUpgradesBought: number;
  maxWinStreak: number;
  winStreak: number;
  totalTimePlayed: number;
  noHitWins: number;
  lowHpWins: number;
  legendaryAtlantico: number;
  secretEndings: number;
}

export interface ConquestRecord {
  loiraId: string;
  conqueredAt: string;
  order: number;
  endingId: string;
  difficulty: DifficultyId;
}

export interface SaveData {
  version: number;
  permanentCoins: number;
  unlockedRegions: RegionId[];
  clearedRegions: RegionId[];
  unlockedCharacters: CharacterId[];
  unlockedWeapons: WeaponId[];
  meta: Record<string, number>;
  achievements: Record<string, { unlockedAt: string }>;
  stats: PlayerStats;
  album: Record<string, ConquestRecord>;
  endings: Record<string, { count: number; firstAt: string }>;
  bestTimes: Partial<Record<RegionId, number>>;
  settings: SaveSettings;
  createdAt: string;
  lastPlayedAt: string;
  flags: Record<string, number>;
}

export interface WeaponRuntimeInfo {
  id: WeaponId;
  level: number;
  evolved: boolean;
  cooldownRatio: number;
}

export interface BuffInfo {
  id: string;
  label: string;
  emoji: string;
  seconds: number;
  tone: 'good' | 'bad';
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  timeLeft: number;
  elapsed: number;
  duration: number;
  coins: number;
  kills: number;
  regionId: RegionId;
  regionName: string;
  difficulty: DifficultyId;
  weapons: WeaponRuntimeInfo[];
  boss: { name: string; hp: number; maxHp: number; phase: number } | null;
  buffs: BuffInfo[];
  specialCooldown: number;
  specialMax: number;
  challenge: { name: string; seconds: number; done: boolean } | null;
  revivesLeft: number;
}

export interface RunConfig {
  regionId: RegionId;
  difficulty: DifficultyId;
  characterId: CharacterId;
  loadout: WeaponId[];
}

export interface RunSummary {
  config: RunConfig;
  victory: boolean;
  time: number;
  duration: number;
  level: number;
  kills: number;
  bossKills: number;
  bossDefeated: boolean;
  coins: number;
  xp: number;
  upgrades: number;
  hpRatio: number;
  noHit: boolean;
  lowHpMoment: boolean;
  challenges: number;
  challengesCompleted: number;
  score: number;
  endingId: string;
  loiraId: string | null;
  evolvedWeapons: WeaponId[];
  ownedWeapons: WeaponId[];
  maxWeaponLevel: number;
}

export interface RunSnapshot {
  regionId: RegionId;
  difficulty: DifficultyId;
  victory?: boolean;
  kills: number;
  level: number;
  coins: number;
  bossKills: number;
  hpRatio: number;
  noHit: boolean;
  challenges: number;
  ended?: boolean;
  bossDefeated?: boolean;
  score?: number;
  maxWeaponLevel?: number;
}

export interface MetaEffectSummary {
  damage: number;
  maxHp: number;
  moveSpeed: number;
  luck: number;
  xpGain: number;
  armor: number;
  revives: number;
  coinConversion: number;
  eventMultiplier: number;
  durationMult: number;
  conquestScore: number;
  coinGain: number;
}

export interface OfferCard {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  icon: string;
  emoji: string;
  kind: RunUpgradeDef['kind'];
  upgradeId?: string;
  weaponId?: WeaponId;
  isEvolution?: boolean;
  currentLevel?: number;
  nextLevel?: number;
  footer?: string;
}

export interface GameLaunch {
  config: RunConfig;
  save: SaveData;
  seed?: number;
  onHud: (snapshot: HudSnapshot) => void;
  onLevelUp: (offers: OfferCard[]) => void;
  onEvent: (event: GameEventDef, detail: string, tone: string) => void;
  onChallenge: (name: string | null) => void;
  onToast: (message: string, tone?: 'good' | 'bad' | 'info' | 'gold') => void;
  onEnd: (summary: RunSummary) => void;
  onBoss: (boss: { name: string; hp: number; maxHp: number } | null) => void;
  onPaused: (paused: boolean) => void;
  onAchievementsDirty: (snapshot?: RunSnapshot) => void;
}
