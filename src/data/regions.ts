import type { DifficultyId, RegionDef, RegionId } from '../core/types';

export const REGIONS: RegionDef[] = [
  {
    id: 'brasil',
    order: 1,
    name: 'Brasil',
    subtitle: 'O Começo da Lenda',
    description:
      'Copacabana ao amanhecer, o Cristo lá em cima e uma mala vazia. Sobreviva à multidão e junte seus primeiros trocados.',
    objective: 'Sobreviva ao caos do calçadão e derrote o Rei da Burocracia.',
    duration: 105,
    art: 'sprites/region_brasil.png',
    color: '#3ddc97',
    gradient: ['#0a2b23', '#07131f'],
    spawn: { start: 2.1, end: 4.4, maxAlive: 80 },
    enemyPool: [
      { id: 'turista', weight: 52 },
      { id: 'pombo', weight: 33 },
      { id: 'burocrata', weight: 15 },
    ],
    bossId: 'rei_burocracia',
    bossAt: 82,
    eliteChance: 0.035,
    clearReward: 80,
    difficultyReward: 1,
    tip: 'Fique em movimento: o chinelo ataca sozinho. Colete moedas antes que desapareçam.',
  },
  {
    id: 'aeroporto',
    order: 2,
    name: 'Aeroporto do Desespero',
    subtitle: 'Filas, taxas e pernas doloridas',
    description:
      'O sonho custa caro e o balcão fecha em cinco minutos. Enfrente pombos corporativos, burocratas e taxas escondidas nas entrelinhas.',
    objective: 'Atravesse a fila infinita e derrote o Tubarão das Passagens Caras.',
    duration: 135,
    art: 'sprites/region_aeroporto.png',
    color: '#57c7ff',
    gradient: ['#101b30', '#070d18'],
    spawn: { start: 2.4, end: 5.2, maxAlive: 100 },
    enemyPool: [
      { id: 'pombo', weight: 30 },
      { id: 'burocrata', weight: 32 },
      { id: 'taxa', weight: 28 },
      { id: 'turista', weight: 10 },
    ],
    bossId: 'tubarao_passagens',
    bossAt: 106,
    eliteChance: 0.05,
    clearReward: 110,
    difficultyReward: 1.15,
    tip: 'Taxas ocultas drenam moedas ao encostar. Use o espaço para afastá-las.',
  },
  {
    id: 'atlantico',
    order: 3,
    name: 'Atlântico Selvagem',
    subtitle: 'O oceano não pede passaporte',
    description:
      'Um navio cargueiro, uma tempestade e piratas com dívidas. O oceano é enorme e seus problemas também.',
    objective: 'Sobreviva à travessia e mande o Kraken das Dívidas de volta ao fundo.',
    duration: 150,
    art: 'sprites/region_oceano.png',
    color: '#2f8cff',
    gradient: ['#061e38', '#040b18'],
    spawn: { start: 2.8, end: 5.8, maxAlive: 125 },
    enemyPool: [
      { id: 'pirata', weight: 35 },
      { id: 'tempestade', weight: 27 },
      { id: 'pombo', weight: 13 },
      { id: 'taxa', weight: 15 },
      { id: 'burocrata', weight: 10 },
    ],
    bossId: 'kraken_dividas',
    bossAt: 118,
    eliteChance: 0.06,
    clearReward: 150,
    difficultyReward: 1.3,
    tip: 'Piratas atiram de longe. Aproxime-se para interromper os tiros ou desvie sem parar.',
  },
  {
    id: 'europa',
    order: 4,
    name: 'A Chegada à Europa',
    subtitle: 'Sotaques novos, regras antigas',
    description:
      'A costa aparece no horizonte. E com ela, alfândegas, turistas confusos e um dragão que ama formulários de excesso de bagagem.',
    objective: 'Passe pela alfândega europeia e derrote o Dragão da Alfândega.',
    duration: 165,
    art: 'sprites/region_europa.png',
    color: '#b78cff',
    gradient: ['#1a1230', '#0a0818'],
    spawn: { start: 3.0, end: 6.2, maxAlive: 145 },
    enemyPool: [
      { id: 'fiscal', weight: 22 },
      { id: 'burocrata', weight: 21 },
      { id: 'pirata', weight: 18 },
      { id: 'tempestade', weight: 15 },
      { id: 'taxa', weight: 14 },
      { id: 'turista', weight: 10 },
    ],
    bossId: 'dragao_alfandega',
    bossAt: 130,
    eliteChance: 0.09,
    clearReward: 190,
    difficultyReward: 1.45,
    tip: 'Os Fiscais do Caos são elites. Evite cercos: use a habilidade especial para abrir caminho.',
  },
  {
    id: 'portugal',
    order: 5,
    name: 'Portugal',
    subtitle: 'O Encontro Final',
    description:
      'Lisboa, o Tejo e a loira dos sonhos. Mas antes do encontro, o Guardião do Último Encontro quer ver do que você é feito.',
    objective: 'Vença o Guardião, conquiste seu final e entre no Álbum de Conquistas.',
    duration: 180,
    art: 'sprites/region_portugal.png',
    color: '#ff8d6b',
    gradient: ['#2a1724', '#0e0a15'],
    spawn: { start: 3.3, end: 6.8, maxAlive: 160 },
    enemyPool: [
      { id: 'fiscal', weight: 25 },
      { id: 'pirata', weight: 18 },
      { id: 'tempestade', weight: 18 },
      { id: 'burocrata', weight: 15 },
      { id: 'taxa', weight: 14 },
      { id: 'turista', weight: 10 },
    ],
    bossId: 'guardiao_encontro',
    bossAt: 140,
    eliteChance: 0.1,
    clearReward: 260,
    difficultyReward: 1.6,
    tip: 'O Guardião tem duas fases. Guarde a habilidade especial para a segunda metade da luta.',
  },
];

export const REGION_MAP: Record<RegionId, RegionDef> = Object.fromEntries(
  REGIONS.map((region) => [region.id, region]),
) as Record<RegionId, RegionDef>;

export function getRegion(id: RegionId): RegionDef {
  return REGION_MAP[id];
}

export function getNextRegion(id: RegionId): RegionDef | undefined {
  const region = generateLookup(id);
  return REGIONS.find((candidate) => candidate.order === region.order + 1);
}

function generateLookup(id: RegionId): RegionDef {
  return getRegion(id);
}

export const DIFFICULTIES: {
  id: DifficultyId;
  name: string;
  short: string;
  description: string;
  hp: number;
  damage: number;
  speed: number;
  reward: number;
  xp: number;
  color: string;
  unlockText: string;
}[] = [
  {
    id: 'normal',
    name: 'Normal',
    short: 'A jornada honesta',
    description: 'Inimigos equilibrados. Ideal para curtir a história e aprender as armas.',
    hp: 1,
    damage: 1,
    speed: 1,
    reward: 1,
    xp: 1,
    color: '#56d9a4',
    unlockText: '',
  },
  {
    id: 'dificil',
    name: 'Difícil',
    short: 'A jornada que daria história',
    description: 'Inimigos mais fortes e rápidos. Recompensas e experiência maiores.',
    hp: 1.5,
    damage: 1.35,
    speed: 1.07,
    reward: 1.4,
    xp: 1.12,
    color: '#ffb347',
    unlockText: 'Conclua o Brasil para desbloquear.',
  },
  {
    id: 'lendaria',
    name: 'Lendária',
    short: 'A jornada que vira lenda',
    description: 'Hordas implacáveis, chefes colossais e o dobro de recompensas. Para quem já tem história.',
    hp: 2.15,
    damage: 1.8,
    speed: 1.14,
    reward: 2,
    xp: 1.3,
    color: '#ff5d8f',
    unlockText: 'Conclua Portugal para desbloquear.',
  },
];

export function getDifficulty(id: DifficultyId) {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[0];
}
