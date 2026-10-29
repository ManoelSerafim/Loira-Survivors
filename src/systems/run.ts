import type {
  BuffInfo,
  OfferCard,
  Rarity,
  RegionDef,
  RunConfig,
  RunSnapshot,
  RunUpgradeDef,
  SaveData,
  StatBonuses,
  WeaponId,
  WeaponState,
} from '../core/types';
import { computeDerived, mergeBonuses, type DerivedStats } from '../core/stats';
import { Rng } from '../core/rng';
import { getCharacter } from '../data/characters';
import { getRegion } from '../data/regions';
import { getWeapon, WEAPONS, weaponDamage } from '../data/weapons';
import { getUpgrade, RARITY_INFO, STAT_UPGRADES } from '../data/upgrades';
import { getMetaEffects } from '../systems/progression';
import { mitigateDamage, xpToNext } from '../systems/combat';

export interface RunBuff {
  id: string;
  label: string;
  emoji: string;
  duration: number;
  remaining: number;
  effects: StatBonuses;
  tone: 'good' | 'bad';
}

export interface TakeDamageResult {
  amount: number;
  died: boolean;
  revived: boolean;
}

export class RunModel {
  readonly config: RunConfig;
  readonly save: SaveData;
  readonly rng: Rng;
  readonly region: RegionDef;
  readonly duration: number;
  readonly character;
  readonly meta;
  readonly maxWeaponSlots = 6;
  readonly weapons = new Map<WeaponId, WeaponState>();
  readonly stacks: Record<string, number> = {};
  readonly upgrades: RunUpgradeDef[] = [];

  bonuses: StatBonuses = {};
  derived: DerivedStats;
  hp: number;
  level = 1;
  xp = 0;
  xpNeeded: number;
  coins = 0;
  kills = 0;
  bossKills = 0;
  upgradesChosen = 0;
  elapsed = 0;
  damageTaken = 0;
  noHit = true;
  lowHpMoment = false;
  revivesLeft: number;
  buffs: RunBuff[] = [];
  rerollsUsed = 0;
  private baseBonuses: StatBonuses;

  constructor(config: RunConfig, save: SaveData, seed = Date.now()) {
    this.config = config;
    this.save = save;
    this.rng = new Rng(seed);
    this.region = getRegion(config.regionId);
    this.character = getCharacter(config.characterId);
    this.meta = getMetaEffects(save);
    this.duration = Math.max(45, Math.round(this.region.duration * this.meta.durationMult));
    this.baseBonuses = mergeBonuses(this.character.bonuses, {
      damage: this.meta.damage,
      maxHp: this.meta.maxHp,
      moveSpeed: this.meta.moveSpeed,
      luck: this.meta.luck,
      xpGain: this.meta.xpGain,
      armor: this.meta.armor,
      revives: this.meta.revives,
    });
    this.derived = computeDerived(this.baseBonuses);
    this.hp = this.derived.maxHp;
    this.xpNeeded = xpToNext(this.level);
    this.revivesLeft = this.derived.revives;

    const unlocked = new Set(save.unlockedWeapons);
    const loadout = config.loadout.filter((id) => unlocked.has(id)).slice(0, 2);
    const finalLoadout = loadout.length ? loadout : (['chinelo'] as WeaponId[]);
    for (const id of finalLoadout) {
      if (!this.weapons.has(id)) {
        this.weapons.set(id, { id, level: 1, evolved: false, cooldownLeft: 0, extra: 0 });
      }
    }
    this.recompute();
  }

  get regionName(): string {
    return this.region.name;
  }

  get maxWeaponLevel(): number {
    return Math.max(0, ...[...this.weapons.values()].map((weapon) => weapon.level));
  }

  get unlockedWeapons(): WeaponId[] {
    return this.save.unlockedWeapons;
  }

  recompute(keepHpGain = false): void {
    const oldMax = this.derived.maxHp;
    const passive: StatBonuses = {};
    for (const weapon of this.weapons.values()) {
      if (weapon.id === 'mochila') {
        passive.armor = (passive.armor ?? 0) + 0.75 + weapon.level * 0.45 + (weapon.evolved ? 1.5 : 0);
      }
      if (weapon.id === 'passaporte') {
        passive.luck = (passive.luck ?? 0) + weapon.level * 2.5 + (weapon.evolved ? 10 : 0);
        passive.coinGain = (passive.coinGain ?? 0) + weapon.level * 0.025;
      }
      if (weapon.id === 'carisma') {
        passive.range = (passive.range ?? 0) + 0.03 + weapon.level * 0.01;
      }
    }
    const buffBonus: StatBonuses = {};
    for (const buff of this.buffs) {
      for (const [key, value] of Object.entries(buff.effects) as [keyof StatBonuses, number][]) {
        buffBonus[key] = (buffBonus[key] ?? 0) + value;
      }
    }
    this.bonuses = mergeBonuses(this.baseBonuses, this.stacksToBonuses(), passive, buffBonus);
    this.derived = computeDerived(this.bonuses);
    if (keepHpGain && this.derived.maxHp > oldMax) {
      this.hp += this.derived.maxHp - oldMax;
    }
    this.hp = Math.min(this.hp, this.derived.maxHp);
    if (this.revivesLeft < this.derived.revives) {
      this.revivesLeft = this.derived.revives;
    }
  }

  private stacksToBonuses(): StatBonuses {
    const bonuses: StatBonuses = {};
    for (const [id, count] of Object.entries(this.stacks)) {
      if (count <= 0) continue;
      const def = getUpgrade(id);
      if (!def || !def.stat || def.amount === undefined) continue;
      bonuses[def.stat] = (bonuses[def.stat] ?? 0) + def.amount * count;
      if (def.id === 'campeao') {
        bonuses.moveSpeed = (bonuses.moveSpeed ?? 0) + 0.1 * count;
      }
    }
    return bonuses;
  }

  addXp(amount: number): number {
    this.xp += amount * this.derived.xpMult;
    let gained = 0;
    while (this.xp >= this.xpNeeded && this.level < 60) {
      this.xp -= this.xpNeeded;
      this.level += 1;
      this.xpNeeded = xpToNext(this.level);
      gained += 1;
    }
    return gained;
  }

  addCoins(amount: number, applyMultiplier = true): number {
    const value = Math.max(0, Math.round(amount * (applyMultiplier ? this.derived.coinMult : 1)));
    this.coins += value;
    return value;
  }

  spendCoins(amount: number): boolean {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
  }

  addKill(isBoss = false): void {
    this.kills += 1;
    if (isBoss) this.bossKills += 1;
  }

  takeDamage(raw: number): TakeDamageResult {
    const amount = mitigateDamage(raw, this.derived.armor);
    this.hp -= amount;
    this.damageTaken += amount;
    this.noHit = false;
    if (this.hp / this.derived.maxHp < 0.05) this.lowHpMoment = true;
    if (this.hp <= 0) {
      if (this.revivesLeft > 0) {
        this.revivesLeft -= 1;
        this.hp = Math.round(this.derived.maxHp * 0.45);
        return { amount, died: false, revived: true };
      }
      this.hp = 0;
      return { amount, died: true, revived: false };
    }
    return { amount, died: false, revived: false };
  }

  heal(amount: number): number {
    const before = this.hp;
    this.hp = Math.min(this.derived.maxHp, this.hp + amount);
    return this.hp - before;
  }

  healPercent(ratio: number): number {
    return this.heal(this.derived.maxHp * ratio);
  }

  addBuff(
    id: string,
    label: string,
    emoji: string,
    duration: number,
    effects: StatBonuses,
    tone: 'good' | 'bad' = 'good',
  ): void {
    const existing = this.buffs.find((buff) => buff.id === id);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.duration = Math.max(existing.duration, duration);
    } else {
      this.buffs.push({ id, label, emoji, duration, remaining: duration, effects, tone });
    }
    this.recompute();
  }

  tick(dt: number): void {
    this.elapsed += dt;
    if (this.derived.regen > 0) this.heal(this.derived.regen * dt);
    if (!this.buffs.length) return;
    let changed = false;
    for (const buff of this.buffs) {
      buff.remaining -= dt;
      if (buff.remaining <= 0) changed = true;
    }
    if (changed) {
      this.buffs = this.buffs.filter((buff) => buff.remaining > 0);
      this.recompute();
    }
  }

  getBuffInfos(): BuffInfo[] {
    return this.buffs.map((buff) => ({
      id: buff.id,
      label: buff.label,
      emoji: buff.emoji,
      seconds: Math.ceil(buff.remaining),
      tone: buff.tone,
    }));
  }

  getWeaponState(id: WeaponId): WeaponState | undefined {
    return this.weapons.get(id);
  }

  getWeaponDamage(defId: WeaponId): number {
    const state = this.weapons.get(defId);
    if (!state) return 0;
    return weaponDamage(getWeapon(defId), state.level, state.evolved) * this.derived.damageMult;
  }

  hasEvolutionReady(): WeaponId[] {
    const ready: WeaponId[] = [];
    for (const state of this.weapons.values()) {
      if (state.evolved || state.level < getWeapon(state.id).maxLevel) continue;
      const evo = getWeapon(state.id).evolution;
      if ((this.stacks[evo.requiresUpgrade] ?? 0) >= evo.requiresStacks) ready.push(state.id);
    }
    return ready;
  }

  evolutionRequirementMet(id: WeaponId): boolean {
    return this.hasEvolutionReady().includes(id);
  }

  buildOffers(rng: Rng = this.rng): OfferCard[] {
    const offers: OfferCard[] = [];
    const used = new Set<string>();
    const evolutionCandidates = this.hasEvolutionReady();
    if (evolutionCandidates.length) {
      const id = rng.pick(evolutionCandidates);
      const def = getWeapon(id);
      const offer: OfferCard = {
        id: `evo_${id}`,
        name: def.evolution.name,
        description: def.evolution.description,
        rarity: 'lendario',
        icon: def.evolution.icon,
        emoji: '✨',
        kind: 'evolution',
        weaponId: id,
        isEvolution: true,
        footer: 'Evolução de arma',
      };
      offers.push(offer);
      used.add(offer.id);
    }

    const candidates: { card: OfferCard; weight: number }[] = [];

    for (const state of this.weapons.values()) {
      const def = getWeapon(state.id);
      if (state.level >= def.maxLevel) continue;
      const rarity: Rarity = state.level >= 4 ? 'epico' : 'raro';
      candidates.push({
        card: {
          id: `weapon_${state.id}_${state.level + 1}`,
          name: def.name,
          description: `Nível ${state.level} → ${state.level + 1}. ${levelUpBlurb(state.id)}`,
          rarity,
          icon: def.icon,
          emoji: '⬆️',
          kind: 'weapon',
          weaponId: state.id,
          currentLevel: state.level,
          nextLevel: state.level + 1,
          footer: `Arma • Nível ${state.level + 1}`,
        },
        weight: 38 + (state.level < 2 ? 10 : 0),
      });
    }

    if (this.weapons.size < this.maxWeaponSlots) {
      for (const id of this.save.unlockedWeapons) {
        if (this.weapons.has(id)) continue;
        const def = getWeapon(id);
        candidates.push({
          card: {
            id: `new_${id}`,
            name: def.name,
            description: def.description,
            rarity: 'epico',
            icon: def.icon,
            emoji: '🎁',
            kind: 'newWeapon',
            weaponId: id,
            footer: 'Nova arma',
          },
          weight: 15,
        });
      }
    }

    const luckFactor = this.derived.luck / 100;
    for (const def of STAT_UPGRADES) {
      if (def.minLevel && this.level < def.minLevel) continue;
      const taken = this.stacks[def.id] ?? 0;
      if (taken >= def.maxStacks) continue;
      const baseWeight = RARITY_INFO[def.rarity].weight;
      const rarityLuck =
        def.rarity === 'comum'
          ? 1 - luckFactor * 0.35
          : def.rarity === 'raro'
            ? 1 + luckFactor * 0.25
            : def.rarity === 'epico'
              ? 1 + luckFactor * 0.65
              : 1 + luckFactor * 1.3;
      const weight = (def.kind === 'heal' || def.kind === 'coins' ? 5.5 : baseWeight) * Math.max(0.25, rarityLuck);
      candidates.push({
        card: {
          id: `up_${def.id}`,
          name: def.name,
          description: def.description,
          rarity: def.rarity,
          icon: def.icon,
          emoji: def.emoji,
          kind: def.kind,
          upgradeId: def.id,
          footer:
            def.kind === 'heal' || def.kind === 'coins'
              ? 'Consumível'
              : `Passiva • ${taken}/${def.maxStacks}`,
        },
        weight,
      });
    }

    let guard = 0;
    while (offers.length < 3 && guard < 100) {
      guard += 1;
      const available = candidates.filter((candidate) => !used.has(candidate.card.id) && candidate.weight > 0);
      if (!available.length) break;
      const picked = rng.weighted(available.map((candidate) => ({ item: candidate, weight: candidate.weight })));
      if (!picked) break;
      offers.push(picked.card);
      used.add(picked.card.id);
      const index = candidates.indexOf(picked);
      if (index >= 0) candidates.splice(index, 1);
    }

    // Fallback consumables so there are always three choices
    const fallbacks: OfferCard[] = [
      {
        id: `fallback_heal_${offers.length}`,
        name: 'Lanche de Estrada',
        description: 'Recupera 35% da vida máxima agora.',
        rarity: 'comum',
        icon: '',
        emoji: '🥥',
        kind: 'heal',
        upgradeId: 'lanche',
        footer: 'Consumível',
      },
      {
        id: `fallback_coins_${offers.length}`,
        name: 'Gorjeta Inesperada',
        description: 'Ganha 25 moedas temporárias na hora.',
        rarity: 'comum',
        icon: '',
        emoji: '💸',
        kind: 'coins',
        upgradeId: 'gorjeta',
        footer: 'Consumível',
      },
    ];
    for (const fallback of fallbacks) {
      if (offers.length >= 3) break;
      offers.push({ ...fallback, id: `${fallback.id}_${offers.length}` });
    }
    return offers.slice(0, 3);
  }

  applyOffer(offer: OfferCard): string {
    this.upgradesChosen += 1;
    if (offer.kind === 'evolution' && offer.weaponId) {
      const state = this.weapons.get(offer.weaponId);
      if (state) {
        state.evolved = true;
        this.recompute();
        return `${getWeapon(offer.weaponId).evolution.name} desbloqueada!`;
      }
      return 'Evolução aplicada.';
    }
    if (offer.kind === 'weapon' && offer.weaponId) {
      const state = this.weapons.get(offer.weaponId);
      if (state) {
        state.level = Math.min(getWeapon(state.id).maxLevel, state.level + 1);
        this.recompute(true);
      }
      return `${getWeapon(offer.weaponId).name} subiu para o nível ${state?.level ?? 1}.`;
    }
    if (offer.kind === 'newWeapon' && offer.weaponId && this.weapons.size < this.maxWeaponSlots) {
      this.weapons.set(offer.weaponId, {
        id: offer.weaponId,
        level: 1,
        evolved: false,
        cooldownLeft: 0,
        extra: 0,
      });
      this.recompute(true);
      return `${getWeapon(offer.weaponId).name} equipada!`;
    }
    if (offer.upgradeId) {
      const def = getUpgrade(offer.upgradeId);
      if (!def) return 'Upgrade aplicado.';
      if (def.kind === 'heal') {
        this.healPercent(def.amount ?? 0.35);
        return 'Vida recuperada.';
      }
      if (def.kind === 'coins') {
        const added = this.addCoins(def.amount ?? 25);
        return `+${added} moedas temporárias.`;
      }
      const current = this.stacks[def.id] ?? 0;
      if (current >= def.maxStacks) return 'Limite atingido.';
      this.stacks[def.id] = current + 1;
      this.upgrades.push(def);
      this.recompute(true);
      if (def.id === 'vitalidade') this.healPercent(0.12);
      if (def.id === 'revive') this.revivesLeft += 1;
      return `${def.name} adquirido!`;
    }
    return 'Upgrade aplicado.';
  }

  addWeaponLevel(id: WeaponId): boolean {
    const state = this.weapons.get(id);
    if (!state) return false;
    if (state.level >= getWeapon(id).maxLevel) return false;
    state.level += 1;
    this.recompute(true);
    return true;
  }

  evolveWeapon(id: WeaponId): boolean {
    const state = this.weapons.get(id);
    if (!state) return false;
    if (state.evolved) return false;
    state.evolved = true;
    this.recompute();
    return true;
  }

  addRandomWeaponIfPossible(): WeaponId | null {
    if (this.weapons.size >= this.maxWeaponSlots) return null;
    const candidates = this.save.unlockedWeapons.filter((id) => !this.weapons.has(id));
    if (!candidates.length) return null;
    const id = this.rng.pick(candidates);
    this.weapons.set(id, { id, level: 1, evolved: false, cooldownLeft: 0, extra: 0 });
    this.recompute(true);
    return id;
  }

  makeSnapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
    return {
      regionId: this.config.regionId,
      difficulty: this.config.difficulty,
      kills: this.kills,
      level: this.level,
      coins: this.coins,
      bossKills: this.bossKills,
      hpRatio: this.hp / this.derived.maxHp,
      noHit: this.noHit,
      challenges: 0,
      maxWeaponLevel: this.maxWeaponLevel,
      ...overrides,
    };
  }
}

function levelUpBlurb(id: WeaponId): string {
  const blurbs: Record<WeaponId, string> = {
    chinelo: 'Mais dano e velocidade de retorno.',
    pix: 'Explosões maiores e mais frequentes.',
    mochila: 'Mais armadura e pulsos de cura.',
    cafe: 'Buff mais forte e duradouro.',
    carisma: 'Aura maior e dano contínuo.',
    passaporte: 'Mais raios e bônus de moedas.',
    combo: 'Golpes mais rápidos e devastadores.',
    mala: 'Mais dano por impacto orbital.',
  };
  return blurbs[id];
}

export function weaponIdsOf(model: RunModel): WeaponId[] {
  return [...model.weapons.keys()];
}

export function allWeaponsUnlocked(): WeaponId[] {
  return WEAPONS.map((weapon) => weapon.id);
}
