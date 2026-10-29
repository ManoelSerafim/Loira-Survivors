# PROMPT — LOIRA SURVIVORS: A JORNADA ATÉ PORTUGAL 🇧🇷🇵🇹

## 1. OBJETIVO DO PROJETO

Desenvolva um jogo completo de navegador chamado **Loira Survivors: A Jornada até Portugal**, inspirado na jogabilidade de Vampire Survivors, Brotato e outros jogos roguelite de sobrevivência.

A história acompanha um garoto brasileiro que sonha em atravessar o oceano, chegar a Portugal e conquistar sua loira dos sonhos. Para isso, ele precisa sobreviver a hordas de inimigos, superar desafios cada vez mais difíceis, coletar recursos, desbloquear poderes e evoluir a cada tentativa.

O objetivo principal é sobreviver durante o tempo necessário para concluir cada etapa da jornada e finalmente chegar a Portugal.

O projeto deve ser um jogo realmente jogável, com sistemas funcionais, progressão persistente, efeitos visuais, animações, interface polida e conteúdo suficiente para incentivar o jogador a repetir as runs.

Não crie apenas um protótipo visual. Implemente a lógica real do jogo.

## 2. TECNOLOGIAS

Utilize preferencialmente:
- TypeScript.
- Vite.
- Phaser 3 para renderização 2D, movimentação, colisões, partículas e gerenciamento das cenas.
- HTML e CSS para menus e interface, quando apropriado.
- localStorage para salvar permanentemente o progresso do jogador.
- Vitest para testes das mecânicas principais.

O jogo deve funcionar diretamente no navegador, sem exigir backend, cadastro ou serviços pagos.

Organize o código de maneira modular, com responsabilidades separadas para jogadores, inimigos, armas, upgrades, conquistas, progressão e interface.

## 3. IDENTIDADE VISUAL

Crie uma identidade visual própria, com aparência de jogo indie comercial bem produzido.

Direção artística:
- Pixel art moderna ou arte 2D estilizada.
- Personagens com silhuetas reconhecíveis e animações fluidas.
- Efeitos de partículas para ataques, impactos, explosões e recompensas.
- Cenários com profundidade visual, elementos animados e detalhes ambientais.
- Interface moderna, legível e responsiva.
- Efeitos de câmera, flashes discretos, números de dano e feedback visual.
- Trilha sonora original ou de uso livre e efeitos sonoros apropriados.
- Animações para caminhar, atacar, receber dano, morrer e vencer.

Não utilize quadrados genéricos como representação definitiva dos personagens. Crie ou integre sprites, spritesheets, modelos 2D e animações adequados ao estilo escolhido. Se não houver assets disponíveis, produza assets originais ou placeholders estilizados temporários, mantendo a arquitetura pronta para substituí-los.

## 4. HISTÓRIA E PROGRESSÃO DA VIAGEM

A jornada começa no Brasil. O protagonista não possui dinheiro, equipamentos ou habilidades suficientes para chegar ao destino.

A cada run, ele enfrenta desafios que representam os obstáculos da viagem.

Crie as seguintes regiões:

1. **Brasil — O Começo da Lenda**
   - Inimigos fracos e desafios introdutórios.
   - Aprendizado das mecânicas de combate.
   - Objetivo: sobreviver e conseguir recursos para iniciar a viagem.

2. **Aeroporto do Desespero**
   - Inimigos relacionados a filas, taxas, burocracia e passagens caras.
   - Eventos aleatórios que podem conceder ou retirar recursos.
   - Objetivo: conseguir embarcar.

3. **Atlântico Selvagem**
   - Ondas de inimigos marítimos, tempestades, piratas e criaturas oceânicas.
   - Mudanças ambientais e eventos especiais.
   - Objetivo: sobreviver à travessia.

4. **A Chegada à Europa**
   - Inimigos mais fortes, desafios de adaptação e eventos inesperados.
   - Novos equipamentos e habilidades.
   - Objetivo: alcançar Portugal.

5. **Portugal — O Encontro Final**
   - Uma fase final com desafios especiais.
   - O protagonista precisa demonstrar que está preparado para conquistar sua loira.
   - Ao concluir, desbloqueia uma cena de vitória e novos níveis de dificuldade.

Cada região deve possuir inimigos, cenários, eventos e recompensas próprios.

A viagem deve ser representada também visualmente: o mapa, o veículo ou a posição do protagonista precisam demonstrar que ele está avançando em direção a Portugal.

## 5. LOOP PRINCIPAL DE GAMEPLAY

Implemente um sistema de sobrevivência por runs:

1. O jogador inicia uma run.
2. Os inimigos aparecem em ondas progressivamente mais difíceis.
3. O protagonista ataca automaticamente os inimigos próximos ou utiliza armas automáticas.
4. O jogador se movimenta para desviar, coletar recursos e sobreviver.
5. Os inimigos derrotados deixam moedas, experiência e itens.
6. Ao subir de nível, o jogo pausa e oferece três upgrades aleatórios.
7. O jogador escolhe um upgrade e continua a run.
8. Eventos especiais, chefes e objetivos secundários aparecem durante a partida.
9. Ao sobreviver pelo tempo necessário, o jogador conclui a etapa e avança na viagem.
10. Ao morrer, perde os recursos temporários, mas mantém as recompensas permanentes permitidas pelas regras do jogo.

Implemente controles para teclado e suporte básico para dispositivos móveis.

Controles sugeridos:
- WASD ou setas: movimentar.
- Espaço: habilidade especial, quando disponível.
- ESC: pausar.
- Mouse: selecionar upgrades e interagir com os menus.

Os ataques básicos devem funcionar automaticamente, deixando o foco na movimentação, posicionamento e decisões estratégicas.

## 6. PERSONAGEM E ATRIBUTOS

O protagonista deve possuir os seguintes atributos:

- Vida máxima.
- Velocidade de movimento.
- Dano.
- Velocidade de ataque.
- Alcance.
- Chance de acerto crítico.
- Armadura.
- Sorte.
- Ganho de experiência.
- Multiplicador de moedas.
- Regeneração.
- Redução do tempo de recarga.

Os atributos precisam influenciar efetivamente o gameplay.

Crie uma tela de personagem mostrando os atributos atuais, os bônus permanentes e os efeitos temporários da run.

## 7. ARMAS E HABILIDADES

Implemente armas com estilos diferentes, incluindo:

- **Chinelo Voador:** projéteis que perseguem inimigos próximos.
- **Pix Explosivo:** explosões em área que atingem vários inimigos.
- **Mochila de Sobrevivência:** reduz o dano recebido.
- **Café Brasileiro:** aumenta temporariamente a velocidade de movimento e ataque.
- **Carisma Inexplicável:** enfraquece inimigos próximos.
- **Passaporte Lendário:** concede bônus de sorte e recompensas.
- **Combo do Guerreiro:** sequência de golpes em curta distância.
- **Mala Giratória:** objetos orbitam o protagonista e causam dano por contato.

Cada arma deve possuir níveis, atributos, efeitos visuais e uma identidade própria.

Implemente evoluções de armas: combinações específicas entre uma arma e um upgrade podem transformá-la em uma versão muito mais poderosa.

Crie pelo menos oito armas ou habilidades funcionais, com espaço para expansões futuras.

## 8. UPGRADES DURANTE CADA RUN

Quando o jogador subir de nível, apresente três opções aleatórias em uma interface elegante.

Exemplos:

- +15% de dano.
- +10% de velocidade de movimento.
- +20% de alcance.
- +10% de chance crítica.
- +1 projétil por ataque.
- +15% de experiência obtida.
- +20% de moedas coletadas.
- +10% de velocidade de ataque.
- +1 ponto de armadura.
- Recuperação de vida.
- Redução do tempo de recarga.
- Maior chance de encontrar itens raros.

Os upgrades devem possuir raridades: Comum, Raro, Épico e Lendário.

Alguns upgrades devem ser exclusivos de determinadas armas ou combinações.

Implemente limites para atributos que poderiam ficar excessivamente fortes e um sistema de balanceamento para evitar que as runs se tornem triviais.

## 9. UPGRADES PERMANENTES

Crie uma loja entre as runs usando moedas permanentes.

O jogador precisa sentir que cada tentativa contribui para o progresso, mesmo quando morre.

Upgrades permanentes sugeridos:

- Treinamento: aumenta o dano inicial.
- Condicionamento: aumenta a vida máxima.
- Corrida: aumenta a velocidade.
- Planejamento Financeiro: aumenta as moedas recebidas.
- Networking: melhora as recompensas de eventos.
- Sorte no Amor: aumenta a chance de encontrar recompensas raras.
- Passagem Econômica: reduz o tempo necessário para concluir etapas.
- Preparação Internacional: desbloqueia melhorias exclusivas de Portugal.
- Experiência de Viagem: aumenta a experiência recebida.
- Determinação: concede uma pequena proteção contra erros no início da run.

Cada melhoria deve possuir preço crescente, níveis máximos e uma descrição clara do benefício.

Crie uma árvore de progressão permanente com pré-requisitos para melhorias mais poderosas.

O balanceamento deve incentivar múltiplas runs sem exigir uma quantidade absurda de repetição.

## 10. SISTEMA DE MOEDAS E ECONOMIA

Separe claramente:

- Moedas temporárias: coletadas durante a run.
- Moedas permanentes: usadas na loja entre runs.
- Marcos de viagem: objetivos necessários para desbloquear a próxima região.

Ao morrer, as moedas temporárias não gastas são perdidas, salvo quando alguma habilidade permitir convertê-las parcialmente.

Ao concluir uma região, conceda recompensas adicionais.

Implemente baús, tesouros, recompensas de chefes e eventos aleatórios.

Evite microtransações, dependências pagas e sistemas artificiais de espera.

## 11. CONQUISTAS E ESTATÍSTICAS

Crie um sistema completo de conquistas com notificações animadas quando um objetivo for alcançado.

As conquistas devem ser salvas permanentemente.

Estatísticas globais do jogador:

- Total de runs iniciadas.
- Total de runs concluídas.
- Total de mortes.
- Total de vitórias.
- Número de vezes que chegou a Portugal.
- Número de loiras conquistadas.
- Maior tempo de sobrevivência.
- Maior nível alcançado.
- Total de inimigos derrotados.
- Total de chefes derrotados.
- Total de moedas coletadas.
- Total de upgrades adquiridos.
- Maior sequência de vitórias.
- Tempo total jogado.
- Quantidade de regiões desbloqueadas.

Conquistas sugeridas:

**Primeiros Passos**
- Primeiro Sangue: derrote seu primeiro inimigo.
- Sobrevivente: complete sua primeira run.
- Pé na Estrada: desbloqueie a segunda região.
- Marinheiro de Primeira Viagem: sobreviva à travessia do Atlântico.
- Cheguei, Portugal!: conclua a jornada pela primeira vez.
- O Homem Mais Persistente: complete 10 jornadas.
- Lenda Internacional: complete 50 jornadas.

**Romance**
- Primeiro Encontro: conquiste sua primeira loira.
- Coração Internacional: conquiste 5 loiras.
- Colecionador de Histórias: conquiste 10 loiras.
- Casanova Transatlântico: conquiste 25 loiras.
- Charme Infinito: conquiste 100 loiras.

**Sobrevivência**
- Uma Última Chance: sobreviva com menos de 5% de vida.
- Intocável: conclua uma etapa sem receber dano.
- Sem Medo: derrote um chefe.
- Lenda do Atlântico: conclua uma travessia na dificuldade máxima.
- Imparável: vença cinco runs consecutivas.

**Progressão**
- Investidor: compre seu primeiro upgrade permanente.
- Preparado para Tudo: desbloqueie todas as melhorias de uma categoria.
- Arsenal Completo: desbloqueie todas as armas.
- Poder Absoluto: evolua uma arma até seu nível máximo.

Cada conquista deve ter nome, descrição, requisito, recompensa, progresso e estado de desbloqueio.

As estatísticas precisam refletir eventos reais do jogo. Não incremente contadores apenas porque uma tela foi aberta ou uma run foi iniciada.

## 12. SISTEMA DE CONQUISTA DA LOIRA

Ao chegar a Portugal, o jogador desbloqueia uma etapa especial chamada **A Conquista**.

O resultado depende do desempenho da run, das melhorias permanentes, de objetivos opcionais e de decisões tomadas durante a jornada.

Crie diferentes finais:

- **Amigo de Portugal:** chega ao país, mas ainda precisa se preparar.
- **Primeiro Encontro:** consegue um encontro especial.
- **Coração Conquistado:** conquista sua primeira loira.
- **Lenda Romântica:** desbloqueia um final raro.
- **Casanova Imortal:** conquista um final secreto após completar desafios avançados.

As loiras conquistadas devem ser personagens fictícias originais, com nomes, visuais, personalidades e pequenas histórias diferentes.

Crie uma galeria chamada **Álbum de Conquistas**, mostrando cada personagem desbloqueada, a data ou ordem em que foi conquistada e os requisitos para desbloqueá-la.

O jogador pode desbloquear diferentes personagens em várias runs. A conquista de uma personagem deve ser permanente e contabilizada nas estatísticas.

O sistema deve ser divertido, leve e humorístico, sem tratar as personagens como itens compráveis. As conquistas românticas devem resultar de desafios, escolhas e eventos fictícios.

## 13. INIMIGOS E CHEFES

Crie inimigos com comportamentos distintos:

- Burocratas: lentos, mas resistentes.
- Taxas Ocultas: inimigos rápidos que drenam moedas temporárias.
- Pombos do Aeroporto: perseguem o jogador em grupo.
- Piratas do Atlântico: disparam projéteis.
- Tempestades Vivas: causam dano em áreas do cenário.
- Turistas Perdidos: movimentação imprevisível.
- Fiscais do Caos: inimigos de elite com habilidades especiais.

Chefes sugeridos:

- O Rei da Burocracia.
- O Tubarão das Passagens Caras.
- O Kraken das Dívidas.
- O Dragão da Alfândega.
- O Guardião do Último Encontro.

Cada chefe precisa ter barra de vida, padrões de ataque, animações, fases de combate e recompensas exclusivas.

## 14. EVENTOS ALEATÓRIOS

Durante as runs, crie eventos que alterem temporariamente as condições de jogo.

Exemplos:

- Encontrou um emprego temporário: ganha moedas extras.
- Promoção de passagem: reduz o tempo necessário da próxima etapa.
- Tempestade no oceano: inimigos ficam mais fortes.
- Café grátis: aumenta a velocidade de ataque.
- Golpe financeiro: perde parte das moedas temporárias.
- Ajuda de um viajante: recupera vida.
- Mala misteriosa: recebe uma recompensa aleatória.
- Mensagem de Portugal: inicia um desafio opcional com recompensa especial.

Os eventos precisam apresentar uma mensagem curta, efeitos visuais e consequências reais.

## 15. TELAS E INTERFACE

Implemente todas estas telas:

1. Menu principal.
2. Seleção de personagem.
3. Seleção de região e dificuldade.
4. Gameplay.
5. Seleção de upgrades ao subir de nível.
6. Pausa.
7. Resultado da run.
8. Loja de upgrades permanentes.
9. Árvore de progressão.
10. Conquistas.
11. Estatísticas.
12. Álbum de loiras conquistadas.
13. Seleção de armas e informações.
14. Configurações de áudio, controles e qualidade gráfica.

O menu principal deve destacar:

- Botão Jogar.
- Progresso da viagem.
- Moedas permanentes.
- Upgrades.
- Conquistas.
- Estatísticas.
- Álbum de Conquistas.

Na tela de gameplay, apresente vida, experiência, nível, tempo restante, moedas temporárias, inimigos derrotados, arma equipada e região atual.

A interface precisa se adaptar a diferentes resoluções e funcionar em computadores e celulares.

## 16. REGRAS DE BALANCEAMENTO

Implemente um sistema de dificuldade progressiva baseado no tempo da run.

- A quantidade de inimigos aumenta gradualmente.
- A vida e o dano dos inimigos escalam de maneira controlada.
- Chefes aparecem em momentos definidos.
- Upgrades raros devem ser poderosos, mas não garantir automaticamente a vitória.
- Builds diferentes devem permitir estratégias diferentes.
- A morte deve ser compreensível e justa.
- O jogador deve receber recompensas suficientes para perceber sua evolução.

Inclua pelo menos três dificuldades: Normal, Difícil e Lendária.

A conclusão de uma região deve desbloquear a próxima, enquanto as regiões já concluídas podem ser repetidas para obter moedas, conquistas e melhorias.

## 17. SALVAMENTO E PERSISTÊNCIA

Utilize localStorage para persistir:

- Moedas permanentes.
- Upgrades permanentes.
- Regiões desbloqueadas.
- Conquistas.
- Estatísticas.
- Personagens conquistadas.
- Armas desbloqueadas.
- Configurações do jogador.

Implemente versionamento do formato do save, validação dos dados carregados, tratamento de saves inválidos e uma opção de reiniciar o progresso com confirmação.

Evite perder o progresso em uma atualização comum do jogo.

Não permita que reiniciar uma run apague conquistas ou estatísticas históricas.

## 18. ÁUDIO E FEEDBACK

Implemente efeitos sonoros para:

- Ataques.
- Impactos.
- Morte de inimigos.
- Subida de nível.
- Escolha de upgrade.
- Baús.
- Conquistas.
- Vitória.
- Derrota.
- Desbloqueio de personagens.

Adicione música de fundo original ou de uso livre para cada região.

Disponibilize controles de volume e opção para silenciar o jogo.

## 19. ARQUITETURA E QUALIDADE DO CÓDIGO

Separe o projeto em módulos organizados, por exemplo:

- `scenes/`: menu, gameplay, seleção e resultados.
- `entities/`: jogador, inimigos, chefes e NPCs.
- `systems/`: combate, experiência, ondas, loot e progressão.
- `weapons/`: armas e evoluções.
- `upgrades/`: melhorias temporárias e permanentes.
- `achievements/`: conquistas e estatísticas.
- `progression/`: regiões, viagens e finais.
- `ui/`: menus, HUD, loja e galerias.
- `data/`: definições de inimigos, armas e upgrades.
- `storage/`: salvamento e migrações.
- `audio/`: músicas e efeitos.
- `tests/`: testes automatizados.

Use TypeScript com tipagem consistente. Evite concentrar toda a lógica em um arquivo gigante.

Não dependa de assets remotos que possam desaparecer. Prefira arquivos locais e recursos de uso livre com licença apropriada.

## 20. PLANO DE IMPLEMENTAÇÃO

Trabalhe em etapas, mas mantenha o jogo executável durante o desenvolvimento.

**Etapa 1 — Fundação**
- Configurar o projeto.
- Criar menu, jogador, movimentação, inimigos, combate e colisões.
- Implementar experiência, níveis e upgrades temporários.
- Garantir que uma run possa começar, terminar e ser reiniciada.

**Etapa 2 — Conteúdo**
- Adicionar armas, inimigos, chefes, eventos e regiões.
- Criar a progressão até Portugal.
- Implementar a conquista da loira e os finais.

**Etapa 3 — Progressão permanente**
- Criar moedas, loja, upgrades permanentes e árvore de habilidades.
- Implementar conquistas, estatísticas e galeria.
- Integrar o salvamento persistente.

**Etapa 4 — Apresentação**
- Adicionar sprites, animações, partículas, sons e efeitos.
- Melhorar menus, HUD, transições e feedback visual.
- Adaptar o jogo a dispositivos móveis.

**Etapa 5 — Testes e entrega**
- Testar todas as mecânicas.
- Corrigir erros de colisão, progressão, salvamento e balanceamento.
- Verificar que as conquistas só são desbloqueadas quando seus requisitos são cumpridos.
- Garantir que o jogo possa ser iniciado localmente com os comandos documentados.
- Criar instruções claras de instalação, execução e build para produção.

## 21. CRITÉRIOS DE ACEITAÇÃO

O projeto só deve ser considerado concluído quando:

- O jogo iniciar sem erros.
- O personagem se movimentar corretamente.
- Os inimigos surgirem e atacarem.
- O combate e as armas funcionarem.
- A experiência e os upgrades por nível funcionarem.
- Uma run puder ser vencida ou perdida.
- A progressão entre regiões funcionar.
- Portugal puder ser alcançado.
- O sistema de conquista de personagens funcionar.
- Os upgrades permanentes forem compráveis e afetarem o gameplay.
- As estatísticas e conquistas forem atualizadas corretamente.
- O progresso continuar salvo após fechar e reabrir o navegador.
- Os menus, configurações e galerias estiverem funcionais.
- Não existirem botões decorativos que aparentem funcionar, mas não executem nenhuma ação.
- Não existirem erros críticos no console.

## 22. INSTRUÇÃO FINAL PARA A IA DE DESENVOLVIMENTO

Antes de modificar arquivos, inspecione o ambiente e a estrutura existente. Se o projeto estiver vazio, configure-o do zero.

Implemente o jogo de verdade, não apenas um plano, uma descrição ou telas estáticas.

Priorize um ciclo de gameplay completo e divertido antes de expandir a quantidade de conteúdo. Faça alterações incrementais, execute os testes disponíveis e corrija os problemas encontrados antes de avançar.

Não substitua sistemas funcionais por simulações visuais. Todas as armas, moedas, conquistas, melhorias, inimigos e condições de vitória devem possuir lógica real.

Ao concluir cada etapa, informe resumidamente o que foi implementado, quais arquivos foram criados ou alterados e como executar e testar o jogo.

**Resultado esperado:** um roguelite de sobrevivência de navegador, divertido, engraçado, visualmente polido e rejogável, em que cada run aproxima o protagonista brasileiro de Portugal e da conquista da sua loira dos sonhos.