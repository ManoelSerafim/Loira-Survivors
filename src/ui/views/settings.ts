import type { SaveData } from '../../core/types';
import { esc, topBar, pageHeader } from '../components';

function volumeRow(label: string, hint: string, key: string, value: number, emoji: string): string {
  return `<label class="volume-row">
    <span class="volume-label"><span aria-hidden="true">${emoji}</span><span><strong>${esc(label)}</strong><small>${esc(hint)}</small></span></span>
    <input class="range" type="range" min="0" max="100" step="1" value="${Math.round(value * 100)}" data-setting="${key}" aria-label="${esc(label)}">
    <output class="volume-value" data-volume-label="${key}">${Math.round(value * 100)}%</output>
  </label>`;
}

function toggleRow(label: string, hint: string, key: string, active: boolean, emoji: string): string {
  return `<div class="setting-row">
    <span class="setting-icon" aria-hidden="true">${emoji}</span>
    <span class="setting-copy"><strong>${esc(label)}</strong><small>${esc(hint)}</small></span>
    <button class="switch ${active ? 'is-on' : ''}" data-action="toggle-setting" data-setting="${key}" role="switch" aria-checked="${active}" aria-label="${esc(label)}"><span></span></button>
  </div>`;
}

function segmented(label: string, hint: string, key: string, options: { value: string; label: string }[], current: string): string {
  return `<div class="setting-row setting-row-stack">
    <span class="setting-copy"><strong>${esc(label)}</strong><small>${esc(hint)}</small></span>
    <div class="segmented" role="group" aria-label="${esc(label)}">
      ${options.map((option) => `<button class="${current === option.value ? 'is-active' : ''}" data-action="set-setting" data-setting="${key}" data-value="${option.value}" aria-pressed="${current === option.value}">${esc(option.label)}</button>`).join('')}
    </div>
  </div>`;
}

export function renderSettings(save: SaveData): string {
  const settings = save.settings;
  return `<div class="screen screen-settings">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Configurações', 'Áudio, controles e qualidade', settings.muted)}
      ${pageHeader(
        'ajuste a experiência',
        'Configurações',
        'Tudo é salvo automaticamente neste navegador. O jogo não envia dados para lugar nenhum.',
        `<span class="badge-soft">${settings.muted ? '🔇 Som desligado' : '🔊 Som ligado'}</span>`,
      )}

      <div class="settings-layout">
        <section class="panel settings-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">trilha e efeitos</span><h2>Áudio</h2></div>
            <button class="btn btn-ghost btn-sm" data-action="test-sound">Testar som</button>
          </div>
          ${volumeRow('Volume geral', 'O volume de tudo que sai do jogo.', 'masterVolume', settings.masterVolume, '🔊')}
          ${volumeRow('Música', 'Trilha procedural, uma para cada região.', 'musicVolume', settings.musicVolume, '🎵')}
          ${volumeRow('Efeitos', 'Ataques, impactos, moedas e conquistas.', 'sfxVolume', settings.sfxVolume, '💥')}
          <div class="setting-row">
            <span class="setting-icon" aria-hidden="true">${settings.muted ? '🔇' : '🔊'}</span>
            <span class="setting-copy"><strong>Silenciar tudo</strong><small>Desliga música e efeitos sem perder os volumes escolhidos.</small></span>
            <button class="switch ${settings.muted ? 'is-on' : ''}" data-action="toggle-mute" role="switch" aria-checked="${settings.muted}" aria-label="Silenciar tudo"><span></span></button>
          </div>
          <p class="panel-note">O navegador só libera áudio após o primeiro clique. É por isso que a música pode começar um instante depois de abrir o jogo.</p>
        </section>

        <section class="panel settings-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">imagem e conforto</span><h2>Visual</h2></div>
          </div>
          ${segmented('Qualidade gráfica', 'Controla partículas e efeitos ambientais.', 'quality', [
            { value: 'alta', label: 'Alta' },
            { value: 'media', label: 'Média' },
            { value: 'baixa', label: 'Baixa' },
          ], settings.quality)}
          ${toggleRow('Tremor de tela', 'Impactos sacodem a câmera. Desligue se preferir uma imagem estável.', 'screenShake', settings.screenShake, '📳')}
          ${toggleRow('Números de dano', 'Mostra o dano causado e recebido.', 'damageNumbers', settings.damageNumbers, '🔢')}
          ${toggleRow('Contador de FPS', 'Um pequeno medidor de desempenho no canto do HUD.', 'showFps', settings.showFps, '📈')}
        </section>

        <section class="panel settings-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">teclado e toque</span><h2>Controles</h2></div>
          </div>
          ${segmented('Lado do joystick', 'Em dispositivos móveis, escolha a mão que guia e a que ataca.', 'joystickSide', [
            { value: 'esquerda', label: 'Esquerda' },
            { value: 'direita', label: 'Direita' },
          ], settings.joystickSide)}
          <div class="control-grid">
            <div><kbd>WASD</kbd><kbd>↑↓←→</kbd><span>Mover o protagonista</span></div>
            <div><kbd>ESPAÇO</kbd><span>Habilidade especial / dash</span></div>
            <div><kbd>ESC</kbd><span>Pausar ou retomar</span></div>
            <div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><span>Escolher upgrade na subida de nível</span></div>
          </div>
          <p class="panel-note">No celular, arraste o joystick virtual e toque no botão especial. Os ataques são automáticos.</p>
        </section>

        <section class="panel settings-panel danger-panel">
          <div class="panel-heading">
            <div><span class="eyebrow">dados locais</span><h2>Progresso</h2></div>
          </div>
          <div class="save-facts">
            <span><small>Criado em</small><strong>${esc(new Date(save.createdAt).toLocaleDateString('pt-BR'))}</strong></span>
            <span><small>Moedas permanentes</small><strong>${save.permanentCoins.toLocaleString('pt-BR')}</strong></span>
            <span><small>Conquistas</small><strong>${Object.keys(save.achievements).length}</strong></span>
            <span><small>Runs</small><strong>${save.stats.runsFinished}</strong></span>
          </div>
          <p>Reiniciar apaga moedas, upgrades, conquistas, álbum e estatísticas deste navegador. A ação pede confirmação e não pode ser desfeita.</p>
          <button class="btn btn-danger btn-sm" data-action="request-reset"><span aria-hidden="true">⚠</span> Reiniciar todo o progresso</button>
          <p class="panel-note">Saves corrompidos são copiados para um backup local antes de qualquer reinício automático.</p>
        </section>
      </div>

      <footer class="settings-footer">
        <span>Loira Survivors · v1.0 · feito para rodar offline</span>
        <button class="btn btn-ghost btn-sm" data-action="back">← Voltar</button>
      </footer>
    </div>
  </div>`;
}
