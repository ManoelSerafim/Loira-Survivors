import type { WeaponDef, WeaponId } from '../core/types';

export const WEAPONS: WeaponDef[] = [
  {
    id: 'chinelo',
    name: 'Chinelo Voador',
    subtitle: 'A arma nacional',
    description:
      'Um chinelo que persegue o inimigo mais próximo com a precisão de uma mãe brasileira. Retorna para o dono depois do impacto.',
    icon: 'sprites/weapon_chinelo.png',
    color: '#4fc3f7',
    type: 'projectile',
    maxLevel: 6,
    baseDamage: 11,
    damagePerLevel: 0.34,
    cooldown: 0.95,
    cooldownReduction: 0.07,
    evolution: {
      name: 'Chinelo Incandescente',
      description: 'O chinelo pega fogo, atravessa até 4 inimigos e deixa uma trilha de brasas.',
      requiresUpgrade: 'forca',
      requiresStacks: 2,
      icon: 'sprites/weapon_chinelo.png',
    },
  },
  {
    id: 'pix',
    name: 'Pix Explosivo',
    subtitle: 'Transferência instantânea de dano',
    description:
      'Envia uma transferência explosiva para o meio da multidão. Quanto maior a aglomeração, melhor o rendimento.',
    icon: 'sprites/weapon_pix.png',
    color: '#38e8c6',
    type: 'area',
    maxLevel: 6,
    baseDamage: 24,
    damagePerLevel: 0.3,
    cooldown: 2.5,
    cooldownReduction: 0.06,
    unlockRegion: 'brasil',
    evolution: {
      name: 'Pix Soberano',
      description: 'Duas explosões em sequência, com área maior e chance de atordoar os inimigos.',
      requiresUpgrade: 'area',
      requiresStacks: 2,
      icon: 'sprites/weapon_pix.png',
    },
  },
  {
    id: 'mochila',
    name: 'Mochila de Sobrevivência',
    subtitle: 'Pesada, mas salva vidas',
    description:
      'Cada quilo é uma lição. Reduz o dano recebido e libera um pulso de recuperação de tempos em tempos.',
    icon: 'sprites/weapon_mochila.png',
    color: '#9ac45a',
    type: 'passive',
    maxLevel: 6,
    baseDamage: 0,
    damagePerLevel: 0,
    cooldown: 9,
    cooldownReduction: 0.05,
    unlockRegion: 'aeroporto',
    evolution: {
      name: 'Mochila Blindada',
      description: 'Ganha armadura extra e dispara uma onda de choque protetora a cada pulso de cura.',
      requiresUpgrade: 'armadura',
      requiresStacks: 2,
      icon: 'sprites/weapon_mochila.png',
    },
  },
  {
    id: 'cafe',
    name: 'Café Brasileiro',
    subtitle: 'Combustível de sonhos',
    description:
      'Um gole e o mundo acelera. Periodicamente aumenta a velocidade de ataque e de movimento por alguns segundos.',
    icon: 'sprites/weapon_cafe.png',
    color: '#d9a066',
    type: 'passive',
    maxLevel: 6,
    baseDamage: 0,
    damagePerLevel: 0,
    cooldown: 12,
    cooldownReduction: 0.08,
    evolution: {
      name: 'Café Turbo',
      description: 'O efeito dura mais tempo e escalda inimigos próximos durante a correria.',
      requiresUpgrade: 'frequencia',
      requiresStacks: 2,
      icon: 'sprites/weapon_cafe.png',
    },
  },
  {
    id: 'carisma',
    name: 'Carisma Inexplicável',
    subtitle: 'Não se sabe de onde vem',
    description:
      'Um campo magnético de simpatia. Inimigos próximos ficam mais lentos e perdem vida só de olhar.',
    icon: 'sprites/weapon_carisma.png',
    color: '#ff5c86',
    type: 'aura',
    maxLevel: 6,
    baseDamage: 2,
    damagePerLevel: 0.65,
    cooldown: 0.5,
    cooldownReduction: 0,
    unlockRegion: 'atlantico',
    evolution: {
      name: 'Carisma Magnético',
      description: 'A aura cresce, aplica dano dobrado e faz inimigos derrotados soltarem moedas extras.',
      requiresUpgrade: 'alcance',
      requiresStacks: 2,
      icon: 'sprites/weapon_carisma.png',
    },
  },
  {
    id: 'passaporte',
    name: 'Passaporte Lendário',
    subtitle: 'Carimbos do destino',
    description:
      'Atrai raios dourados sobre inimigos aleatórios. Também aumenta a sorte e as moedas encontradas.',
    icon: 'sprites/weapon_passaporte.png',
    color: '#b57bff',
    type: 'projectile',
    maxLevel: 6,
    baseDamage: 20,
    damagePerLevel: 0.28,
    cooldown: 7.5,
    cooldownReduction: 0.06,
    unlockRegion: 'europa',
    evolution: {
      name: 'Passaporte Real',
      description: 'Invoca uma chuva de carimbos em todos os inimigos visíveis e multiplica as moedas.',
      requiresUpgrade: 'sorte',
      requiresStacks: 2,
      icon: 'sprites/weapon_passaporte.png',
    },
  },
  {
    id: 'combo',
    name: 'Combo do Guerreiro',
    subtitle: 'Três golpes e uma promessa',
    description:
      'Uma sequência curta de golpes na direção do movimento. Quanto mais perto, mais forte — melhor não errar.',
    icon: 'sprites/weapon_combo.png',
    color: '#ff9d5c',
    type: 'melee',
    maxLevel: 6,
    baseDamage: 9,
    damagePerLevel: 0.32,
    cooldown: 1.65,
    cooldownReduction: 0.08,
    unlockRegion: 'portugal',
    evolution: {
      name: 'Combo Imortal',
      description: 'Cinco golpes flamejantes que terminam em uma onda de choque e breve invencibilidade.',
      requiresUpgrade: 'critico',
      requiresStacks: 2,
      icon: 'sprites/weapon_combo.png',
    },
  },
  {
    id: 'mala',
    name: 'Mala Giratória',
    subtitle: 'Bagagem em órbita',
    description:
      'Mala chique, jeito suspeito. Objetos orbitam o protagonista e machucam quem chega perto demais.',
    icon: 'sprites/weapon_mala.png',
    color: '#ff6b6b',
    type: 'orbit',
    maxLevel: 6,
    baseDamage: 13,
    damagePerLevel: 0.3,
    cooldown: 0.55,
    cooldownReduction: 0.04,
    evolution: {
      name: 'Mala Orbital',
      description: 'Duas malas extras, órbita maior e impacto que empurra a multidão para longe.',
      requiresUpgrade: 'projeteis',
      requiresStacks: 1,
      icon: 'sprites/weapon_mala.png',
    },
  },
];

export const WEAPON_MAP: Record<WeaponId, WeaponDef> = Object.fromEntries(
  WEAPONS.map((weapon) => [weapon.id, weapon]),
) as Record<WeaponId, WeaponDef>;

export const DEFAULT_LOADOUT: WeaponId[] = ['chinelo', 'mala'];

export function getWeapon(id: WeaponId): WeaponDef {
  return WEAPON_MAP[id];
}

export function weaponDamage(def: WeaponDef, level: number, evolved: boolean): number {
  const base = def.baseDamage * (1 + (level - 1) * def.damagePerLevel);
  return base * (evolved ? 1.65 : 1);
}

export function weaponCooldown(def: WeaponDef, level: number, evolved: boolean, cooldownMult: number): number {
  const levelFactor = 1 - Math.min(0.35, (level - 1) * def.cooldownReduction);
  return Math.max(0.18, def.cooldown * levelFactor * cooldownMult * (evolved ? 0.82 : 1));
}
