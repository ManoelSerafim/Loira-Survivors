import type { EndingsDef, RunSummary, SaveData } from '../core/types';

export const ENDINGS: EndingsDef[] = [
  {
    id: 'amigo_portugal',
    name: 'Amigo de Portugal',
    description:
      'Você chegou. Viu o Tejo, comeu um pastel de nata e trocou uma ideia. Ainda não foi dessa vez, mas Portugal agora tem um amigo.',
    emoji: '🤝',
    color: '#78a6b8',
    condition: 'Chegue a Portugal, mesmo que a jornada termine antes do encontro.',
    check: (summary) => !summary.victory || summary.score < 1100,
  },
  {
    id: 'primeiro_encontro',
    name: 'Primeiro Encontro',
    description:
      'Um café, duas horas de conversa e a sensação de que o oceano ficou pequeno. É só o começo de algo bom.',
    emoji: '☕',
    color: '#f2c14e',
    condition: 'Vença Portugal com um desempenho decente (score 1.100+).',
    check: (summary) => summary.victory && summary.score >= 1100 && summary.score < 2000,
  },
  {
    id: 'coracao_conquistado',
    name: 'Coração Conquistado',
    description:
      'Ela riu das suas histórias e ficou para a próxima. O encontro virou rotina, a rotina virou planos, e o coração foi conquistado.',
    emoji: '💘',
    color: '#ff7aa2',
    condition: 'Vença Portugal com score 2.000+.',
    check: (summary) => summary.victory && summary.score >= 2000 && summary.score < 3200,
  },
  {
    id: 'lenda_romantica',
    name: 'Lenda Romântica',
    description:
      'A história do brasileiro que atravessou o Atlântico e conquistou Lisboa vira lenda nos bares da cidade. Até o Guardião virou fã.',
    emoji: '🌹',
    color: '#ffb86b',
    condition: 'Vença no Difícil+ com score 3.200+, ou vença com 2+ desafios opcionais e score 2.400+.',
    check: (summary) =>
      summary.victory &&
      ((summary.config.difficulty !== 'normal' && summary.score >= 3200) ||
        (summary.challengesCompleted >= 2 && summary.score >= 2400)),
  },
  {
    id: 'casanova_imortal',
    name: 'Casanova Imortal',
    description:
      'Dizem que existe um brasileiro que derrotou o Guardião no modo Lendário, completou todos os desafios e ainda saiu de lá com um convite para o jantar. Ninguém sabe se é verdade. Você sabe.',
    emoji: '💀',
    color: '#c9a4ff',
    condition: 'Final secreto: vença Portugal no Lendário, derrote o Guardião e conclua 2+ desafios opcionais.',
    check: (summary) =>
      summary.victory &&
      summary.config.difficulty === 'lendaria' &&
      summary.bossDefeated &&
      summary.challengesCompleted >= 2 &&
      summary.hpRatio >= 0.4,
  },
];

export const ENDING_MAP: Record<string, EndingsDef> = Object.fromEntries(
  ENDINGS.map((ending) => [ending.id, ending]),
);

export function resolveEnding(summary: RunSummary, save: SaveData): EndingsDef | "" {
  if (summary.config.regionId !== 'portugal') return '';
  if (!summary.victory) return ENDINGS[0];
  // Highest tier first
  const ordered = [...ENDINGS].reverse();
  for (const ending of ordered) {
    if (ending.check(summary, save)) return ending;
  }
  return ENDINGS[0];
}
