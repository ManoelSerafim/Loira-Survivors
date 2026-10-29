import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { CHARACTERS } from './characters';
import { BOSSES, BOSS_MAP, ENEMIES, ENEMY_MAP } from './enemies';
import { ENDINGS } from './endings';
import { LOIRAS } from './loiras';
import { META_MAP, META_UPGRADES } from './meta';
import { DIFFICULTIES, REGIONS, REGION_MAP } from './regions';
import { RARITY_INFO, STAT_UPGRADES } from './upgrades';
import { DEFAULT_LOADOUT, WEAPONS, WEAPON_MAP } from './weapons';
import { REGION_WEAPON_UNLOCK } from '../systems/progression';
import { makeSave } from '../test/factories';

const publicFile = (relative: string) => path.resolve(process.cwd(), 'public', relative);

function expectSprite(relative: string) {
  expect(relative.startsWith('sprites/'), `${relative} should live in sprites/`).toBe(true);
  expect(existsSync(publicFile(relative)), `missing sprite ${relative}`).toBe(true);
}

describe('game data integrity', () => {
  it('contains five ordered regions whose enemies and bosses exist', () => {
    expect(REGIONS).toHaveLength(5);
    expect(new Set(REGIONS.map((region) => region.id)).size).toBe(5);
    REGIONS.forEach((region, index) => {
      expect(region.order).toBe(index + 1);
      expect(REGION_MAP[region.id]).toBe(region);
      expect(region.duration).toBeGreaterThanOrEqual(45);
      expect(region.bossAt).toBeGreaterThan(0);
      expect(region.bossAt).toBeLessThan(region.duration);
      expect(region.clearReward).toBeGreaterThan(0);
      expect(region.spawn.start).toBeGreaterThan(0);
      expect(region.spawn.end).toBeGreaterThan(region.spawn.start);
      expect(region.spawn.maxAlive).toBeGreaterThan(0);
      expect(region.gradient).toHaveLength(2);
      expect(BOSS_MAP[region.bossId]).toBeDefined();
      expect(region.enemyPool.length).toBeGreaterThan(0);
      for (const entry of region.enemyPool) {
        expect(ENEMY_MAP[entry.id], `missing enemy ${entry.id}`).toBeDefined();
        expect(entry.weight).toBeGreaterThan(0);
      }
      expectSprite(region.art);
    });
    expect(REGIONS.map((region) => region.id)).toEqual(['brasil', 'aeroporto', 'atlantico', 'europa', 'portugal']);
  });

  it('contains all bosses and variant sprites', () => {
    expect(BOSSES).toHaveLength(5);
    expect(new Set(BOSSES.map((boss) => boss.id)).size).toBe(5);
    for (const boss of BOSSES) {
      expect(boss.behavior).toBe('boss');
      expect(boss.phase2At).toBeGreaterThan(0);
      expectSprite(`sprites/${boss.sprite}.png`);
    }
    for (const enemy of ENEMIES) {
      expect(enemy.hp).toBeGreaterThan(0);
      expect(enemy.speed).toBeGreaterThan(0);
      expect(enemy.xp).toBeGreaterThan(0);
      const variants = enemy.variants ?? 1;
      for (let index = 0; index < variants; index += 1) {
        expectSprite(`sprites/${enemy.sprite}_${index}.png`);
      }
    }
  });

  it('keeps the eight weapons internally consistent', () => {
    expect(WEAPONS).toHaveLength(8);
    expect(new Set(WEAPONS.map((weapon) => weapon.id)).size).toBe(8);
    const upgrades = new Set(STAT_UPGRADES.map((upgrade) => upgrade.id));
    for (const weapon of WEAPONS) {
      expect(WEAPON_MAP[weapon.id]).toBe(weapon);
      expect(weapon.maxLevel).toBe(6);
      expect(weapon.cooldown).toBeGreaterThan(0);
      expect(weapon.evolution.requiresStacks).toBeGreaterThan(0);
      expect(upgrades.has(weapon.evolution.requiresUpgrade), `missing evolution upgrade ${weapon.evolution.requiresUpgrade}`).toBe(true);
      expectSprite(weapon.icon);
      if (weapon.type === 'passive') {
        expect(weapon.baseDamage).toBe(0);
      } else {
        expect(weapon.baseDamage).toBeGreaterThan(0);
      }
    }
    expect(DEFAULT_LOADOUT.every((id) => WEAPON_MAP[id])).toBe(true);
  });

  it('maps one new weapon to every region and covers the full arsenal after unlocks', () => {
    expect(Object.keys(REGION_WEAPON_UNLOCK)).toHaveLength(5);
    const unlockedByRegions = new Set(Object.values(REGION_WEAPON_UNLOCK).filter(Boolean));
    expect(unlockedByRegions.size).toBe(5);
    const initial = new Set(['chinelo', 'mala', 'cafe']);
    expect([...initial, ...unlockedByRegions]).toHaveLength(8);
  });

  it('keeps character and loira definitions valid', () => {
    expect(CHARACTERS).toHaveLength(4);
    expect(CHARACTERS[0].id).toBe('heroi');
    expect(new Set(CHARACTERS.map((character) => character.id)).size).toBe(4);
    for (const character of CHARACTERS) {
      expect(character.name).toBeTruthy();
      expect(character.description).toBeTruthy();
      expect(character.cost).toBeGreaterThanOrEqual(0);
      expectSprite(character.portrait);
      expectSprite(character.sprite);
    }

    expect(LOIRAS).toHaveLength(6);
    expect(new Set(LOIRAS.map((loira) => loira.id)).size).toBe(6);
    for (const loira of LOIRAS) {
      expect(loira.name).toBeTruthy();
      expect(loira.story.length).toBeGreaterThan(30);
      expect(loira.requirement).toBeTruthy();
      expectSprite(loira.portrait);
    }
  });

  it('keeps achievements, endings and meta upgrades unique and reference-safe', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ACHIEVEMENTS.map((achievement) => achievement.id)).size).toBe(ACHIEVEMENTS.length);
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.reward).toBeGreaterThan(0);
      expect(achievement.name).toBeTruthy();
      expect(achievement.description).toBeTruthy();
      expect(['inicio', 'romance', 'sobrevivencia', 'progressao']).toContain(achievement.category);
      expect(typeof achievement.check).toBe('function');
      const progress = achievement.progress?.({ save: makeSave() });
      if (progress) {
        expect(progress.target).toBeGreaterThan(0);
        expect(progress.current).toBeGreaterThanOrEqual(0);
      }
    }

    expect(ENDINGS).toHaveLength(5);
    expect(new Set(ENDINGS.map((ending) => ending.id)).size).toBe(5);
    for (const ending of ENDINGS) {
      expect(ending.name).toBeTruthy();
      expect(ending.condition).toBeTruthy();
      expect(typeof ending.check).toBe('function');
    }

    expect(META_UPGRADES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(META_UPGRADES.map((upgrade) => upgrade.id)).size).toBe(META_UPGRADES.length);
    for (const upgrade of META_UPGRADES) {
      expect(META_MAP[upgrade.id]).toBe(upgrade);
      expect(upgrade.maxLevel).toBeGreaterThan(0);
      expect(upgrade.baseCost).toBeGreaterThan(0);
      expect(upgrade.effectText(1)).toBeTruthy();
      for (const requirement of upgrade.requires ?? []) {
        const required = META_MAP[requirement.id];
        expect(required, `missing prerequisite ${requirement.id}`).toBeDefined();
        expect(required.tier).toBeLessThan(upgrade.tier);
        expect(requirement.level).toBeGreaterThan(0);
        expect(requirement.level).toBeLessThanOrEqual(required.maxLevel);
      }
    }
  });

  it('keeps difficulty rewards and run upgrades sane', () => {
    expect(DIFFICULTIES.map((difficulty) => difficulty.id)).toEqual(['normal', 'dificil', 'lendaria']);
    for (const difficulty of DIFFICULTIES) {
      expect(difficulty.reward).toBeGreaterThanOrEqual(1);
      expect(difficulty.hp).toBeGreaterThanOrEqual(1);
      expect(difficulty.xp).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(STAT_UPGRADES.map((upgrade) => upgrade.id)).size).toBe(STAT_UPGRADES.length);
    for (const upgrade of STAT_UPGRADES) {
      expect(RARITY_INFO[upgrade.rarity]).toBeDefined();
      expect(upgrade.maxStacks).toBeGreaterThan(0);
      if (upgrade.kind === 'stat') {
        expect(upgrade.stat).toBeTruthy();
        expect(upgrade.amount).toBeGreaterThan(0);
      }
    }
  });
});
