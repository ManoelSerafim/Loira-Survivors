import './style.css';
import { App } from './ui/app';

const uiRoot = document.getElementById('ui-root');
const gameContainer = document.getElementById('game-container');

if (!uiRoot || !gameContainer) {
  throw new Error('Não foi possível encontrar a estrutura da interface do jogo.');
}

const app = new App(uiRoot, gameContainer);

try {
  app.boot();
} catch (error) {
  console.error('Falha ao iniciar Loira Survivors:', error);
  uiRoot.innerHTML = `<div class="boot-error">
    <span class="boot-error-mark" aria-hidden="true">!</span>
    <h1>O avião não decolou</h1>
    <p>Não foi possível iniciar o jogo. Recarregue a página ou verifique se o navegador tem suporte a WebGL.</p>
    <button class="btn btn-primary" type="button" onclick="window.location.reload()">Recarregar</button>
  </div>`;
}
