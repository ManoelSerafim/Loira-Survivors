import type { CharacterId, SaveData, WeaponId } from '../core/types';
import { CHARACTERS, getCharacter } from '../data/characters';
import { canBuyMeta, metaCost, META_MAP } from '../data/meta';
import { getWeapon } from '../data/weapons';

export interface PurchaseResult {
  ok: boolean;
  message: string;
  cost?: number;
}

export function buyMetaUpgrade(save: SaveData, id: string): PurchaseResult {
  const def = META_MAP[id];
  if (!def) return { ok: false, message: 'Melhoria desconhecida.' };
  const level = save.meta[id] ?? 0;
  if (level >= def.maxLevel) return { ok: false, message: 'Esta melhoria já está no nível máximo.' };
  if (!canBuyMeta(save.meta, def)) return { ok: false, message: 'Você ainda não cumpre os pré-requisitos.' };
  const cost = metaCost(def, level);
  if (save.permanentCoins < cost) return { ok: false, message: `Faltam ${cost - save.permanentCoins} moedas permanentes.`, cost };
  save.permanentCoins -= cost;
  save.meta[id] = level + 1;
  save.stats.metaUpgradesBought += 1;
  return { ok: true, message: `${def.name} agora está no nível ${level + 1}.`, cost };
}

export function unlockCharacter(save: SaveData, id: CharacterId): PurchaseResult {
  const character = getCharacter(id);
  if (!CHARACTERS.some((entry) => entry.id === id)) return { ok: false, message: 'Personagem desconhecida.' };
  if (save.unlockedCharacters.includes(id)) return { ok: false, message: 'Personagem já desbloqueada.' };
  if (save.permanentCoins < character.cost) {
    return { ok: false, message: `Faltam ${character.cost - save.permanentCoins} moedas permanentes.`, cost: character.cost };
  }
  save.permanentCoins -= character.cost;
  save.unlockedCharacters.push(id);
  return { ok: true, message: `${character.name} desbloqueado!`, cost: character.cost };
}

export function normalizeLoadout(loadout: WeaponId[], save: SaveData): WeaponId[] {
  const unlocked = new Set(save.unlockedWeapons);
  const valid = [...new Set(loadout.filter((id) => unlocked.has(id)))].slice(0, 2);
  if (!valid.length) {
    const fallback = save.settings.loadout.filter((id) => unlocked.has(id)).slice(0, 2);
    if (fallback.length) return fallback;
    const firstUnlocked = save.unlockedWeapons[0];
    return firstUnlocked ? [firstUnlocked] : ['chinelo'];
  }
  return valid;
}

export function toggleLoadoutWeapon(save: SaveData, id: WeaponId): { loadout: WeaponId[]; message: string } {
  if (!save.unlockedWeapons.includes(id)) return { loadout: [...save.settings.loadout], message: 'Arma ainda bloqueada.' };
  const current = normalizeLoadout(save.settings.loadout, save);
  let next: WeaponId[];
  if (current.includes(id)) {
    if (current.length === 1) return { loadout: current, message: 'Você precisa de pelo menos uma arma equipada.' };
    next = current.filter((weapon) => weapon !== id);
  } else if (current.length >= 2) {
    next = [current[0], id];
  } else {
    next = [...current, id];
  }
  save.settings.loadout = next;
  return {
    loadout: next,
    message: `${getWeapon(id).name} ${next.includes(id) ? 'equipada' : 'removida'}.`,
  };
}
