import type { LoiraDef, RunSummary, SaveData } from '../core/types';

export const LOIRAS: LoiraDef[] = [
  {
    id: 'ana',
    name: 'Ana',
    subtitle: 'A torcedora de Portugal',
    description: 'Ama futebol e odeia burocracia.',
    personality: 'Direta, competitiva e leal. Troca qualquer jantar chique por um jogo no sofá.',
    story:
      'Ana estava no mesmo voo que você — só que na classe executiva, porque pontos existem para isso. Vocês se esbarraram na esteira de bagagem e ela roubou seu coração antes de roubar sua mala. O primeiro encontro é num café perto do Tejo, com o jogo passando na TV.',
    portrait: 'sprites/loira_ana.png',
    color: '#f5d76e',
    accent: '#39a96b',
    requirement: 'Conclua Portugal pela primeira vez.',
    check: (summary) => summary.victory,
  },
  {
    id: 'sofia',
    name: 'Sofia',
    subtitle: 'A alma do Atlântico',
    description: 'Adora praia e aventura.',
    personality: 'Espontânea, solar e um pouco imprudente. Sempre tem um mapa na bolsa e areia no cabelo.',
    story:
      'Sofia trocou o emprego estável por um mochilão sem data de volta. Vocês se conhecem numa praia perto de Cascais: ela aplaude sua coragem e pergunta qual é a próxima aventura. Você precisa estar inteiro — de preferência com mais de 70% de vida e nível 15 — para acompanhar seu ritmo.',
    portrait: 'sprites/loira_sofia.png',
    color: '#69d2ff',
    accent: '#1a7fd4',
    requirement: 'Vença Portugal com 70%+ de vida e nível 15+.',
    check: (summary) => summary.victory && summary.hpRatio >= 0.7 && summary.level >= 15,
  },
  {
    id: 'isabela',
    name: 'Isabela',
    subtitle: 'A mente brilhante',
    description: 'Inteligente, eloquente e curiosa.',
    personality: 'Observa tudo antes de falar. Faz perguntas que viram semanas inteiras de conversa.',
    story:
      'Isabela trabalha numa biblioteca de Lisboa e reconheceu seu sotaque antes de você abrir a boca. Ela não se impressiona com histórias fáceis — quer saber como você atravessou o Atlântico. Vencer Portugal no Difícil ou superior faz seu relato valer a pena.',
    portrait: 'sprites/loira_isabela.png',
    color: '#a8c4ff',
    accent: '#4c6fbf',
    requirement: 'Vença Portugal no Difícil ou Lendária.',
    check: (summary) => summary.victory && summary.config.difficulty !== 'normal',
  },
  {
    id: 'beatriz',
    name: 'Beatriz',
    subtitle: 'A anfitriã perfeita',
    description: 'Gosta de vinho e boa comida.',
    personality: 'Calorosa, prática e dona de uma risada que contagia a mesa inteira.',
    story:
      'Beatriz administra uma tasca minúscula no centro de Lisboa. O encontro é simples: ela escolhe o vinho, você escolhe a história. Para chamar sua atenção, chegue com pelo menos 200 moedas temporárias — no bolso ou na memória do bom pagador.',
    portrait: 'sprites/loira_beatriz.png',
    color: '#e85d75',
    accent: '#8d2338',
    requirement: 'Vença Portugal com 200+ moedas temporárias.',
    check: (summary) => summary.victory && summary.coins >= 200,
  },
  {
    id: 'carolina',
    name: 'Carolina',
    subtitle: 'A comédia em pessoa',
    description: 'Extrovertida e engraçada.',
    personality: 'Fala rápido, ri alto e tem uma história para cada cicatriz. Nada a intimida.',
    story:
      'Carolina viu você brigar com o Guardião do Último Encontro e achou a coisa mais engraçada do ano. O encontro é num bar com música ao vivo, onde ela conta a história para todo mundo. Derrotar o Guardião é seu ingresso de entrada.',
    portrait: 'sprites/loira_carolina.png',
    color: '#ff8a5c',
    accent: '#c7472b',
    requirement: 'Derrote o Guardião do Último Encontro em Portugal.',
    check: (summary) => summary.bossDefeated,
  },
  {
    id: 'luisa',
    name: 'Luísa',
    subtitle: 'A trilha sonora da viagem',
    description: 'Ama música e viagens.',
    personality: 'Sonhadora, atenta e intensa. Coleciona discos e passagens usadas.',
    story:
      'Luísa toca numa casa de fado pequena e lotada. Ela dedica uma música à sua jornada e, depois, pergunta sobre os desafios que você aceitou no caminho. Vencer Portugal no Lendário — ou completar dois desafios opcionais — faz a noite durar mais.',
    portrait: 'sprites/loira_luisa.png',
    color: '#c9a4ff',
    accent: '#6e48b8',
    requirement: 'Vença Portugal no Lendário ou conclua 2+ desafios opcionais.',
    check: (summary) => summary.victory && (summary.config.difficulty === 'lendaria' || summary.challengesCompleted >= 2),
  },
];

export const LOIRA_MAP: Record<string, LoiraDef> = Object.fromEntries(LOIRAS.map((loira) => [loira.id, loira]));

export function eligibleLoiras(summary: RunSummary, save: SaveData): LoiraDef[] {
  return LOIRAS.filter((loira) => loira.check(summary, save));
}

export function chooseLoira(summary: RunSummary, save: SaveData, random: () => number): LoiraDef | null {
  if (summary.config.regionId !== 'portugal' || !summary.victory) return null;
  const eligible = eligibleLoiras(summary, save);
  if (!eligible.length) return null;
  const unowned = eligible.filter((loira) => !save.album[loira.id]);
  const pool = unowned.length ? unowned : eligible;
  const index = Math.floor(random() * pool.length) % pool.length;
  return pool[index];
}
