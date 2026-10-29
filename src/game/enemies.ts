import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { EnemyRuntime } from './runtime';
import { ENEMY_PADDING } from './constants';
import { WORLD_HEIGHT, WORLD_WIDTH } from './background';

/** Movement and ranged behaviour for regular enemies. Bosses use bosses.ts. */
export function updateEnemyAI(scene: GameScene, enemy: EnemyRuntime, dt: number): void {
  const model = scene.model;
  if (model.elapsed < enemy.stunUntil) return;

  if (enemy.dashUntil > 0) {
    enemy.dashUntil -= dt;
    enemy.x += enemy.dashVx * dt;
    enemy.y += enemy.dashVy * dt;
    return;
  }

  const dx = scene.player.x - enemy.x;
  const dy = scene.player.y - enemy.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  enemy.dirX = dx;
  enemy.dirY = dy;
  const slow = model.elapsed < enemy.slowUntil ? 0.58 : 1;
  const speed = enemy.speed * slow * (model.elapsed < scene.stormUntil ? 1.18 : 1);
  const behavior = enemy.def.behavior;

  if (behavior === 'swarm') {
    const wobble = Math.sin(model.elapsed * 4.6 + enemy.id) * 0.42;
    enemy.x += Math.cos(angle + wobble) * speed * dt;
    enemy.y += Math.sin(angle + wobble) * speed * dt;
  } else if (behavior === 'shooter') {
    if (dist > 330) {
      enemy.x += Math.cos(angle) * speed * dt;
      enemy.y += Math.sin(angle) * speed * dt;
    } else if (dist < 245) {
      enemy.x -= Math.cos(angle) * speed * dt;
      enemy.y -= Math.sin(angle) * speed * dt;
    } else {
      const strafe = angle + Math.PI / 2;
      enemy.x += Math.cos(strafe) * speed * 0.4 * dt;
      enemy.y += Math.sin(strafe) * speed * 0.4 * dt;
    }
    enemy.attackTimer -= dt;
    if (enemy.attackTimer <= 0 && dist < 660) {
      enemy.attackTimer = (enemy.def.attackCooldown ?? 2600) / 1000;
      scene.spawnHostileProjectile(enemy.x, enemy.y - 28, angle, 240, enemy.damage * 0.72, 13, 0xffb35c, 1.1, 'p_dot');
      scene.playSfx('shoot', 520);
    }
  } else if (behavior === 'storm') {
    enemy.x += Math.cos(angle) * speed * 0.36 * dt;
    enemy.y += Math.sin(angle) * speed * 0.36 * dt;
    enemy.attackTimer -= dt;
    if (enemy.attackTimer <= 0) {
      enemy.attackTimer = (enemy.def.attackCooldown ?? 3000) / 1000;
      scene.queueBlast({
        x: scene.player.x,
        y: scene.player.y,
        radius: 58,
        damage: enemy.damage * 0.7,
        delay: 0.95,
        kind: 'lightning',
        color: 0x62b8ff,
        hostile: true,
      });
      scene.playSfx('event', 500);
    }
  } else if (behavior === 'elite') {
    if (dist > 120) {
      enemy.x += Math.cos(angle) * speed * dt;
      enemy.y += Math.sin(angle) * speed * dt;
    }
    enemy.actionTimer -= dt;
    if (enemy.actionTimer <= 0 && dist < 560) {
      enemy.actionTimer = 4.2;
      enemy.dashUntil = 0.4;
      enemy.dashVx = Math.cos(angle) * 540;
      enemy.dashVy = Math.sin(angle) * 540;
      scene.fx.ring(enemy.x, enemy.y - 20, 54, 0xff7b7b, 300, 0.5);
      scene.playSfx('dash', 260);
    }
  } else {
    enemy.x += Math.cos(angle) * speed * dt;
    enemy.y += Math.sin(angle) * speed * dt;
  }

  if (behavior === 'drainer') {
    const side = Math.sin(model.elapsed * 7 + enemy.id) * 0.28;
    enemy.x += Math.cos(angle + side) * speed * 0.35 * dt;
    enemy.y += Math.sin(angle + side) * speed * 0.35 * dt;
  }

  enemy.x = Phaser.Math.Clamp(enemy.x, ENEMY_PADDING, WORLD_WIDTH - ENEMY_PADDING);
  enemy.y = Phaser.Math.Clamp(enemy.y, ENEMY_PADDING, WORLD_HEIGHT - ENEMY_PADDING);
}
