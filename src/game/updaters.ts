import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { Blast, Pickup, Projectile } from './runtime';
import { WORLD_HEIGHT, WORLD_WIDTH } from './background';
import { WORLD_PADDING } from './constants';

export function updateProjectiles(scene: GameScene, dt: number): void {
  for (const projectile of scene.projectiles) {
    if (projectile.dead) continue;
    projectile.life -= dt;
    if (projectile.life <= 0) {
      projectile.dead = true;
      continue;
    }

    if (projectile.homing) {
      if (!projectile.target || projectile.target.dead) {
        projectile.target = scene.nearestEnemy(720, projectile.x, projectile.y);
      }
      const target = projectile.target;
      if (target) {
        const desired = Math.atan2(target.y - 12 - projectile.y, target.x - projectile.x);
        const current = Math.atan2(projectile.vy, projectile.vx);
        const diff = Phaser.Math.Angle.Wrap(desired - current);
        const turn = Phaser.Math.Clamp(diff, -7.5 * dt, 7.5 * dt);
        const next = current + turn;
        projectile.vx = Math.cos(next) * projectile.speed;
        projectile.vy = Math.sin(next) * projectile.speed;
      }
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.image
      .setPosition(projectile.x, projectile.y)
      .setDepth(40)
      .setRotation(projectile.image.rotation + projectile.spin * dt);

    if (projectile.ember) {
      projectile.emberTimer -= dt;
      if (projectile.emberTimer <= 0) {
        projectile.emberTimer = 0.18;
        scene.addHazard({
          x: projectile.x,
          y: projectile.y + 6,
          radius: 18,
          damage: projectile.damage * 0.11,
          life: 1.15,
          color: 0xff8a4c,
        });
      }
    }

    if (projectile.x < 8 || projectile.x > 2592 || projectile.y < 8 || projectile.y > 1992) {
      projectile.dead = true;
      continue;
    }

    if (projectile.hostile) {
      if (Phaser.Math.Distance.Between(projectile.x, projectile.y, scene.player.x, scene.player.y - 24) < projectile.radius + scene.playerRadius) {
        projectile.dead = true;
        scene.hurtPlayer(projectile.damage, projectile.x, projectile.y);
        scene.fx.burst(projectile.x, projectile.y, 0xff7b7b, 4, 24);
      }
      continue;
    }

    for (const enemy of scene.enemies) {
      if (enemy.dead || projectile.dead) continue;
      if (projectile.hits.has(enemy.id)) continue;
      if (Phaser.Math.Distance.Between(projectile.x, projectile.y, enemy.x, enemy.y - 14) > projectile.radius + enemy.radius) {
        continue;
      }
      projectile.hits.add(enemy.id);
      scene.damageEnemy(enemy, projectile.damage, projectile.crit, {
        bonusCoins: projectile.bonusCoins,
        color: 0x9be7ff,
      });
      scene.fx.burst(projectile.x, projectile.y, 0x9be7ff, 4, 24, 0.7);
      scene.playSfx('hit', 60);
      if (projectile.pierce > 0) {
        projectile.pierce -= 1;
      } else {
        projectile.dead = true;
      }
    }
  }

  const surviving: Projectile[] = [];
  for (const projectile of scene.projectiles) {
    if (projectile.dead) {
      projectile.image.destroy();
    } else {
      surviving.push(projectile);
    }
  }
  scene.projectiles = surviving;
}

export function updateBlasts(scene: GameScene, dt: number): void {
  for (const blast of scene.blasts) {
    if (blast.dead) continue;
    blast.delay -= dt;
    const pulse = 0.85 + Math.sin(scene.time.now * 0.018) * 0.12;
    blast.marker.setScale((blast.radius / 42) * pulse).setAlpha(0.65 + Math.sin(scene.time.now * 0.03) * 0.2);
    if (blast.delay > 0) continue;
    blast.dead = true;
    blast.marker.destroy();
    scene.resolveBlast(blast);
  }
  const surviving: Blast[] = [];
  for (const blast of scene.blasts) {
    if (!blast.dead) surviving.push(blast);
  }
  scene.blasts = surviving;
}

export function updateHazards(scene: GameScene, dt: number): void {
  for (const hazard of scene.hazards) {
    if (hazard.dead) continue;
    hazard.life -= dt;
    if (hazard.life <= 0) {
      hazard.dead = true;
      continue;
    }
    hazard.circle.setAlpha(Math.min(0.28, hazard.life * 0.35));
    hazard.tick -= dt;
    if (hazard.tick > 0) continue;
    hazard.tick = 0.32;
    if (hazard.hostile) {
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, scene.player.x, scene.player.y - 20) < hazard.radius + scene.playerRadius) {
        scene.hurtPlayer(hazard.damage, hazard.x, hazard.y);
      }
      continue;
    }
    for (const enemy of scene.enemies) {
      if (enemy.dead) continue;
      if (Phaser.Math.Distance.Between(hazard.x, hazard.y, enemy.x, enemy.y - 12) > hazard.radius + enemy.radius) continue;
      scene.damageEnemy(enemy, hazard.damage, false, { color: hazard.color });
    }
  }
  const surviving: typeof scene.hazards = [];
  for (const hazard of scene.hazards) {
    if (hazard.dead) hazard.circle.destroy();
    else surviving.push(hazard);
  }
  scene.hazards = surviving;
}

export function updatePickups(scene: GameScene, dt: number): void {
  for (const pickup of scene.pickups) {
    if (pickup.collected) continue;
    pickup.life -= dt;
    if (pickup.life <= 0) {
      pickup.collected = true;
      continue;
    }
    const dx = scene.player.x - pickup.x;
    const dy = scene.player.y - 26 - pickup.y;
    const dist = Math.hypot(dx, dy);
    const magnet = scene.model.derived.magnet;
    if (pickup.kind !== 'chest' && (dist < magnet || dist < 90)) {
      const speed = 260 + (1 - Math.min(1, dist / Math.max(40, magnet))) * 340;
      pickup.x += (dx / Math.max(1, dist)) * speed * dt;
      pickup.y += (dy / Math.max(1, dist)) * speed * dt;
    } else {
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      pickup.vx *= 0.92;
      pickup.vy *= 0.92;
    }
    pickup.x = Phaser.Math.Clamp(pickup.x, WORLD_PADDING, WORLD_WIDTH - WORLD_PADDING);
    pickup.y = Phaser.Math.Clamp(pickup.y, WORLD_PADDING, WORLD_HEIGHT - WORLD_PADDING);
    pickup.bob += dt * 4;
    const bobOffset = pickup.kind === 'chest' ? 0 : Math.sin(pickup.bob) * 4;
    pickup.image
      .setPosition(pickup.x, pickup.y + bobOffset)
      .setDepth(pickup.kind === 'chest' ? 18 : 16)
      .setAlpha(pickup.life < 4 ? 0.45 + Math.sin(scene.time.now * 0.02) * 0.4 : 1);
    pickup.glow?.setPosition(pickup.x, pickup.y + bobOffset).setDepth(15);

    if (dist < (pickup.kind === 'chest' ? 42 : 30)) {
      pickup.collected = true;
      scene.collectPickup(pickup);
    }
  }

  const surviving: Pickup[] = [];
  for (const pickup of scene.pickups) {
    if (pickup.collected) {
      pickup.image.destroy();
      pickup.glow?.destroy();
    } else {
      surviving.push(pickup);
    }
  }
  scene.pickups = surviving;
}
