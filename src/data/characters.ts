import type { CharacterDef } from '../core/types';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'heroi',
    name: 'Nosso Herói',
    title: 'O sonhador de Copacabana',
    description:
      'Um brasileiro comum com um sonho fora do comum. Equilibrado, teimoso e pronto para atravessar o oceano.',
    portrait: 'sprites/hero_padrao.png',
    sprite: 'sprites/player_idle_0.png',
    color: '#f8c332',
    cost: 0,
    bonuses: {},
  },
  {
    id: 'mochileiro',
    name: 'Mochileiro',
    title: 'Especialista em mala apertada',
    description:
      'Viaja leve, corre rápido e aprendeu a dormir em aeroportos sem perder o bom humor. Um pouco mais frágil.',
    portrait: 'sprites/hero_mochila.png',
    sprite: 'sprites/player_idle_1.png',
    color: '#58c48d',
    cost: 160,
    bonuses: { moveSpeed: 0.12, armor: 1, maxHp: -0.08 },
  },
  {
    id: 'tatico',
    name: 'Tático',
    title: 'Plano A, B e Portugal',
    description:
      'Passou madrugadas estudando editais e rotas. Aguenta mais pancada, mas carrega o mundo nas costas — e nos pés.',
    portrait: 'sprites/hero_tatico.png',
    sprite: 'sprites/player_idle_2.png',
    color: '#7fae5a',
    cost: 260,
    bonuses: { maxHp: 0.2, armor: 2, moveSpeed: -0.06, luck: -2 },
  },
  {
    id: 'casual',
    name: 'Casual',
    title: 'O azarado de sorte',
    description:
      'Não parece estar tentando, mas sempre encontra uma moeda no chão e um upgrade improvável. Menos força bruta.',
    portrait: 'sprites/hero_casual.png',
    sprite: 'sprites/player_idle_3.png',
    color: '#8eb8ff',
    cost: 320,
    bonuses: { luck: 12, coinGain: 0.15, damage: -0.05 },
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}
