import type { SaveData } from '../../core/types';
import { esc, coinPill, spriteImg } from '../components';
import { ACHIEVEMENTS } from '../../data/achievements';
import { getCharacter } from '../../data/characters';
import { getBoss } from '../../data/enemies';
import { getDifficulty, getRegion, REGIONS } from '../../data/regions';
import { nextRegionSuggestion, albumCount, totalMetaLevel } from '../../systems/progression';
import { formatNumber, formatTime, plural } from '../../core/format';
import type { Selection } from '../state';
import { activeMetaBonuses, regionStatus, travelRoute } from './shared';

function navCard(action: string, icon: string, title: string, hint: string, accent = ''): string {
  return `<button class="menu-nav-card ${accent}" data-action="goto" data-screen="${action}">
    <span class="menu-nav-icon" aria-hidden="true">${icon}</span>
    <span class="menu-nav-copy"><strong>${esc(title)}</strong><small>${esc(hint)}</small></span>
    <span class="menu-nav-arrow" aria-hidden="true">→</span>
  </button>`;
}

export function renderMenu(save: SaveData, selection: Selection): string {
  const character = getCharacter(selection.characterId);
  const region = getRegion(
    save.unlockedRegions.includes(selection.regionId) ? selection.regionId : nextRegionSuggestion(save),
  );
  const boss = getBoss(region.bossId);
  const status = regionStatus(save, region);
  const difficulty = getDifficulty(selection.difficulty);
  const nextRegion = nextRegionSuggestion(save);
  const cleared = save.clearedRegions.length;
  const nextCleared = save.clearedRegions.includes(nextRegion);
  const earnedAchievements = Object.keys(save.achievements).length;
  const album = albumCount(save);
  const meta = totalMetaLevel(save);
  const permaBonuses = activeMetaBonuses(save);
  const bestTime = Math.max(0, ...REGIONS.map((entry) => save.bestTimes[entry.id] ?? 0));
  const unlockedWeapons = save.unlockedWeapons.length;
  const ownedLoiras = album;

  const statusLine = nextCleared
    ? 'Todas as etapas concluídas. Portugal é casa.'
    : `Próxima parada: ${getRegion(nextRegion).name}`;

  return `<div class="screen screen-menu">
    <div class="menu-bg" aria-hidden="true">
      <span class="menu-sun"></span>
      <span class="menu-cloud cloud-a"></span>
      <span class="menu-cloud cloud-b"></span>
      <span class="menu-pixel-star star-a">✦</span>
      <span class="menu-pixel-star star-b">✦</span>
      <span class="menu-pixel-star star-c">✦</span>
      <span class="menu-wave wave-a"></span>
      <span class="menu-wave wave-b"></span>
    </div>
    <div class="menu-inner">
      <header class="menu-topbar">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true"><span>LS</span></span>
          <span class="brand-copy"><strong>LOIRA SURVIVORS</strong><small>est. 2026 · rota atlântica</small></span>
        </div>
        <div class="menu-top-actions">
          ${coinPill(save.permanentCoins)}
          <button class="icon-btn ${save.settings.muted ? 'is-muted' : ''}" data-action="toggle-mute" aria-label="${save.settings.muted ? 'Ativar som' : 'Silenciar'}" title="${save.settings.muted ? 'Ativar som' : 'Silenciar'}">${save.settings.muted ? '🔇' : '🔊'}</button>
          <button class="icon-btn" data-action="goto" data-screen="settings" aria-label="Configurações" title="Configurações">⚙</button>
        </div>
      </header>

      <main class="menu-hero">
        <section class="menu-copy">
          <span class="eyebrow"><span class="live-dot" aria-hidden="true"></span> roguelite de sobrevivência</span>
          <h1 class="game-logo" aria-label="Loira Survivors">
            <span class="logo-line logo-line-a">LOIRA</span>
            <span class="logo-line logo-line-b">SURVIVORS</span>
          </h1>
          <p class="logo-sub">A JORNADA ATÉ <strong>PORTUGAL</strong></p>
          <p class="menu-lead">Um brasileiro, um chinelo voador e um oceano inteiro de problemas. Sobreviva às hordas, evolua suas armas e conquiste seu final — de preferência sem perder a mala.</p>

          <div class="menu-primary-row">
            <button class="btn btn-primary btn-hero" data-action="goto" data-screen="character">
              <span class="btn-icon" aria-hidden="true">▶</span>
              <span class="btn-copy"><strong>${save.stats.runsStarted > 0 ? 'Continuar a jornada' : 'Começar a jornada'}</strong><small>${esc(statusLine)}</small></span>
              <span class="btn-arrow" aria-hidden="true">→</span>
            </button>
            <button class="btn btn-ghost btn-help" data-action="show-help"><span aria-hidden="true">?</span> Como jogar</button>
          </div>

          <div class="menu-quick-stats" aria-label="Resumo do progresso">
            <span><strong>${cleared}/5</strong><small>etapas</small></span>
            <span><strong>${earnedAchievements}/${ACHIEVEMENTS.length}</strong><small>conquistas</small></span>
            <span><strong>${ownedLoiras}/6</strong><small>loiras</small></span>
            <span><strong>${bestTime ? formatTime(bestTime) : '—'}</strong><small>melhor tempo</small></span>
          </div>

          <div class="menu-meta-strip">
            <span class="meta-level">${meta > 0 ? `Nível de viagem ${meta}` : 'Novo na estrada'}</span>
            ${permaBonuses.length ? permaBonuses.slice(0, 3).map((bonus) => `<span class="mini-bonus">${esc(bonus.text)}</span>`).join('') : '<span class="mini-bonus is-muted">Compre melhorias permanentes para facilitar a próxima tentativa.</span>'}
          </div>
        </section>

        <aside class="menu-visual" aria-label="Destino atual">
          <div class="visual-ring" aria-hidden="true"></div>
          <div class="travel-postcard">
            <span class="postcard-tape" aria-hidden="true"></span>
            <div class="postcard-image">
              <img src="./${esc(region.art)}" alt="${esc(region.name)}" draggable="false">
              <span class="postcard-badge">${region.order}/5</span>
              <span class="postcard-stamp">${status.className === 'is-cleared' ? 'CONCLUÍDA' : 'DESTINO'}</span>
            </div>
            <div class="postcard-caption">
              <div><span class="eyebrow">${esc(region.subtitle)}</span><strong>${esc(region.name)}</strong></div>
              <span class="postcard-difficulty" style="--diff-color:${difficulty.color}">${esc(difficulty.name)}</span>
            </div>
            <div class="postcard-meta">
              <span>⏱ ${Math.round(region.duration / 60)} min</span>
              <span>☠ ${esc(boss.name)}</span>
            </div>
            <div class="postcard-ticket" aria-hidden="true"><span>BR</span><span class="ticket-plane">✈</span><span>PT</span></div>
          </div>

          <div class="hero-figure">
            ${spriteImg(character.portrait, character.name, 'hero-figure-img', '🧑')}
            <span class="hero-shadow" aria-hidden="true"></span>
          </div>
          <div class="hero-speech">
            <span class="eyebrow">${esc(character.name)}</span>
            <p>${esc(region.tip)}</p>
          </div>
          <div class="visual-sticker sticker-a" aria-hidden="true">🇧🇷 → 🇵🇹</div>
          <div class="visual-sticker sticker-b" aria-hidden="true">mala<br>incluída</div>
        </aside>
      </main>

      <section class="menu-route-panel panel">
        <div class="section-heading compact">
          <div><span class="eyebrow">mapa da jornada</span><h2>A rota até o encontro</h2></div>
          <span class="route-summary">${cleared} de 5 etapas · ${save.stats.portugalWins > 0 ? `${save.stats.portugalWins} vitória${save.stats.portugalWins > 1 ? 's' : ''} em Portugal` : 'Portugal ainda espera'}</span>
        </div>
        ${travelRoute(save, region.id)}
      </section>

      <nav class="menu-nav-grid" aria-label="Menu principal">
        ${navCard('multiplayer', '🛰️', 'Multiplayer cooperativo', 'Criar sala e jogar com amigos', 'accent-mint')}
        ${navCard('shop', '🛒', 'Loja de upgrades', `${formatNumber(save.permanentCoins)} moedas permanentes`, 'accent-gold')}
        ${navCard('tree', '🌳', 'Árvore de progressão', plural(meta, 'nível permanente', 'níveis permanentes'))}
        ${navCard('achievements', '🏆', 'Conquistas', `${earnedAchievements} de ${ACHIEVEMENTS.length} desbloqueadas`)}
        ${navCard('album', '💌', 'Álbum de conquistas', `${ownedLoiras} de 6 loiras no álbum`, 'accent-pink')}
        ${navCard('stats', '📊', 'Estatísticas', plural(save.stats.runsFinished, 'jornada finalizada', 'jornadas finalizadas'))}
        ${navCard('arsenal', '🎒', 'Arsenal e loadout', `${unlockedWeapons} de 8 armas desbloqueadas`)}
        ${navCard('settings', '⚙️', 'Configurações', 'Áudio, controles e qualidade')}
        ${navCard('character', '🧭', 'Preparar viagem', `${character.name} · ${getRegion(nextRegion).name}`, 'accent-mint')}
      </nav>

      <footer class="menu-footer">
        <span>Um jogo sobre persistência, filas de aeroporto e finais felizes.</span>
        <span>Progresso salvo neste navegador · v1.0</span>
      </footer>
    </div>
  </div>`;
}
