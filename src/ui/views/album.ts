import type { SaveData } from '../../core/types';
import { formatNumber } from '../../core/format';
import { esc, topBar, pageHeader, progressBar } from '../components';
import { LOIRAS } from '../../data/loiras';
import { ENDINGS, ENDING_MAP } from '../../data/endings';
import { albumCount } from '../../systems/progression';
import { difficultyLabel } from '../../core/format';
import { formatDate } from './shared';

function loiraCard(save: SaveData, index: number): string {
  const loira = LOIRAS[index];
  const record = save.album[loira.id];
  const unlocked = !!record;
  const ending = record ? ENDING_MAP[record.endingId] : null;
  return `<article class="loira-card ${unlocked ? 'is-unlocked' : 'is-locked'}" style="--loira-color:${loira.color};--loira-accent:${loira.accent}">
    <span class="loira-order">${String(index + 1).padStart(2, '0')}</span>
    <div class="loira-portrait-wrap">
      <span class="loira-halo" aria-hidden="true"></span>
      ${unlocked ? `<img class="loira-portrait" src="./${esc(loira.portrait)}" alt="${esc(loira.name)}" draggable="false">` : '<div class="loira-silhouette" aria-hidden="true"><span>?</span></div>'}
      <span class="loira-stamp">${unlocked ? 'CONQUISTADA' : 'SEGREDO'}</span>
    </div>
    <div class="loira-copy">
      <span class="eyebrow">${esc(loira.subtitle)}</span>
      <h2>${esc(loira.name)}</h2>
      <p class="loira-description">${esc(loira.description)}</p>
      <div class="loira-personality"><span aria-hidden="true">✨</span><span>${esc(loira.personality)}</span></div>
      ${
        unlocked && record
          ? `<div class="loira-record">
              <span><small>Conquista nº</small><strong>${record.order}</strong></span>
              <span><small>Data</small><strong>${esc(formatDate(record.conqueredAt))}</strong></span>
              <span><small>Dificuldade</small><strong>${esc(difficultyLabel(record.difficulty))}</strong></span>
              <span><small>Final</small><strong>${esc(ending?.name ?? '—')}</strong></span>
            </div>
            <details class="loira-story"><summary>Ler a história do encontro</summary><p>${esc(loira.story)}</p></details>`
          : `<div class="loira-locked-box"><span aria-hidden="true">🔒</span><p><strong>Requisito:</strong> ${esc(loira.requirement)}</p></div>`
      }
    </div>
  </article>`;
}

function endingCard(save: SaveData, index: number): string {
  const ending = ENDINGS[index];
  const record = save.endings[ending.id];
  const unlocked = !!record;
  const secretLocked = ending.id === 'casanova_imortal' && !unlocked;
  return `<article class="ending-card ${unlocked ? 'is-unlocked' : 'is-locked'} ${ending.id === 'casanova_imortal' ? 'is-secret' : ''}" style="--ending-color:${ending.color}">
    <span class="ending-emoji" aria-hidden="true">${unlocked ? ending.emoji : secretLocked ? '❔' : '🔒'}</span>
    <div class="ending-copy">
      <span class="eyebrow">final ${String(index + 1).padStart(2, '0')}</span>
      <h3>${secretLocked ? 'Final secreto' : esc(ending.name)}</h3>
      <p>${unlocked ? esc(ending.description) : secretLocked ? 'Dizem que existe um final que ninguém conta em voz alta.' : esc(ending.condition)}</p>
    </div>
    <div class="ending-status">
      ${unlocked ? `<strong>${formatNumber(record.count)}×</strong><small>alcançado</small><span>${esc(formatDate(record.firstAt))}</span>` : `<span class="tag tag-locked">${secretLocked ? 'Condição oculta' : 'Não alcançado'}</span>`}
    </div>
  </article>`;
}

export function renderAlbum(save: SaveData): string {
  const count = albumCount(save);
  const discoveredEndings = Object.keys(save.endings).length;
  const totalConquests = save.stats.conquests;
  return `<div class="screen screen-album">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Álbum de conquistas', 'Encontros que valeram a viagem', save.settings.muted)}
      ${pageHeader(
        'não são itens de compra',
        'Álbum de Conquistas',
        'Seis personagens fictícias, seis histórias diferentes. Cada encontro depende de como você venceu Portugal — nunca de uma compra.',
        `<span class="badge-soft">${count}/${LOIRAS.length} loiras · ${discoveredEndings}/${ENDINGS.length} finais</span>`,
      )}
      <section class="album-header panel">
        <div class="album-progress-copy">
          <span class="eyebrow">coleção de histórias</span>
          <h2>${count === 0 ? 'A primeira página está em branco' : count === LOIRAS.length ? 'Álbum completo. Que trajeto.' : `${count} de ${LOIRAS.length} encontros registrados`}</h2>
          <p>${count === 0 ? 'Vença Portugal para abrir espaço para a primeira história. Cada final e cada requisito pode apresentar alguém novo.' : `Conquistas românticas totais: ${formatNumber(totalConquests)}. Repetir Portugal com objetivos diferentes é a chave.`}</p>
        </div>
        <div class="album-progress">${progressBar(count, LOIRAS.length, 'progress-large', true)}</div>
        <div class="album-header-note"><span aria-hidden="true">💌</span><p>Encontros são permanentes e ficam salvos neste navegador. A data e a ordem são registradas automaticamente.</p></div>
      </section>

      <div class="loira-grid">${LOIRAS.map((_, index) => loiraCard(save, index)).join('')}</div>

      <section class="endings-section">
        <div class="section-heading">
          <div><span class="eyebrow">os caminhos do coração</span><h2>Finais de Portugal</h2><p>O desempenho da run decide onde a história termina. Todos os finais podem ser revisitados aqui.</p></div>
          <span class="badge-soft">${discoveredEndings}/${ENDINGS.length}</span>
        </div>
        <div class="ending-grid">${ENDINGS.map((_, index) => endingCard(save, index)).join('')}</div>
      </section>

      <footer class="collection-footer">
        <span>${count === LOIRAS.length ? 'Agora só falta contar essa história para alguém.' : 'Dica: dificuldade, vida restante, moedas e desafios opcionais mudam quem aparece.'}</span>
        <button class="btn btn-ghost btn-sm" data-action="goto" data-screen="journey">Voltar para a rota</button>
      </footer>
    </div>
  </div>`;
}
