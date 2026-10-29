import type { SaveData } from '../../core/types';
import { formatNumber, formatTime, plural } from '../../core/format';
import { esc, topBar, pageHeader, progressBar } from '../components';
import { ACHIEVEMENTS } from '../../data/achievements';
import { LOIRAS } from '../../data/loiras';
import { REGIONS } from '../../data/regions';
import { ENDINGS } from '../../data/endings';
import { albumCount } from '../../systems/progression';
import { formatDate, formatLongDuration, statTile } from './shared';

function row(label: string, value: string, hint = ''): string {
  return `<div class="stats-row"><span class="stats-label">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</span><strong>${value}</strong></div>`;
}

export function renderStats(save: SaveData): string {
  const stats = save.stats;
  const winRate = stats.runsFinished > 0 ? stats.runsWon / stats.runsFinished : 0;
  const achievementCount = Object.keys(save.achievements).length;
  const loiras = albumCount(save);
  const endings = Object.keys(save.endings).length;
  const cleared = save.clearedRegions.length;

  return `<div class="screen screen-stats">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Estatísticas', 'O diário da jornada', save.settings.muted)}
      ${pageHeader(
        'números que contam histórias',
        'Estatísticas',
        'Tudo aqui vem de runs reais — inimigos que caíram, chefes derrotados, finais alcançados e moedas que sobreviveram à viagem.',
        `<span class="badge-soft">${plural(stats.runsFinished, 'jornada finalizada', 'jornadas finalizadas')}</span>`,
      )}

      <section class="stats-highlight">
        ${statTile('Runs iniciadas', formatNumber(stats.runsStarted), '▶️')}
        ${statTile('Runs concluídas', formatNumber(stats.runsFinished), '🏁')}
        ${statTile('Vitórias', formatNumber(stats.runsWon), '🏆')}
        ${statTile('Mortes', formatNumber(stats.deaths), '💀')}
        ${statTile('Taxa de vitória', `${Math.round(winRate * 100)}%`, '📈')}
        ${statTile('Conquistas', `${achievementCount}/${ACHIEVEMENTS.length}`, '🎖️')}
      </section>

      <div class="stats-layout">
        <section class="panel stats-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">desde o primeiro passo</span><h2>Ficha completa</h2></div>
            <span class="badge-soft">desde ${esc(formatDate(save.createdAt))}</span>
          </div>
          <div class="stats-columns">
            <div class="stats-group">
              <h3>Jornada</h3>
              ${row('Total de runs iniciadas', formatNumber(stats.runsStarted))}
              ${row('Total de runs concluídas', formatNumber(stats.runsFinished))}
              ${row('Total de mortes', formatNumber(stats.deaths))}
              ${row('Total de vitórias', formatNumber(stats.runsWon))}
              ${row('Chegadas a Portugal', formatNumber(stats.portugalReaches), 'toda run iniciada em Portugal conta')}
              ${row('Vitórias em Portugal', formatNumber(stats.portugalWins))}
              ${row('Loiras conquistadas', formatNumber(stats.conquests), plural(loiras, 'personagem única no álbum', 'personagens únicas no álbum'))}
              ${row('Regiões desbloqueadas', `${save.unlockedRegions.length} / ${REGIONS.length}`, `${cleared} ${cleared === 1 ? 'concluída' : 'concluídas'}`)}
            </div>
            <div class="stats-group">
              <h3>Combate & recordes</h3>
              ${row('Maior tempo de sobrevivência', stats.bestTime ? formatTime(stats.bestTime) : '—')}
              ${row('Maior nível alcançado', formatNumber(stats.bestLevel))}
              ${row('Inimigos derrotados', formatNumber(stats.totalKills))}
              ${row('Chefes derrotados', formatNumber(stats.bossKills))}
              ${row('Moedas temporárias coletadas', formatNumber(stats.coinsCollected))}
              ${row('Upgrades de run escolhidos', formatNumber(stats.upgradesChosen))}
              ${row('Maior sequência de vitórias', formatNumber(stats.maxWinStreak))}
              ${row('Tempo total jogado', formatLongDuration(stats.totalTimePlayed))}
            </div>
            <div class="stats-group">
              <h3>Extras</h3>
              ${row('Moedas convertidas ao final', formatNumber(stats.tempCoinsBanked))}
              ${row('Melhorias permanentes compradas', formatNumber(stats.metaUpgradesBought))}
              ${row('Sequência atual de vitórias', formatNumber(stats.winStreak))}
              ${row('Etapas sem receber dano', formatNumber(stats.noHitWins))}
              ${row('Vitórias com menos de 5% de vida', formatNumber(stats.lowHpWins))}
              ${row('Atlântico no Lendário', formatNumber(stats.legendaryAtlantico))}
              ${row('Finais secretos', formatNumber(stats.secretEndings))}
              ${row('Finais descobertos', `${endings} / ${ENDINGS.length}`)}
            </div>
          </div>
        </section>

        <aside class="stats-side">
          <section class="panel">
            <div class="panel-heading">
              <div><span class="eyebrow">melhores tempos</span><h2>Recordes por região</h2></div>
            </div>
            <div class="region-records">
              ${REGIONS.map((region) => {
                const best = save.bestTimes[region.id];
                const clearedRegion = save.clearedRegions.includes(region.id);
                return `<div class="region-record ${clearedRegion ? 'is-cleared' : ''}">
                  <span class="region-record-order">${String(region.order).padStart(2, '0')}</span>
                  <span class="region-record-copy"><strong>${esc(region.name)}</strong><small>${clearedRegion ? 'Concluída' : save.unlockedRegions.includes(region.id) ? 'Disponível' : 'Bloqueada'}</small></span>
                  <strong class="region-record-time">${best ? formatTime(best) : '—'}</strong>
                </div>`;
              }).join('')}
            </div>
            <div class="route-meter">${progressBar(cleared, REGIONS.length, 'progress-large', true)}</div>
          </section>

          <section class="panel">
            <div class="panel-heading">
              <div><span class="eyebrow">álbum</span><h2>Histórias de amor</h2></div>
              <span class="badge-soft">${loiras}/${LOIRAS.length}</span>
            </div>
            <div class="album-mini-row">
              ${LOIRAS.map((loira) => {
                const unlocked = !!save.album[loira.id];
                return `<span class="album-mini ${unlocked ? 'is-unlocked' : ''}" title="${unlocked ? esc(loira.name) : 'Ainda não conquistada'}" style="--loira-color:${loira.color}">
                  ${unlocked ? `<img src="./${esc(loira.portrait)}" alt="${esc(loira.name)}">` : '<span aria-hidden="true">?</span>'}
                </span>`;
              }).join('')}
            </div>
            <p class="panel-note">${loiras === LOIRAS.length ? 'Álbum completo. Lisboa inteira conhece seu nome.' : 'Vença Portugal e cumpra requisitos diferentes para conhecer cada personagem.'}</p>
            <button class="btn btn-ghost btn-sm" data-action="goto" data-screen="album">Abrir álbum de conquistas</button>
          </section>

          <section class="panel stats-note">
            <span class="eyebrow">como ler estes números</span>
            <p>Runs iniciadas contam no clique de início; mortes e vitórias só ao encerrar de verdade. Reiniciar a run não apaga recordes nem conquistas.</p>
          </section>
        </aside>
      </div>
    </div>
  </div>`;
}
