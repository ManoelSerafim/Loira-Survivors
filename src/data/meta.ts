import type { MetaUpgradeDef } from '../core/types';

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'treinamento',
    name: 'Treinamento',
    description: 'Academia de bairro, disciplina de campeão. Aumenta o dano inicial.',
    category: 'combate',
    icon: '💪',
    emoji: '💪',
    baseCost: 55,
    maxLevel: 5,
    effectPerLevel: 0.04,
    effectText: (level) => `+${level * 4}% de dano`,
    tier: 0,
    column: 0,
  },
  {
    id: 'condicionamento',
    name: 'Condicionamento',
    description: 'Correr atrás do ônibus conta como cardio. Aumenta a vida máxima.',
    category: 'combate',
    icon: '❤️',
    emoji: '❤️',
    baseCost: 55,
    maxLevel: 5,
    effectPerLevel: 0.06,
    effectText: (level) => `+${level * 6}% de vida máxima`,
    tier: 0,
    column: 1,
  },
  {
    id: 'corrida',
    name: 'Corrida',
    description: 'Pernas preparadas para conexões apertadas. Aumenta a velocidade.',
    category: 'combate',
    icon: '👟',
    emoji: '👟',
    baseCost: 50,
    maxLevel: 5,
    effectPerLevel: 0.03,
    effectText: (level) => `+${level * 3}% de velocidade`,
    tier: 0,
    column: 2,
  },
  {
    id: 'financeiro',
    name: 'Planejamento Financeiro',
    description: 'Planilha, cofrinho e um pouco de negação. Converte mais moedas em progresso permanente.',
    category: 'viagem',
    icon: '📊',
    emoji: '📊',
    baseCost: 70,
    maxLevel: 5,
    effectPerLevel: 0.06,
    effectText: (level) => `+${level * 6}% de conversão em derrotas e +${level * 4}% em vitórias`,
    requires: [{ id: 'treinamento', level: 2 }],
    tier: 1,
    column: 0,
  },
  {
    id: 'sorte',
    name: 'Sorte no Amor',
    description: 'O universo gosta de quem persiste. Aumenta a sorte em todas as runs.',
    category: 'sorte',
    icon: '🍀',
    emoji: '🍀',
    baseCost: 75,
    maxLevel: 5,
    effectPerLevel: 6,
    effectText: (level) => `+${level * 6} de sorte`,
    tier: 1,
    column: 1,
  },
  {
    id: 'passagem',
    name: 'Passagem Econômica',
    description: 'Menos tempo em fila, mais tempo vivendo. Reduz a duração das etapas.',
    category: 'viagem',
    icon: '✈️',
    emoji: '✈️',
    baseCost: 90,
    maxLevel: 4,
    effectPerLevel: 0.03,
    effectText: (level) => `-${level * 3}% de duração nas etapas`,
    requires: [{ id: 'corrida', level: 2 }],
    tier: 1,
    column: 2,
  },
  {
    id: 'experiencia',
    name: 'Experiência de Viagem',
    description: 'Tudo ensina, até perder o voo. Aumenta a experiência obtida.',
    category: 'viagem',
    icon: '📚',
    emoji: '📚',
    baseCost: 80,
    maxLevel: 5,
    effectPerLevel: 0.05,
    effectText: (level) => `+${level * 5}% de experiência`,
    requires: [{ id: 'sorte', level: 1 }],
    tier: 2,
    column: 0,
  },
  {
    id: 'networking',
    name: 'Networking',
    description: 'Todo mundo conhece alguém que conhece Portugal. Melhora recompensas de eventos.',
    category: 'sorte',
    icon: '🤝',
    emoji: '🤝',
    baseCost: 95,
    maxLevel: 4,
    effectPerLevel: 0.12,
    effectText: (level) => `+${level * 12}% de recompensas de eventos`,
    requires: [{ id: 'financeiro', level: 2 }],
    tier: 2,
    column: 1,
  },
  {
    id: 'charme',
    name: 'Charme de Campeão',
    description: 'Confiança não se compra... mas a prática ajuda. Aumenta o score de conquista.',
    category: 'sorte',
    icon: '💐',
    emoji: '💐',
    baseCost: 100,
    maxLevel: 5,
    effectPerLevel: 0.08,
    effectText: (level) => `+${level * 8}% de score de conquista`,
    requires: [{ id: 'sorte', level: 2 }],
    tier: 2,
    column: 2,
  },
  {
    id: 'preparacao',
    name: 'Preparação Internacional',
    description: 'Seguro, documentos, casaco e uma reserva de emergência. Comece com armadura.',
    category: 'combate',
    icon: '🛡️',
    emoji: '🛡️',
    baseCost: 140,
    maxLevel: 3,
    effectPerLevel: 1,
    effectText: (level) => `+${level} de armadura inicial`,
    requires: [
      { id: 'condicionamento', level: 2 },
      { id: 'corrida', level: 2 },
    ],
    tier: 3,
    column: 1,
  },
  {
    id: 'determinacao',
    name: 'Determinação',
    description: 'Não foi até aqui para desistir no primeiro erro. Ganhe segundas chances.',
    category: 'combate',
    icon: '🕊️',
    emoji: '🕊️',
    baseCost: 240,
    maxLevel: 2,
    effectPerLevel: 1,
    effectText: (level) => `${level} segunda${level > 1 ? 's' : ''} chance${level > 1 ? 's' : ''} por run`,
    requires: [{ id: 'preparacao', level: 1 }],
    tier: 4,
    column: 1,
  },
];

export const META_MAP: Record<string, MetaUpgradeDef> = Object.fromEntries(
  META_UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
);

export function metaCost(def: MetaUpgradeDef, currentLevel: number): number {
  return Math.round((def.baseCost * Math.pow(1.58, currentLevel)) / 5) * 5;
}

export function canBuyMeta(saveMeta: Record<string, number>, def: MetaUpgradeDef): boolean {
  const level = saveMeta[def.id] ?? 0;
  if (level >= def.maxLevel) return false;
  return (def.requires ?? []).every((req) => (saveMeta[req.id] ?? 0) >= req.level);
}

export function metaCategoryLabel(category: MetaUpgradeDef['category']): string {
  switch (category) {
    case 'combate':
      return 'Combate';
    case 'viagem':
      return 'Viagem';
    case 'sorte':
      return 'Sorte & Romance';
  }
}
