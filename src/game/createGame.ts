import Phaser from 'phaser';
import type { GameLaunch, OfferCard } from '../core/types';
import { GameScene } from './GameScene';

export interface GameController {
  readonly scene: GameScene | null;
  getFps(): number;
  pause(): void;
  resume(): void;
  chooseOffer(index: number): void;
  reroll(): OfferCard[] | null;
  special(): void;
  abandon(): void;
  destroy(): void;
}

export function createGame(launch: GameLaunch, parent: HTMLElement): GameController {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#050a14',
    transparent: false,
    banner: false,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Math.max(320, parent.clientWidth || window.innerWidth),
      height: Math.max(240, parent.clientHeight || window.innerHeight),
    },
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      powerPreference: 'high-performance',
    },
    fps: { target: 60, forceSetTimeOut: false },
    scene: [],
  });

  game.scene.add('GameScene', GameScene, true, launch);

  const getScene = (): GameScene | null => {
    const scene = game.scene.getScene('GameScene') as GameScene | null;
    return scene && scene.model ? scene : null;
  };

  return {
    get scene() {
      return getScene();
    },
    getFps() {
      return game.loop.actualFps;
    },
    pause() {
      getScene()?.pauseRun();
    },
    resume() {
      getScene()?.resumeRun();
    },
    chooseOffer(index: number) {
      getScene()?.chooseOffer(index);
    },
    reroll() {
      return getScene()?.rerollOffers() ?? null;
    },
    special() {
      getScene()?.useSpecial();
    },
    abandon() {
      getScene()?.abandon();
    },
    destroy() {
      try {
        game.destroy(true);
      } catch {
        // The canvas may already be gone when the app changes screens.
      }
      while (parent.firstChild) parent.removeChild(parent.firstChild);
      parent.style.removeProperty('background');
    },
  };
}
