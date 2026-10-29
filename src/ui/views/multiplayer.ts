import type { CharacterId, SaveData, Selection } from '../../core/types';
import { CHARACTER_FRAME } from '../../game/constants';
import type { LobbySnapshot } from '../../network/types';
import { getCharacter } from '../../data/characters';
import { esc, topBar, pageHeader } from '../components';

export interface MultiplayerViewModel {
  nickname: string;
  roomCodeInput: string;
  status: 'offline' | 'connecting' | 'connected' | 'error';
  statusMessage: string;
  lobby: LobbySnapshot | null;
  mySessionId: string;
  hostSessionId: string;
}

function statusLabel(status: MultiplayerViewModel['status']): string {
  if (status === 'connecting') return 'Conectando...';
  if (status === 'connected') return 'Conectado';
  if (status === 'error') return 'Erro de conexao';
  return 'Offline';
}

function playerFrame(selection: Selection): number {
  return CHARACTER_FRAME[selection.characterId] ?? 0;
}

function playerName(save: SaveData, selectedCharacter: CharacterId): string {
  const char = getCharacter(selectedCharacter);
  const base = save.unlockedCharacters.includes(selectedCharacter) ? char.name : 'Viajante';
  return base;
}

export function renderMultiplayer(save: SaveData, selection: Selection, model: MultiplayerViewModel): string {
  const canStart = !!model.lobby && model.mySessionId === model.hostSessionId && model.lobby.players.length > 0;
  const connected = model.status === 'connected' && !!model.lobby;
  const defaultNick = model.nickname || playerName(save, selection.characterId);
  const frame = playerFrame(selection);

  return `<div class="screen screen-multiplayer">
    <div class="screen-inner">
      ${topBar(save.permanentCoins, 'Multiplayer cooperativo', 'Criar sala ou entrar por codigo', save.settings.muted)}
      ${pageHeader(
        'jogar com amigos',
        'Lobby cooperativo (ate 4 jogadores)',
        'Crie uma sala, compartilhe o codigo e inicie a jornada quando todos entrarem.',
        `<span class="header-route">Frame atual: ${frame}</span>`,
      )}

      <section class="panel mp-setup">
        <div class="panel-heading">
          <div><span class="eyebrow">conexao</span><h2>Status da sala</h2></div>
          <span class="badge-soft mp-status mp-status-${model.status}">${statusLabel(model.status)}</span>
        </div>
        <p class="panel-note">${esc(model.statusMessage || 'Sem conexao ativa.')}</p>

        <div class="mp-form-grid">
          <label class="input-stack">
            <span>Seu apelido</span>
            <input type="text" maxlength="18" value="${esc(defaultNick)}" data-mp="nickname" placeholder="Digite seu apelido" ${connected ? 'disabled' : ''}>
          </label>
          <label class="input-stack">
            <span>Codigo da sala</span>
            <input type="text" maxlength="6" value="${esc(model.roomCodeInput)}" data-mp="roomCode" placeholder="ABC123" ${connected ? 'disabled' : ''}>
          </label>
        </div>

        <div class="mp-actions">
          <button class="btn btn-primary" data-action="mp-create-room" ${connected ? 'disabled' : ''}>Criar sala</button>
          <button class="btn btn-secondary" data-action="mp-join-room" ${connected ? 'disabled' : ''}>Entrar na sala</button>
          <button class="btn btn-ghost" data-action="mp-leave-room" ${connected ? '' : 'disabled'}>Sair da sala</button>
        </div>
      </section>

      <section class="panel mp-lobby">
        <div class="panel-heading">
          <div><span class="eyebrow">lobby</span><h2>Jogadores conectados</h2></div>
          <span class="badge-soft">${model.lobby ? `${model.lobby.players.length}/${model.lobby.maxPlayers}` : '0/4'}</span>
        </div>

        ${
          model.lobby
            ? `<div class="mp-room-code">Codigo da sala: <strong>${esc(model.lobby.roomCode)}</strong></div>
               <ul class="mp-player-list">
                 ${model.lobby.players
                   .map((player) => {
                     const isMe = player.sessionId === model.mySessionId;
                     const isHost = player.sessionId === model.hostSessionId;
                     return `<li class="mp-player-row ${isMe ? 'is-me' : ''}">
                       <span class="mp-player-name">${esc(player.nickname)}${isMe ? ' (voce)' : ''}</span>
                       <span class="mp-player-tags">
                         ${isHost ? '<span class="tag tag-gold">Host</span>' : ''}
                         <span class="tag ${player.status === 'alive' ? 'tag-good' : 'tag-muted'}">${esc(player.status)}</span>
                       </span>
                     </li>`;
                   })
                   .join('')}
               </ul>`
            : '<p class="panel-note">Nenhuma sala conectada no momento.</p>'
        }

        <div class="mp-actions">
          <button class="btn btn-primary" data-action="mp-start-run" ${canStart ? '' : 'disabled'}>Iniciar partida</button>
          <button class="btn btn-ghost" data-action="goto" data-screen="character">Ajustar personagem</button>
        </div>
      </section>
    </div>
  </div>`;
}
