import Phaser from 'phaser';
import type { GameScene } from './GameScene';

export class Fx {
  private activeTexts = 0;

  constructor(private readonly scene: GameScene) {}

  ring(x: number, y: number, radius: number, color: number, duration = 320, alpha = 0.65): void {
    const image = this.scene.add
      .image(x, y, 'p_ring')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(60)
      .setAlpha(alpha)
      .setScale(Math.max(0.08, radius / 58));
    this.scene.tweens.add({
      targets: image,
      scale: Math.max(0.1, (radius / 58) * 1.4),
      alpha: 0,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => image.destroy(),
    });
  }

  burst(x: number, y: number, color: number, count = 6, distance = 36, size = 1): void {
    const quality = this.scene.model.save.settings.quality;
    const actual = quality === 'baixa' ? Math.ceil(count * 0.45) : count;
    for (let i = 0; i < actual; i++) {
      const angle = (i / actual) * Math.PI * 2 + Math.random() * 0.55;
      const reach = distance * (0.45 + Math.random() * 0.8);
      const image = this.scene.add
        .image(x, y, 'p_dot')
        .setTint(color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(65)
        .setScale((0.16 + Math.random() * 0.18) * size)
        .setAlpha(0.9);
      this.scene.tweens.add({
        targets: image,
        x: x + Math.cos(angle) * reach,
        y: y + Math.sin(angle) * reach,
        alpha: 0,
        scale: 0.02,
        duration: 280 + Math.random() * 260,
        ease: 'Quad.easeOut',
        onComplete: () => image.destroy(),
      });
    }
  }

  text(x: number, y: number, value: string, color = '#fff4d6', size = 16, crit = false): void {
    if (!this.scene.model.save.settings.damageNumbers) return;
    if (this.activeTexts > 62) return;
    this.activeTexts += 1;
    const label = this.scene.add
      .text(x, y, value, {
        fontFamily: '"Rubik", sans-serif',
        fontSize: `${crit ? size + 5 : size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#07101d',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(1200)
      .setResolution(2);
    this.scene.tweens.add({
      targets: label,
      y: y - (crit ? 44 : 32),
      alpha: 0,
      duration: crit ? 780 : 620,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        label.destroy();
        this.activeTexts -= 1;
      },
    });
  }

  slash(x: number, y: number, angle: number, color: number, reach = 46): void {
    const image = this.scene.add
      .image(x + Math.cos(angle) * reach * 0.55, y + Math.sin(angle) * reach * 0.55, 'p_spark')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(58)
      .setRotation(angle + Math.PI / 2)
      .setScale(1.7, 3.1)
      .setAlpha(0.95);
    this.scene.tweens.add({
      targets: image,
      scaleX: 3,
      scaleY: 1.2,
      alpha: 0,
      duration: 190,
      ease: 'Cubic.easeOut',
      onComplete: () => image.destroy(),
    });
  }

  beam(x: number, y: number, color: number): void {
    const image = this.scene.add
      .image(x, y - 90, 'p_spark')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(59)
      .setOrigin(0.5, 1)
      .setScale(4.5, 16)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: image,
      scaleX: 1,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => image.destroy(),
    });
  }

  confetti(x: number, y: number): void {
    const tints = [0xffc857, 0xff6b8a, 0x38e8c6, 0x7fb2ff, 0xffffff];
    for (let i = 0; i < 5; i++) {
      this.burst(x + (Math.random() - 0.5) * 80, y - 40 - Math.random() * 70, tints[i], 5, 80, 1.2);
    }
  }

  dashTrail(x: number, y: number, color: number): void {
    const image = this.scene.add
      .image(x, y, 'p_glow')
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(30)
      .setScale(0.28)
      .setAlpha(0.5);
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      scale: 0.06,
      duration: 240,
      onComplete: () => image.destroy(),
    });
  }
}
