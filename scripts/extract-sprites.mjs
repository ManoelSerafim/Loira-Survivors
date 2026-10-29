import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ATLAS = path.join(ROOT, 'Atlas de Sprites Pixel Art_ Jornada a Portugal.png');
const OUT = path.join(ROOT, 'public', 'sprites');
fs.mkdirSync(OUT, { recursive: true });

const src = PNG.sync.read(fs.readFileSync(ATLAS));
const { width: W, height: H, data } = src;

function isBg(r, g, b) {
  const max = Math.max(r, g, b);
  if (max < 26) return true;
  return max < 84 && b > r + 12 && b >= g + 3;
}

function extract(name, x, y, w, h, { trim = true, pad = 1, transparent = true } = {}) {
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.min(w, W - x); h = Math.min(h, H - y);
  const out = new PNG({ width: w, height: h });
  const transparentMap = new Uint8Array(w * h);
  const queue = [];

  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const si = ((y + yy) * W + (x + xx)) * 4;
      const di = (yy * w + xx) * 4;
      out.data[di] = data[si];
      out.data[di + 1] = data[si + 1];
      out.data[di + 2] = data[si + 2];
      out.data[di + 3] = 255;
    }
  }

  if (transparent) {
    for (let xx = 0; xx < w; xx++) {
      queue.push([xx, 0], [xx, h - 1]);
    }
    for (let yy = 0; yy < h; yy++) {
      queue.push([0, yy], [w - 1, yy]);
    }
    while (queue.length) {
      const [xx, yy] = queue.pop();
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const p = yy * w + xx;
      if (transparentMap[p]) continue;
      const i = p * 4;
      if (!isBg(out.data[i], out.data[i + 1], out.data[i + 2])) continue;
      transparentMap[p] = 1;
      out.data[i + 3] = 0;
      queue.push([xx + 1, yy], [xx - 1, yy], [xx, yy + 1], [xx, yy - 1]);
    }
  }

  let minX = 0, minY = 0, maxX = w - 1, maxY = h - 1;
  if (trim) {
    minX = w; minY = h; maxX = -1; maxY = -1;
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (out.data[(yy * w + xx) * 4 + 3] > 10) {
          if (xx < minX) minX = xx;
          if (yy < minY) minY = yy;
          if (xx > maxX) maxX = xx;
          if (yy > maxY) maxY = yy;
        }
      }
    }
    if (maxX < minX) { minX = 0; minY = 0; maxX = w - 1; maxY = h - 1; }
  }

  const tw = maxX - minX + 1 + pad * 2;
  const th = maxY - minY + 1 + pad * 2;
  const final = new PNG({ width: tw, height: th });
  final.data.fill(0);
  for (let yy = 0; yy < th; yy++) {
    for (let xx = 0; xx < tw; xx++) {
      const sx = minX + xx - pad;
      const sy = minY + yy - pad;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const si = (sy * w + sx) * 4;
      const di = (yy * tw + xx) * 4;
      final.data[di] = out.data[si];
      final.data[di + 1] = out.data[si + 1];
      final.data[di + 2] = out.data[si + 2];
      final.data[di + 3] = out.data[si + 3];
    }
  }
  fs.writeFileSync(path.join(OUT, name + '.png'), PNG.sync.write(final));
  return { name, w: tw, h: th };
}

const playerCenters = [42, 90, 138, 186, 234, 282];
const made = [];

for (let i = 0; i < 6; i++) made.push(extract(`player_idle_${i}`, playerCenters[i] - 25, 54, 50, 62, { trim: false }));
for (let i = 0; i < 6; i++) made.push(extract(`player_walk_${i}`, playerCenters[i] - 25, 120, 50, 62, { trim: false }));
for (let i = 0; i < 6; i++) made.push(extract(`player_run_${i}`, playerCenters[i] - 26, 203, 52, 66, { trim: false }));
const attackBoxes = [[14, 286, 56, 68], [68, 286, 60, 68], [120, 286, 62, 68], [178, 286, 82, 68]];
attackBoxes.forEach((b, i) => made.push(extract(`player_attack_${i}`, ...b, { trim: false })));
made.push(extract('player_hurt_0', 226, 292, 46, 62, { trim: true }));
made.push(extract('player_hurt_1', 273, 292, 46, 62, { trim: true }));
made.push(extract('player_death_0', 226, 354, 52, 58, { trim: true }));
made.push(extract('player_death_1', 274, 354, 52, 58, { trim: true }));

const sprites = [
  ['hero_padrao', 342, 66, 60, 76],
  ['hero_mochila', 401, 62, 62, 80],
  ['hero_oculos', 468, 68, 52, 74],
  ['hero_chapeu', 342, 198, 60, 80],
  ['hero_tatico', 402, 198, 60, 84],
  ['hero_casual', 466, 198, 56, 78],

  ['enemy_burocrata_0', 556, 58, 36, 76],
  ['enemy_burocrata_1', 594, 58, 36, 76],
  ['enemy_burocrata_2', 632, 58, 44, 78],
  ['enemy_taxa_0', 702, 58, 34, 76],
  ['enemy_taxa_1', 736, 58, 36, 76],
  ['enemy_taxa_2', 769, 58, 34, 76],
  ['enemy_taxa_3', 801, 58, 36, 76],
  ['enemy_pombo_0', 890, 62, 42, 58],
  ['enemy_pombo_1', 933, 62, 40, 56],
  ['enemy_pombo_2', 972, 62, 44, 60],
  ['enemy_pombo_3', 1015, 62, 40, 58],
  ['enemy_turista_0', 556, 172, 38, 72],
  ['enemy_turista_1', 594, 172, 40, 72],
  ['enemy_turista_2', 635, 172, 40, 72],
  ['enemy_pirata_0', 707, 172, 38, 72],
  ['enemy_pirata_1', 746, 172, 40, 72],
  ['enemy_pirata_2', 787, 172, 48, 72],
  ['enemy_tempestade_0', 899, 156, 48, 94],
  ['enemy_tempestade_1', 945, 156, 48, 94],
  ['enemy_tempestade_2', 989, 156, 54, 94],
  ['enemy_tempestade_3', 1039, 156, 54, 94],
  ['enemy_fiscal_0', 555, 271, 34, 72],
  ['enemy_fiscal_1', 591, 271, 36, 72],
  ['enemy_fiscal_2', 627, 271, 40, 72],

  ['boss_rei', 690, 278, 60, 82],
  ['boss_tubarao', 784, 272, 94, 88],
  ['boss_kraken', 890, 274, 112, 84],
  ['boss_dragao', 1003, 270, 104, 88],
  ['boss_guardiao', 1111, 260, 58, 100],

  ['loira_ana', 1222, 42, 74, 106],
  ['loira_sofia', 1325, 44, 74, 104],
  ['loira_isabela', 1431, 42, 74, 108],
  ['loira_beatriz', 1224, 198, 76, 98],
  ['loira_carolina', 1328, 198, 74, 102],
  ['loira_luisa', 1433, 198, 76, 100],

  ['weapon_chinelo', 26, 436, 78, 72],
  ['weapon_pix', 108, 436, 68, 68],
  ['weapon_mochila', 178, 430, 80, 72],
  ['weapon_cafe', 258, 430, 82, 72],
  ['weapon_carisma', 20, 548, 80, 72],
  ['weapon_passaporte', 112, 544, 80, 78],
  ['weapon_combo', 198, 548, 78, 76],
  ['weapon_mala', 278, 542, 82, 80],

  ['loot_coin', 1048, 435, 52, 52],
  ['loot_gem', 1102, 433, 52, 52],
  ['loot_chest', 1152, 433, 52, 52],
  ['loot_heart', 1049, 481, 52, 52],
  ['loot_potion', 1103, 481, 52, 52],
  ['loot_book', 1153, 481, 52, 52],
  ['loot_key', 1051, 531, 52, 52],
  ['loot_map', 1104, 531, 52, 52],
  ['loot_star', 1151, 531, 52, 52],
  ['loot_card', 1048, 585, 52, 56],
  ['loot_chest_red', 1102, 583, 60, 58],
  ['loot_crown', 1152, 585, 56, 54],
];
for (const [name, x, y, w, h] of sprites) made.push(extract(name, x, y, w, h));

// Region art cards stay opaque
const backgrounds = [
  ['region_brasil', 16, 748, 84, 120],
  ['region_aeroporto', 104, 748, 86, 120],
  ['region_oceano', 193, 748, 72, 120],
  ['region_europa', 268, 748, 80, 120],
  ['region_portugal', 348, 772, 161, 99],
];
for (const [name, x, y, w, h] of backgrounds) made.push(extract(name, x, y, w, h, { transparent: false, trim: false }));

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(made, null, 2));
console.log(`Extracted ${made.length} sprites to public/sprites`);
