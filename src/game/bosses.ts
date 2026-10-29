import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import type { EnemyRuntime } from './runtime';

export function updateBossAI(scene: GameScene, enemy: EnemyRuntime, dt: number): void {
  const boss = enemy.bossDef;
  if (!boss) return;

  if (!enemy.phase2 && enemy.hp / enemy.maxHp <= boss.phase2At) {
    enemy.phase2 = true;
    enemy.speed *= 1.12;
    enemy.patternTimer = 0.75;
    scene.fx.ring(enemy.x, enemy.y - 40, 130, 0xff5c6b, 650, 0.75);
    scene.shake(320, 0.012);
    scene.notify(`${boss.name} entrou na Fase 2!`, 'bad');
  }

  if (enemy.telegraph > 0) {
    enemy.telegraph -= dt;
    if (enemy.telegraph <= 0) executeAction(scene, enemy);
    return;
  }

  if (enemy.dashUntil > 0) {
    enemy.dashUntil -= dt;
    enemy.x += enemy.dashVx * dt;
    enemy.y += enemy.dashVy * dt;
    if (Math.random() < 0.4) scene.fx.dashTrail(enemy.x, enemy.y - 40, 0xff8da0);
    return;
  }

  enemy.patternTimer -= dt;
  const dx = scene.player.x - enemy.x;
  const dy = scene.player.y - enemy.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  enemy.dirX = dx;
  enemy.dirY = dy;
  const move = (factor: number, toward = true) => {
    const sign = toward ? 1 : -1;
    enemy.x += (dx / dist) * enemy.speed * factor * sign * dt;
    enemy.y += (dy / dist) * enemy.speed * factor * sign * dt;
  };

  const p2 = enemy.phase2;
  switch (boss.pattern) {
    case 'bureaucracy': {
      if (dist > 300) move(0.9);
      else if (dist < 220) move(0.45, false);
      else {
        enemy.x += Math.cos(scene.model.elapsed * 0.7) * 14 * dt;
        enemy.y += Math.sin(scene.model.elapsed * 0.7) * 14 * dt;
      }
      if (enemy.patternTimer > 0) break;
      radial(scene, enemy, p2 ? 10 : 6, 160, 0.5, 0xffd166, 'loot_card', 0.24);
      aimed(scene, enemy, angle, p2 ? 4 : 2, 0.22, 220, 0.45, 0xffd166, 'loot_card', 0.2);
      if (p2) scene.summonMinions(2);
      enemy.patternTimer = p2 ? 2.15 : 3.05;
      scene.playSfx('shoot', 420);
      break;
    }
    case 'shark': {
      if (dist > 130) move(1);
      if (enemy.patternTimer <= 0 && dist < 720) {
        enemy.telegraph = p2 ? 0.28 : 0.42;
        enemy.telegraphAction = 'sharkDash';
        enemy.patternTimer = p2 ? 1.75 : 2.7;
        scene.fx.ring(enemy.x, enemy.y - 30, 70, 0x63c7e8, 350, 0.5);
      }
      break;
    }
    case 'kraken': {
      if (dist > 330) move(0.6);
      else if (dist < 250) move(0.55, false);
      if (enemy.patternTimer > 0) break;
      radial(scene, enemy, p2 ? 14 : 10, 105, 0.55, 0xb06bff, 'p_dot', 1.8);
      if (p2) {
        aimed(scene, enemy, angle, 3, 0.36, 175, 0.7, 0xe3b0ff, 'p_dot', 1.5);
        scene.summonMinions(2);
      }
      enemy.patternTimer = p2 ? 2.25 : 3.15;
      scene.playSfx('shoot', 420);
      break;
    }
    case 'dragon': {
      if (dist > 300) move(0.8);
      else if (dist < 220) move(0.4, false);
      if (enemy.patternTimer > 0) break;
      aimed(scene, enemy, angle, p2 ? 7 : 5, p2 ? 0.72 : 0.55, 245, 0.62, 0xf08a3c, 'p_dot', 1.7);
      if (p2) {
        for (let i = 0; i < 2; i++) {
          scene.queueBlast({
            x: scene.player.x + (Math.random() - 0.5) * 170,
            y: scene.player.y + (Math.random() - 0.5) * 130,
            radius: 64,
            damage: enemy.damage * 0.72,
            delay: 0.6 + i * 0.22,
            kind: 'fire',
            color: 0xff7a3c,
            hostile: true,
          });
        }
      }
      enemy.patternTimer = p2 ? 2.0 : 2.9;
      scene.playSfx('shoot', 420);
      break;
    }
    case 'guardian': {
      if (dist > 240) move(0.9);
      if (enemy.patternTimer > 0) break;
      const cycle = enemy.patternCycle % 4;
      enemy.patternCycle += 1;
      if (cycle === 0) {
        radial(scene, enemy, p2 ? 14 : 10, 150, 0.58, 0xe6a7ff, 'p_dot', 1.7);
      } else if (cycle === 1) {
        for (let i = 0; i < (p2 ? 4 : 3); i++) {
          scene.queueBlast({
            x: scene.player.x + (Math.random() - 0.5) * 220,
            y: scene.player.y + (Math.random() - 0.5) * 170,
            radius: 52,
            damage: enemy.damage * 0.6,
            delay: 0.55 + i * 0.18,
            kind: 'guardian',
            color: 0xe6a7ff,
            hostile: true,
          });
        }
      } else if (cycle === 2) {
        enemy.telegraph = p2 ? 0.25 : 0.4;
        enemy.telegraphAction = 'guardianDash';
      } else {
        scene.summonMinions(p2 ? 4 : 3);
        aimed(scene, enemy, angle, 5, 0.5, 200, 0.5, 0xe6a7ff, 'p_dot', 1.4);
      }
      enemy.patternTimer = p2 ? 1.5 : 2.25;
      scene.playSfx('shoot', 420);
      break;
    }
  }
}

function executeAction(scene: GameScene, enemy: EnemyRuntime): void {
  const angle = Math.atan2(scene.player.y - enemy.y, scene.player.x - enemy.x);
  const guardian = enemy.telegraphAction === 'guardianDash';
  const speed = guardian ? 690 : 850;
  enemy.dashVx = Math.cos(angle) * speed;
  enemy.dashVy = Math.sin(angle) * speed;
  enemy.dashUntil = guardian ? 0.3 : 0.4;
  enemy.telegraphAction = '';
  scene.shake(160, guardian ? 0.008 : 0.011);
  scene.playSfx('dash', 200);
  if (guardian && enemy.phase2) {
    radial(scene, enemy, 8, 150, 0.4, 0xe6a7ff, 'p_dot', 1.4);
  }
}

function radial(
  scene: GameScene,
  enemy: EnemyRuntime,
  count: number,
  speed: number,
  damageFactor: number,
  tint: number,
  texture: string,
  scale: number,
): void {
  const offset = Math.random() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const angle = offset + (i / count) * Math.PI * 2;
    scene.spawnBossProjectile(enemy, angle, speed, enemy.damage * damageFactor, tint, texture, scale);
  }
  scene.fx.ring(enemy.x, enemy.y - 30, 90, tint, 420, 0.35);
}

function aimed(
  scene: GameScene,
  enemy: EnemyRuntime,
  angle: number,
  count: number,
  spread: number,
  speed: number,
  damageFactor: number,
  tint: number,
  texture: string,
  scale: number,
): void {
  if (count === 1) {
    scene.spawnBossProjectile(enemy, angle, speed, enemy.damage * damageFactor, tint, texture, scale);
    return;
  }
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * spread;
    scene.spawnBossProjectile(enemy, angle + offset, speed, enemy.damage * damageFactor, tint, texture, scale);
  }
}
