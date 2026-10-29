import Phaser from 'phaser';
import type { WeaponId, WeaponState } from '../core/types';
import { getWeapon, weaponCooldown } from '../data/weapons';
import type { GameScene } from './GameScene';
import type { EnemyRuntime, PlayerShotOptions } from './runtime';

export class WeaponSystem {
  private orbitImages: Phaser.GameObjects.Image[] = [];
  private aura?: Phaser.GameObjects.Image;
  private orbitAngle = 0;
  private orbitRadius = 0;
  private auraRadius = 0;
  private cafeBurn = 0;

  constructor(private readonly scene: GameScene) {}

  refresh(): void {
    for (const image of this.orbitImages) image.destroy();
    this.orbitImages = [];
    this.aura?.destroy();
    this.aura = undefined;

    const model = this.scene.model;
    const mala = model.weapons.get('mala');
    if (mala) {
      const count = 1 + (mala.level >= 3 ? 1 : 0) + (mala.evolved ? 2 : 0) + Math.min(2, Math.floor(model.derived.projectiles));
      this.orbitRadius = (84 + mala.level * 5 + (mala.evolved ? 28 : 0)) * model.derived.areaMult;
      for (let i = 0; i < count; i++) {
        const image = this.scene.add
          .image(this.scene.player.x, this.scene.player.y - 24, 'weapon_mala')
          .setScale(0.46)
          .setDepth(34)
          .setAlpha(0.95);
        this.orbitImages.push(image);
      }
    }

    const carisma = model.weapons.get('carisma');
    if (carisma) {
      this.auraRadius = (104 + carisma.level * 9 + (carisma.evolved ? 48 : 0)) * model.derived.areaMult;
      this.aura = this.scene.add
        .image(this.scene.player.x, this.scene.player.y - 20, 'p_ring')
        .setTint(0xff5c9a)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(6)
        .setAlpha(0.13)
        .setScale(this.auraRadius / 58);
    }
  }

  destroy(): void {
    for (const image of this.orbitImages) image.destroy();
    this.orbitImages = [];
    this.aura?.destroy();
    this.aura = undefined;
  }

  update(dt: number): void {
    const model = this.scene.model;
    this.orbitAngle += dt * (2.3 + model.derived.attackSpeed * 0.15);
    this.updateOrbit();
    this.updateCafeBurn(dt);

    for (const state of model.weapons.values()) {
      const def = getWeapon(state.id);
      if (state.id === 'mala') continue;
      if (state.id === 'carisma') {
        this.updateAura(state, dt);
        continue;
      }
      state.cooldownLeft -= dt;
      if (state.cooldownLeft > 0) continue;
      const fired = this.fire(state.id, state.level, state.evolved);
      state.cooldownLeft = fired
        ? weaponCooldown(def, state.level, state.evolved, model.derived.cooldownMult) /
          Math.max(0.55, model.derived.attackSpeed)
        : 0.16;
    }
  }

  private updateAura(state: WeaponState, dt: number): void {
    const model = this.scene.model;
    if (!this.aura) return;
    this.aura
      .setPosition(this.scene.player.x, this.scene.player.y - 20)
      .setAlpha(0.1 + Math.sin(this.scene.time.now * 0.005) * 0.035)
      .setScale((this.auraRadius / 58) * (1 + Math.sin(this.scene.time.now * 0.003) * 0.025));

    state.cooldownLeft -= dt;
    if (state.cooldownLeft > 0) return;
    state.cooldownLeft = 0.5 / Math.max(0.6, model.derived.attackSpeed);

    const roll = this.scene.rollDamage('carisma');
    const damage = roll.damage * (state.evolved ? 1.9 : 1);
    for (const enemy of this.scene.enemies) {
      if (enemy.dead) continue;
      if (Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y) > this.auraRadius + enemy.radius) continue;
      enemy.slowUntil = model.elapsed + 0.85;
      this.scene.damageEnemy(enemy, damage, roll.crit, {
        bonusCoins: state.evolved ? 1 : 0,
        color: 0xff5c9a,
      });
    }
    if (state.evolved) this.scene.fx.ring(this.scene.player.x, this.scene.player.y, this.auraRadius, 0xff77ad, 380, 0.18);
  }

  private updateOrbit(): void {
    if (!this.orbitImages.length) return;
    const model = this.scene.model;
    const mala = model.weapons.get('mala');
    if (!mala) return;
    const count = this.orbitImages.length;
    for (let i = 0; i < count; i++) {
      const angle = this.orbitAngle + (i / count) * Math.PI * 2;
      const image = this.orbitImages[i];
      image
        .setPosition(
          this.scene.player.x + Math.cos(angle) * this.orbitRadius,
          this.scene.player.y - 24 + Math.sin(angle) * this.orbitRadius * 0.72,
        )
        .setDepth(34 + Math.sin(angle) * 0.1)
        .setAngle(image.angle + 1.8)
        .setAlpha(0.92);
    }

    for (const enemy of this.scene.enemies) {
      if (enemy.dead) continue;
      const nextHit = enemy.hitCooldowns.get('mala') ?? 0;
      if (nextHit > model.elapsed) continue;
      for (const image of this.orbitImages) {
        if (Phaser.Math.Distance.Between(image.x, image.y, enemy.x, enemy.y - 10) > enemy.radius + 22) continue;
        const roll = this.scene.rollDamage('mala');
        this.scene.damageEnemy(enemy, roll.damage, roll.crit, { color: 0xff8b7b });
        enemy.hitCooldowns.set('mala', model.elapsed + 0.42);
        const angle = Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y);
        const push = mala.evolved ? 260 : 120;
        if (!enemy.boss) {
          enemy.vx += Math.cos(angle) * push;
          enemy.vy += Math.sin(angle) * push;
        }
        break;
      }
    }
  }

  private updateCafeBurn(dt: number): void {
    const model = this.scene.model;
    const cafe = model.weapons.get('cafe');
    if (!cafe?.evolved || !model.buffs.some((buff) => buff.id === 'cafe_turbo')) return;
    this.cafeBurn -= dt;
    if (this.cafeBurn > 0) return;
    this.cafeBurn = 0.5;
    const radius = 150 * model.derived.areaMult;
    const damage = 11 * model.derived.damageMult * (1 + cafe.level * 0.18);
    for (const enemy of this.scene.enemies) {
      if (enemy.dead) continue;
      if (Phaser.Math.Distance.Between(this.scene.player.x, this.scene.player.y, enemy.x, enemy.y) > radius + enemy.radius) continue;
      this.scene.damageEnemy(enemy, damage, model.rng.chance(model.derived.critChance), { color: 0xffa45c });
    }
    this.scene.fx.ring(this.scene.player.x, this.scene.player.y, radius, 0xff9e58, 340, 0.24);
  }

  private fire(id: WeaponId, level: number, evolved: boolean): boolean {
    const scene = this.scene;
    const model = scene.model;
    const player = scene.player;

    if (id === 'chinelo') {
      const target = scene.nearestEnemy(560 * model.derived.rangeMult);
      if (!target) return false;
      const roll = scene.rollDamage('chinelo');
      scene.spawnPlayerShot({
        x: player.x,
        y: player.y - 32,
        target,
        speed: 700,
        damage: roll.damage,
        crit: roll.crit,
        radius: 23,
        pierce: evolved ? 4 : 0,
        homing: true,
        texture: 'weapon_chinelo',
        scale: 0.5,
        spin: 16,
        life: 1.7,
        ember: evolved,
        weaponId: 'chinelo',
      });
      scene.playSfx('shoot', 90);
      return true;
    }

    if (id === 'pix') {
      const target = this.pickCrowdTarget(520);
      if (!target) return false;
      const roll = scene.rollDamage('pix');
      const radius = (78 + level * 4) * model.derived.areaMult;
      scene.queueBlast({ x: target.x, y: target.y - 10, radius, damage: roll.damage, delay: 0.2, kind: 'pix', color: 0x3fffd2 });
      if (evolved) {
        scene.queueBlast({
          x: target.x,
          y: target.y - 10,
          radius: radius * 1.25,
          damage: roll.damage * 0.82,
          delay: 0.42,
          kind: 'pix',
          color: 0x74ffe2,
        });
      }
      scene.playSfx('shoot', 120);
      return true;
    }

    if (id === 'mochila') {
      const healed = model.healPercent(0.045 + level * 0.012);
      scene.fx.ring(player.x, player.y - 8, 74 + level * 6, 0x74e08b, 520, 0.4);
      scene.fx.text(player.x, player.y - 66, `+${Math.round(healed)}`, '#9af7b0', 17);
      if (evolved) {
        const radius = 150 * model.derived.areaMult;
        const damage = 13 * model.derived.damageMult * (1 + level * 0.16);
        for (const enemy of scene.enemies) {
          if (enemy.dead) continue;
          if (Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) > radius + enemy.radius) continue;
          scene.damageEnemy(enemy, damage, model.rng.chance(model.derived.critChance), { color: 0x74e08b });
        }
        scene.fx.ring(player.x, player.y, radius, 0x8cf0a5, 420, 0.35);
      }
      scene.playSfx('pickup', 180);
      return true;
    }

    if (id === 'cafe') {
      const duration = 5.5 + level * 0.55 + (evolved ? 1.8 : 0);
      model.addBuff('cafe_turbo', evolved ? 'Café Turbo' : 'Café na Veia', '☕', duration, {
        attackSpeed: 0.17 + level * 0.032 + (evolved ? 0.16 : 0),
        moveSpeed: 0.1,
      });
      scene.fx.ring(player.x, player.y - 10, 82, 0xd9a066, 480, 0.42);
      scene.fx.text(player.x, player.y - 72, 'CAFÉ!', '#ffcf8a', 17);
      scene.playSfx('event', 400);
      return true;
    }

    if (id === 'passaporte') {
      const inRange = scene.enemiesInRange(player.x, player.y, 680 * model.derived.rangeMult);
      if (!inRange.length) return false;
      const shuffled = model.rng.shuffle(inRange);
      const count = evolved
        ? Math.min(9, shuffled.length)
        : Math.min(1 + Math.floor((level - 1) / 2) + Math.floor(model.derived.projectiles), shuffled.length);
      for (let i = 0; i < count; i++) {
        const enemy = shuffled[i];
        const roll = scene.rollDamage('passaporte');
        scene.queueBlast({
          x: enemy.x,
          y: enemy.y - 8,
          radius: (42 + level * 2) * model.derived.areaMult,
          damage: roll.damage,
          delay: 0.18 + i * 0.075,
          kind: 'lightning',
          color: 0xffd166,
        });
      }
      scene.playSfx('shoot', 110);
      return true;
    }

    if (id === 'combo') {
      const target = scene.nearestEnemy(175 * model.derived.rangeMult);
      if (!target) return false;
      const angle = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
      const radius = (128 + level * 7) * model.derived.areaMult;
      const roll = scene.rollDamage('combo');
      const hitDamage = roll.damage * (evolved ? 1.85 : 1.25);
      for (const enemy of scene.enemies) {
        if (enemy.dead) continue;
        if (Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) > radius + enemy.radius) continue;
        const enemyAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
        if (Math.abs(Phaser.Math.Angle.Wrap(enemyAngle - angle)) > 1.35) continue;
        scene.damageEnemy(enemy, hitDamage, roll.crit, { color: 0xffa35c });
      }
      const hits = evolved ? 5 : 3;
      for (let i = 0; i < hits; i++) {
        scene.time.delayedCall(i * 65, () => {
          if (!scene.sys.isActive()) return;
          scene.fx.slash(player.x, player.y - 28, angle + (i % 2 === 0 ? 0.25 : -0.25), 0xffb35c, radius * 0.9);
        });
      }
      scene.fx.ring(player.x, player.y - 10, radius, 0xff9d5c, 260, 0.28);
      if (evolved) {
        scene.grantInvulnerability(0.4);
        scene.queueBlast({
          x: player.x,
          y: player.y - 10,
          radius: radius * 1.35,
          damage: hitDamage * 0.6,
          delay: 0.33,
          kind: 'guardian',
          color: 0xff7b4d,
        });
      }
      scene.playSfx('hit', 90);
      return true;
    }

    return false;
  }

  private pickCrowdTarget(range: number): EnemyRuntime | null {
    const candidates = this.scene.enemiesInRange(this.scene.player.x, this.scene.player.y, range);
    if (!candidates.length) return null;
    let best: EnemyRuntime | null = null;
    let bestScore = -1;
    for (const enemy of candidates) {
      let score = 1;
      for (const other of candidates) {
        if (other === enemy) continue;
        if (Phaser.Math.Distance.Between(enemy.x, enemy.y, other.x, other.y) < 110) score += 1;
      }
      if (score > bestScore) {
        best = enemy;
        bestScore = score;
      }
    }
    return best;
  }
}
