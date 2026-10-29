import Phaser from 'phaser';
import type { RegionId } from '../core/types';

export const WORLD_WIDTH = 2600;
export const WORLD_HEIGHT = 2000;

interface Palette {
  base: number;
  accent: number;
  accent2: number;
  dark: number;
  light: number;
  props: string[];
}

const PALETTES: Record<RegionId, Palette> = {
  brasil: { base: 0x12392c, accent: 0x1f5940, accent2: 0x3b3a22, dark: 0x0b2a21, light: 0x2a7051, props: ['palm', 'parasol', 'towel', 'cooler'] },
  aeroporto: { base: 0x1a2433, accent: 0x243246, accent2: 0x2e4054, dark: 0x121a26, light: 0x395066, props: ['stanchion', 'suitcases', 'bench', 'sign', 'plant'] },
  atlantico: { base: 0x071f36, accent: 0x0d3352, accent2: 0x124a70, dark: 0x041525, light: 0x1a6e96, props: ['barrel', 'crate', 'buoy', 'plank', 'ring'] },
  europa: { base: 0x211a2d, accent: 0x2d243b, accent2: 0x3a2d49, dark: 0x171122, light: 0x4a3a5e, props: ['lamp', 'bench2', 'tree', 'planter'] },
  portugal: { base: 0x2b1a23, accent: 0x3a2430, accent2: 0x49303a, dark: 0x1e1119, light: 0x6a4550, props: ['lamp2', 'table', 'planter2', 'bench3', 'flowers'] },
};

export interface ArenaVisuals {
  update: (time: number, delta: number) => void;
  destroy: () => void;
}

export function ensureUtilityTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('p_dot')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(0xffffff, 1);
  g.fillCircle(6, 6, 6);
  g.generateTexture('p_dot', 12, 12);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 12);
  g.generateTexture('p_spark', 4, 12);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillCircle(2, 2, 2);
  g.generateTexture('p_rain', 4, 16);
  g.destroy();

  const shadow = scene.make.graphics({ x: 0, y: 0 });
  shadow.fillStyle(0x000000, 0.35);
  shadow.fillEllipse(32, 12, 64, 24);
  shadow.generateTexture('p_shadow', 64, 24);
  shadow.destroy();

  if (!scene.textures.exists('p_glow')) {
    const canvas = scene.textures.createCanvas('p_glow', 128, 128);
    if (canvas) {
      const ctx = canvas.getContext();
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      canvas.refresh();
    }
  }

  if (!scene.textures.exists('p_ring')) {
    const ring = scene.make.graphics({ x: 0, y: 0 });
    ring.lineStyle(6, 0xffffff, 1);
    ring.strokeCircle(64, 64, 58);
    ring.generateTexture('p_ring', 128, 128);
    ring.destroy();
  }

  if (!scene.textures.exists('p_warning')) {
    const warn = scene.make.graphics({ x: 0, y: 0 });
    warn.lineStyle(4, 0xff5c5c, 0.95);
    warn.strokeCircle(48, 48, 44);
    warn.lineStyle(2, 0xffb0b0, 0.5);
    warn.strokeCircle(48, 48, 30);
    warn.generateTexture('p_warning', 96, 96);
    warn.destroy();
  }

  if (!scene.textures.exists('p_hp_bg')) {
    const bar = scene.make.graphics({ x: 0, y: 0 });
    bar.fillStyle(0x0a1120, 0.9);
    bar.fillRect(0, 0, 54, 8);
    bar.fillStyle(0xff5c5c, 1);
    bar.fillRect(1, 1, 52, 6);
    bar.generateTexture('p_hp', 54, 8);
    bar.destroy();
  }
}

function createGround(scene: Phaser.Scene, regionId: RegionId): void {
  const key = `ground_${regionId}`;
  if (scene.textures.exists(key)) return;
  const palette = PALETTES[regionId];
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(palette.base, 1);
  g.fillRect(0, 0, 256, 256);

  if (regionId === 'brasil') {
    g.fillStyle(palette.accent2, 0.3);
    g.fillTriangle(0, 220, 140, 80, 256, 190);
    g.fillTriangle(0, 256, 180, 120, 256, 256);
    for (let i = 0; i < 110; i++) {
      const x = (i * 71 + 13) % 256;
      const y = (i * 43 + 29) % 256;
      g.fillStyle(i % 3 === 0 ? palette.light : palette.dark, 0.3 + (i % 4) * 0.08);
      g.fillRect(x, y, i % 5 === 0 ? 4 : 2, 2);
    }
    g.lineStyle(1, palette.light, 0.12);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo((i * 61) % 256, 0);
      g.lineTo((i * 61 + 40) % 256, 256);
      g.strokePath();
    }
  } else if (regionId === 'aeroporto') {
    for (let y = 0; y < 256; y += 64) {
      for (let x = 0; x < 256; x += 64) {
        g.fillStyle((x + y) % 128 === 0 ? palette.accent : palette.base, 1);
        g.fillRect(x, y, 64, 64);
        g.lineStyle(1, palette.light, 0.18);
        g.strokeRect(x + 0.5, y + 0.5, 63, 63);
        if ((x + y) % 256 === 0) {
          g.fillStyle(palette.accent2, 0.35);
          g.fillRect(x + 6, y + 6, 18, 2);
          g.fillRect(x + 6, y + 6, 2, 10);
        }
      }
    }
    for (let i = 0; i < 70; i++) {
      const x = (i * 37 + 11) % 256;
      const y = (i * 89 + 7) % 256;
      g.fillStyle(palette.light, 0.08);
      g.fillRect(x, y, 2, 2);
    }
  } else if (regionId === 'atlantico') {
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle(y % 64 === 0 ? palette.accent : palette.base, 0.9);
      g.fillRect(0, y, 256, 16);
    }
    for (let i = 0; i < 26; i++) {
      const y = (i * 37 + 11) % 256;
      const x = (i * 53 + 23) % 256;
      g.lineStyle(2, i % 4 === 0 ? palette.light : palette.accent2, 0.4);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 22, y + 2);
      g.strokePath();
    }
    for (let i = 0; i < 45; i++) {
      const x = (i * 67 + 31) % 256;
      const y = (i * 41 + 5) % 256;
      g.fillStyle(palette.light, 0.5);
      g.fillRect(x, y, 1, 1);
    }
  } else if (regionId === 'europa') {
    for (let row = 0; row < 10; row++) {
      const offset = row % 2 === 0 ? 0 : 16;
      for (let col = -1; col < 9; col++) {
        const x = col * 32 + offset;
        const y = row * 26;
        g.fillStyle((row + col) % 3 === 0 ? palette.accent : palette.base, 1);
        g.fillRoundedRect(x + 1, y + 1, 30, 24, 4);
        g.lineStyle(1, palette.light, 0.1);
        g.strokeRoundedRect(x + 1, y + 1, 30, 24, 4);
      }
    }
    for (let i = 0; i < 24; i++) {
      const x = (i * 61 + 17) % 256;
      const y = (i * 43 + 9) % 256;
      g.fillStyle(0x8c5f33, 0.25);
      g.fillRect(x, y, 3, 2);
    }
  } else {
    g.lineStyle(1, palette.accent, 0.6);
    for (let y = 0; y < 256; y += 32) {
      for (let x = 0; x < 256; x += 32) {
        const color = (x / 32 + y / 32) % 2 === 0 ? palette.accent : palette.accent2;
        g.fillStyle(color, 0.5);
        g.fillTriangle(x + 16, y + 2, x + 30, y + 16, x + 16, y + 30);
        g.fillTriangle(x + 16, y + 2, x + 2, y + 16, x + 16, y + 30);
        g.lineStyle(1, 0x93b7c9, 0.12);
        g.strokeCircle(x + 16, y + 16, 3);
      }
    }
    for (let i = 0; i < 48; i++) {
      const x = (i * 71 + 19) % 256;
      const y = (i * 37 + 7) % 256;
      g.fillStyle(0xd6ad74, 0.25);
      g.fillRect(x, y, 2, 2);
    }
  }

  g.generateTexture(key, 256, 256);
  g.destroy();
}

function propTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function createProps(scene: Phaser.Scene, regionId: RegionId): Phaser.GameObjects.GameObject[] {
  const created: Phaser.GameObjects.GameObject[] = [];
  const rng = new Phaser.Math.RandomDataGenerator([`props-${regionId}`]);
  const palette = PALETTES[regionId];

  if (regionId === 'brasil') {
    propTexture(scene, 'prop_palm', 76, 116, (g) => {
      g.fillStyle(0x5b3b22, 1);
      g.fillRect(34, 44, 8, 66);
      g.fillStyle(0x73502e, 1);
      g.fillRect(30, 96, 16, 10);
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const x = 38 + Math.cos(angle) * 30;
        const y = 40 + Math.sin(angle) * 22;
        g.fillStyle(i % 2 === 0 ? 0x2f7a46 : 0x1f5d36, 1);
        g.fillTriangle(38, 38, x - 10, y + 8, x + 10, y + 8);
      }
      g.fillStyle(0x8b6a32, 1);
      g.fillCircle(30, 48, 3);
      g.fillCircle(45, 45, 3);
      g.fillCircle(38, 40, 3);
    });
    propTexture(scene, 'prop_parasol', 58, 54, (g) => {
      g.fillStyle(0xe8e0cc, 1);
      g.fillRect(27, 20, 3, 32);
      g.fillStyle(0xe05252, 1);
      g.fillEllipse(29, 20, 52, 24);
      g.fillStyle(0xf4f1e1, 0.9);
      g.fillTriangle(29, 8, 9, 23, 24, 23);
      g.fillTriangle(29, 8, 44, 23, 53, 23);
      g.fillStyle(0xe8b34b, 1);
      g.fillRect(15, 30, 28, 4);
    });
    propTexture(scene, 'prop_towel', 34, 20, (g) => {
      g.fillStyle(0x2f7fbf, 1);
      g.fillRect(0, 0, 34, 20);
      g.fillStyle(0xffd95e, 1);
      g.fillRect(0, 5, 34, 3);
      g.fillRect(0, 12, 34, 3);
    });
    propTexture(scene, 'prop_cooler', 26, 22, (g) => {
      g.fillStyle(0x3a9ccf, 1);
      g.fillRoundedRect(2, 5, 22, 15, 3);
      g.fillStyle(0xe8eff2, 1);
      g.fillRect(2, 2, 22, 5);
      g.lineStyle(2, 0x1a5b7a, 1);
      g.strokeRect(7, 6, 12, 8);
    });
  } else if (regionId === 'aeroporto') {
    propTexture(scene, 'prop_stanchion', 66, 38, (g) => {
      g.fillStyle(0x8494a6, 1);
      g.fillRect(10, 16, 4, 20);
      g.fillRect(8, 33, 8, 3);
      g.fillStyle(0x3b5168, 1);
      g.fillRect(12, 20, 44, 4);
      g.fillStyle(0xe6c14a, 1);
      g.fillRect(18, 18, 32, 8);
      g.fillStyle(0x0f1b28, 0.4);
      g.fillRect(18, 18, 32, 2);
    });
    propTexture(scene, 'prop_suitcases', 42, 46, (g) => {
      g.fillStyle(0x1b2a3a, 0.5);
      g.fillEllipse(21, 42, 36, 8);
      g.fillStyle(0xbd5b4e, 1);
      g.fillRoundedRect(3, 20, 34, 22, 3);
      g.fillStyle(0x855333, 1);
      g.fillRoundedRect(8, 6, 26, 20, 3);
      g.fillStyle(0x2c3a4a, 1);
      g.fillRoundedRect(12, 27, 16, 12, 2);
      g.lineStyle(2, 0xdfe5ec, 0.8);
      g.strokeRect(15, 4, 12, 4);
    });
    propTexture(scene, 'prop_bench', 64, 26, (g) => {
      g.fillStyle(0x34485c, 1);
      g.fillRect(4, 8, 56, 6);
      g.fillRect(8, 14, 48, 4);
      g.fillStyle(0x223344, 1);
      g.fillRect(8, 18, 4, 7);
      g.fillRect(52, 18, 4, 7);
      g.fillStyle(0x4f6578, 1);
      g.fillRect(4, 4, 56, 4);
    });
    propTexture(scene, 'prop_sign', 46, 29, (g) => {
      g.fillStyle(0x1f2a38, 1);
      g.fillRect(4, 3, 38, 22);
      g.lineStyle(2, 0x89a5be, 1);
      g.strokeRect(5, 4, 36, 20);
      g.fillStyle(0xf4cf54, 1);
      g.fillRect(12, 11, 20, 3);
      g.fillTriangle(32, 8, 39, 13, 32, 18);
    });
    propTexture(scene, 'prop_plant', 34, 52, (g) => {
      g.fillStyle(0x7b4c33, 1);
      g.fillRoundedRect(9, 34, 16, 15, 2);
      g.fillStyle(0x2d7d4e, 1);
      for (let i = 0; i < 5; i++) {
        g.fillEllipse(17 + (i - 2) * 4, 24 - Math.abs(i - 2) * 2, 8, 24);
      }
    });
  } else if (regionId === 'atlantico') {
    propTexture(scene, 'prop_barrel', 32, 42, (g) => {
      g.fillStyle(0x5e3a23, 1);
      g.fillRoundedRect(4, 4, 24, 34, 6);
      g.fillStyle(0x7e5233, 1);
      g.fillRoundedRect(6, 8, 20, 28, 5);
      g.fillStyle(0x2d1d12, 1);
      g.fillRect(4, 12, 24, 3);
      g.fillRect(4, 28, 24, 3);
      g.fillStyle(0x9a6a41, 1);
      g.fillRect(15, 5, 2, 32);
    });
    propTexture(scene, 'prop_crate', 38, 38, (g) => {
      g.fillStyle(0x5e4029, 1);
      g.fillRect(2, 4, 34, 32);
      g.fillStyle(0x7e5a38, 1);
      g.fillRect(5, 7, 28, 26);
      g.lineStyle(2, 0x3a2617, 1);
      g.strokeRect(2, 4, 34, 32);
      g.beginPath();
      g.moveTo(5, 7);
      g.lineTo(33, 33);
      g.moveTo(33, 7);
      g.lineTo(5, 33);
      g.strokePath();
    });
    propTexture(scene, 'prop_buoy', 28, 34, (g) => {
      g.fillStyle(0xdb4e4e, 1);
      g.fillEllipse(14, 16, 22, 14);
      g.fillStyle(0xf2ecdc, 1);
      g.fillRect(4, 13, 20, 5);
      g.fillRect(13, 6, 4, 20);
      g.fillStyle(0x2c3c4c, 0.4);
      g.fillEllipse(14, 30, 20, 5);
    });
    propTexture(scene, 'prop_plank', 68, 16, (g) => {
      g.fillStyle(0x5a412b, 1);
      g.fillRoundedRect(0, 3, 66, 10, 3);
      g.fillStyle(0x7e5d3c, 1);
      g.fillRect(4, 5, 56, 3);
      g.fillStyle(0x322315, 1);
      g.fillRect(14, 4, 2, 8);
      g.fillRect(48, 4, 2, 8);
    });
    propTexture(scene, 'prop_ring', 32, 32, (g) => {
      g.lineStyle(6, 0xe8e5d8, 1);
      g.strokeCircle(16, 16, 11);
      g.lineStyle(2, 0xd85858, 1);
      g.strokeCircle(16, 16, 11);
      g.fillStyle(0xd85858, 1);
      g.fillRect(15, 3, 3, 6);
      g.fillRect(15, 23, 3, 6);
    });
  } else if (regionId === 'europa') {
    propTexture(scene, 'prop_lamp', 22, 96, (g) => {
      g.fillStyle(0x171a22, 1);
      g.fillRect(9, 22, 4, 68);
      g.fillRect(4, 88, 14, 4);
      g.fillRect(3, 22, 16, 3);
      g.fillStyle(0x3a3f4a, 1);
      g.fillRect(6, 8, 10, 16);
      g.fillStyle(0xffd27a, 1);
      g.fillRect(7, 10, 8, 10);
      g.fillStyle(0x15171c, 1);
      g.fillTriangle(3, 8, 19, 8, 11, 2);
    });
    propTexture(scene, 'prop_bench2', 64, 32, (g) => {
      g.fillStyle(0x3c2b24, 1);
      g.fillRoundedRect(4, 10, 56, 8, 3);
      g.fillStyle(0x52392d, 1);
      g.fillRect(6, 18, 52, 4);
      g.fillRect(9, 22, 4, 8);
      g.fillRect(51, 22, 4, 8);
      g.fillStyle(0x26303c, 1);
      g.fillRect(4, 6, 56, 3);
    });
    propTexture(scene, 'prop_tree', 70, 104, (g) => {
      g.fillStyle(0x3b2a1f, 1);
      g.fillRect(32, 60, 6, 40);
      g.fillStyle(0xb0642b, 0.9);
      g.fillCircle(24, 48, 17);
      g.fillCircle(48, 44, 20);
      g.fillCircle(34, 30, 18);
      g.fillStyle(0xd98a3c, 0.8);
      g.fillCircle(44, 60, 13);
      g.fillCircle(18, 64, 12);
      g.fillStyle(0x7e4621, 0.8);
      g.fillCircle(54, 70, 9);
    });
    propTexture(scene, 'prop_planter', 40, 44, (g) => {
      g.fillStyle(0x3b5368, 1);
      g.fillRoundedRect(6, 24, 28, 18, 3);
      g.fillStyle(0x86a8bf, 1);
      g.fillRect(10, 27, 20, 3);
      g.fillStyle(0x2c6d4e, 1);
      g.fillEllipse(20, 18, 20, 22);
      g.fillStyle(0xd06b8b, 1);
      g.fillCircle(15, 12, 3);
      g.fillCircle(24, 16, 3);
    });
  } else {
    propTexture(scene, 'prop_lamp2', 24, 100, (g) => {
      g.fillStyle(0x161521, 1);
      g.fillRect(10, 24, 4, 70);
      g.fillRect(4, 94, 16, 4);
      g.fillStyle(0x2c2637, 1);
      g.fillRect(7, 8, 10, 18);
      g.fillStyle(0xffcf8a, 1);
      g.fillRect(8, 10, 8, 12);
      g.fillStyle(0x171521, 1);
      g.fillTriangle(2, 8, 22, 8, 12, 1);
      g.fillStyle(0xd6ad74, 1);
      g.fillRect(6, 6, 12, 2);
    });
    propTexture(scene, 'prop_table', 54, 46, (g) => {
      g.fillStyle(0x2f2028, 1);
      g.fillEllipse(27, 46, 42, 8);
      g.fillRect(25, 24, 4, 20);
      g.fillStyle(0xb98255, 1);
      g.fillEllipse(27, 20, 48, 18);
      g.fillStyle(0xe3c687, 1);
      g.fillEllipse(27, 18, 38, 11);
      g.fillStyle(0xf1efe0, 1);
      g.fillCircle(18, 17, 4);
      g.fillStyle(0x8e2f37, 1);
      g.fillCircle(36, 18, 3);
      g.lineStyle(2, 0x3a2d31, 1);
      g.strokeRect(6, 26, 10, 14);
      g.strokeRect(38, 26, 10, 14);
    });
    propTexture(scene, 'prop_planter2', 42, 48, (g) => {
      g.fillStyle(0x2d4f70, 1);
      g.fillRoundedRect(5, 26, 32, 20, 3);
      g.lineStyle(2, 0x8fb9d6, 0.9);
      g.strokeRoundedRect(7, 28, 28, 16, 2);
      g.fillStyle(0x3c7a5d, 1);
      g.fillEllipse(21, 19, 26, 24);
      g.fillStyle(0xff79a8, 1);
      g.fillCircle(13, 11, 4);
      g.fillCircle(28, 15, 4);
      g.fillCircle(21, 7, 3);
    });
    propTexture(scene, 'prop_bench3', 64, 30, (g) => {
      g.fillStyle(0x253f57, 1);
      g.fillRect(5, 10, 54, 7);
      g.fillStyle(0xdfd7c4, 1);
      g.fillRect(6, 12, 52, 3);
      g.fillStyle(0x213648, 1);
      g.fillRect(9, 17, 4, 10);
      g.fillRect(51, 17, 4, 10);
      g.fillStyle(0x1b2d3d, 1);
      g.fillRect(5, 6, 54, 3);
    });
    propTexture(scene, 'prop_flowers', 38, 32, (g) => {
      g.fillStyle(0x28503d, 1);
      g.fillEllipse(19, 24, 30, 14);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(i % 2 === 0 ? 0xff87a8 : 0xffd166, 1);
        g.fillCircle(7 + i * 5, 14 + (i % 3) * 5, 3);
      }
      g.fillStyle(0x1e3a2c, 1);
      g.fillRect(17, 20, 4, 10);
    });
  }

  const propCount = 18;
  for (let i = 0; i < propCount; i++) {
    const key = palette.props[i % palette.props.length];
    const textureKey = `prop_${key}`;
    if (!scene.textures.exists(textureKey)) continue;
    const x = rng.between(160, WORLD_WIDTH - 160);
    const y = rng.between(160, WORLD_HEIGHT - 160);
    if (Phaser.Math.Distance.Between(x, y, WORLD_WIDTH / 2, WORLD_HEIGHT / 2) < 260) continue;
    const image = scene.add.image(x, y, textureKey).setOrigin(0.5, 1);
    image.setScale(rng.realInRange(0.8, 1.35));
    image.setAlpha(0.9);
    image.setDepth(-30 + y * 0.002);
    image.setAngle(rng.between(-3, 3));
    created.push(image);
    if (key === 'lamp' || key === 'lamp2') {
      const glow = scene.add.image(x, y - 78, 'p_glow').setTint(0xffcc80).setAlpha(0.35).setScale(0.12, 0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(-25);
      created.push(glow);
    }
  }
  return created;
}

function createAmbient(scene: Phaser.Scene, regionId: RegionId, quality: 'alta' | 'media' | 'baixa'): Phaser.GameObjects.Particles.ParticleEmitter | null {
  if (quality === 'baixa') return null;
  const width = Math.max(1280, scene.scale.width);
  const height = Math.max(720, scene.scale.height);
  const zone = {
    type: 'random' as const,
    source: new Phaser.Geom.Rectangle(-100, -100, width + 200, height + 200),
    quantity: 1,
  };
  let emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  if (regionId === 'brasil') {
    emitter = scene.add.particles(0, 0, 'p_glow', {
      emitZone: zone,
      lifespan: { min: 2400, max: 5000 },
      frequency: quality === 'alta' ? 260 : 480,
      speedX: { min: -8, max: 8 },
      speedY: { min: -22, max: -4 },
      scale: { start: 0.035, end: 0.008 },
      alpha: { start: 0.75, end: 0 },
      tint: [0xffd166, 0xa8e6a1],
      blendMode: Phaser.BlendModes.ADD,
    });
  } else if (regionId === 'aeroporto') {
    emitter = scene.add.particles(0, 0, 'p_dot', {
      emitZone: zone,
      lifespan: { min: 1200, max: 2600 },
      frequency: quality === 'alta' ? 120 : 220,
      speedX: { min: -34, max: -8 },
      speedY: { min: -6, max: 10 },
      scale: { start: 0.28, end: 0.05 },
      alpha: { start: 0.35, end: 0 },
      tint: 0xc8e2f2,
    });
  } else if (regionId === 'atlantico') {
    emitter = scene.add.particles(0, 0, 'p_rain', {
      emitZone: zone,
      lifespan: 900,
      frequency: quality === 'alta' ? 45 : 90,
      speedX: -170,
      speedY: { min: 520, max: 740 },
      scaleX: 0.5,
      scaleY: { min: 0.7, max: 1.3 },
      alpha: { start: 0.45, end: 0.1 },
      tint: [0x84cfff, 0x4d9cd6],
      rotate: 18,
    });
  } else if (regionId === 'europa') {
    emitter = scene.add.particles(0, 0, 'p_spark', {
      emitZone: zone,
      lifespan: { min: 2400, max: 5200 },
      frequency: quality === 'alta' ? 170 : 300,
      speedX: { min: -30, max: 18 },
      speedY: { min: 12, max: 40 },
      scaleX: 0.7,
      scaleY: { min: 0.4, max: 0.9 },
      alpha: { start: 0.5, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xd98a3c, 0xb0642b, 0xf2c14e],
    });
  } else {
    emitter = scene.add.particles(0, 0, 'p_glow', {
      emitZone: zone,
      lifespan: { min: 2600, max: 5200 },
      frequency: quality === 'alta' ? 210 : 360,
      speedX: { min: -16, max: 16 },
      speedY: { min: -28, max: -8 },
      scale: { start: 0.03, end: 0.006 },
      alpha: { start: 0.7, end: 0 },
      tint: [0xff8fa2, 0xffd166, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });
  }
  emitter.setScrollFactor(0).setDepth(600);
  return emitter;
}

export function createArena(
  scene: Phaser.Scene,
  regionId: RegionId,
  quality: 'alta' | 'media' | 'baixa',
): ArenaVisuals {
  ensureUtilityTextures(scene);
  createGround(scene, regionId);
  const palette = PALETTES[regionId];
  const background = scene.add
    .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, `ground_${regionId}`)
    .setOrigin(0, 0)
    .setDepth(-100);
  const extra = scene.add
    .tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, `ground_${regionId}`)
    .setOrigin(0, 0)
    .setDepth(-95)
    .setAlpha(regionId === 'atlantico' ? 0.22 : 0.1)
    .setTileScale(1.6)
    .setTint(palette.light);

  const border = scene.add.graphics().setDepth(-80);
  border.lineStyle(4, palette.light, 0.25);
  border.strokeRect(18, 18, WORLD_WIDTH - 36, WORLD_HEIGHT - 36);
  border.lineStyle(1, 0xffffff, 0.08);
  border.strokeRect(32, 32, WORLD_WIDTH - 64, WORLD_HEIGHT - 64);

  const props = createProps(scene, regionId);
  const ambient = createAmbient(scene, regionId, quality);

  const update = (time: number, delta: number) => {
    if (regionId === 'atlantico') {
      background.tilePositionX += delta * 0.006;
      background.tilePositionY += delta * 0.014;
      extra.tilePositionX -= delta * 0.01;
      extra.tilePositionY += delta * 0.006;
    } else if (regionId === 'aeroporto') {
      extra.tilePositionX += delta * 0.004;
    } else {
      background.tilePositionX += Math.sin(time * 0.00003) * 0.02;
    }
  };

  return {
    update,
    destroy: () => {
      background.destroy();
      extra.destroy();
      border.destroy();
      for (const prop of props) prop.destroy();
      ambient?.destroy();
    },
  };
}
