# Loira Survivors: A Jornada até Portugal

Roguelite de sobrevivência em pixel art, feito para navegador. Um brasileiro, um chinelo voador e um oceano inteiro de problemas: sobreviva às hordas, evolua suas armas e chegue a Portugal para conquistar um final — e, quem sabe, uma loira.

O jogo é 100% local: não usa backend, cadastro, serviços pagos ou assets remotos. O progresso fica no `localStorage` do navegador.

## Stack

- TypeScript + Vite
- Phaser 3 para gameplay (movimento, colisões, partículas, câmera e renderização)
- HTML/CSS para menus, HUD e overlays
- Vitest para testes das mecânicas principais
- Web Audio API para música e efeitos sonoros procedurais
- Sprites pixel art extraídos do atlas local em `public/sprites/`

## Como executar

Requisitos: Node.js 22+ e npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173/`.

Para gerar a build de produção:

```bash
npm run build
npm run preview
```

A build fica em `dist/` e pode ser servida por qualquer servidor estático.

## Controles

| Ação | Teclado | Celular |
| --- | --- | --- |
| Mover | `WASD` ou setas | joystick virtual |
| Habilidade especial | `Espaço` | botão “Especial” |
| Pausar / retomar | `Esc` | botão de pausa |
| Escolher upgrade | `1`, `2`, `3` | toque no card |
| Rerrolar ofertas | `R` | botão “Rerrolar” |
| Menus | mouse / teclado | toque |

Os ataques básicos são automáticos. O foco é posicionamento, coleta de moedas e escolha de upgrades.

## Conteúdo implementado

- **5 regiões** com duração, inimigos, eventos, chefes e recompensas próprias: Brasil, Aeroporto do Desespero, Atlântico Selvagem, A Chegada à Europa e Portugal.
- **5 chefes** com barra de vida, fases e padrões diferentes.
- **8 armas** funcionais: Chinelo Voador, Pix Explosivo, Mochila de Sobrevivência, Café Brasileiro, Carisma Inexplicável, Passaporte Lendário, Combo do Guerreiro e Mala Giratória — cada uma com níveis e evolução.
- **Upgrades temporários** com raridades Comum, Raro, Épico e Lendário, limites de atributos e reroll.
- **Meta-progressão**: moedas permanentes, loja, árvore com pré-requisitos e 11 melhorias permanentes.
- **3 dificuldades**: Normal, Difícil e Lendária, desbloqueadas por progresso real.
- **6 loiras fictícias** no Álbum de Conquistas, com requisitos, ordem, data e história.
- **5 finais** em Portugal, incluindo o final secreto Casanova Imortal.
- **27 conquistas** com recompensas permanentes, progresso e notificações animadas.
- **Estatísticas reais** de runs, mortes, vitórias, chefes, moedas, tempo jogado, recordes por região e muito mais.
- **Eventos e desafios aleatórios** com consequências reais.
- **Áudio** com música por região, efeitos, volumes separados e mudo.
- **Responsivo** para desktop e celular, com joystick virtual e HUD adaptado.

## Persistência

O save usa a chave `loira-survivors-save`, com versão de formato e sanitização de todos os campos carregados. Saves corrompidos ou de versão mais nova são copiados para `loira-survivors-save-corrupt` antes de iniciar um progresso novo.

A opção **Reiniciar todo o progresso** em Configurações pede confirmação. Abandonar ou reiniciar uma run não apaga conquistas, recordes ou upgrades permanentes.

## Testes

```bash
npm test
```

A suíte cobre:

- sanitização, versionamento, backup e persistência do save;
- curvas de XP, armadura, crítico, escala de inimigos e spawn;
- stats, caps e bônus;
- ofertas de nível, evoluções e aplicação de upgrades;
- economia, loja permanente e loadout;
- conquistas e recompensas pagas uma única vez;
- progressão de regiões, chefes, finais, loiras e recompensas;
- integridade dos dados, referências e arquivos de sprite.

Também é possível rodar a interface em modo headless com os scripts auxiliares em `scripts/` (por exemplo, `node scripts/cdp.mjs audit`), desde que o servidor de desenvolvimento e um Chrome com CDP estejam ativos.

## Estrutura

```text
src/
  audio/        música e efeitos procedurais
  core/         tipos, matemática, estatísticas, RNG e formatação
  data/         regiões, inimigos, armas, upgrades, loiras, finais e conquistas
  game/         cena Phaser, input, feedback visual e efeitos
  storage/      save, sanitização, versionamento e backup
  systems/      combate, XP, ofertas, progressão, economia e conquistas
  ui/           roteador, overlays, HUD e views das 14 telas
  styles/       CSS modular (base, HUD, telas, coleções e responsivo)
scripts/        extração do atlas e utilitários de inspeção CDP
public/         sprites extraídos, fontes locais e arte do atlas
```

## Extração de sprites

O atlas original está em `Atlas de Sprites Pixel Art_ Jornada a Portugal.png`. Para regenerar os sprites:

```bash
npm run extract
```

Os arquivos são gerados em `public/sprites/`. A arquitetura mantém os caminhos de arte centralizados nos dados, facilitando substituir os assets por uma nova versão.
