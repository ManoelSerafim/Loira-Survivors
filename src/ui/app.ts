import type {
  AchievementContext,
  CharacterId,
  DifficultyId,
  HudSnapshot,
  OfferCard,
  RegionId,
  RunConfig,
  RunSnapshot,
  RunSummary,
  SaveData,
  WeaponId,
} from '../core/types';
import { Rng } from '../core/rng';
import { clamp, formatNumber } from '../core/format';
import { audio } from '../audio/audio';
import { loadSave, resetSave, safeStorage, writeSave } from '../storage/save';
import { AchievementService, type UnlockedAchievement } from '../systems/achievements';
import {
  buyMetaUpgrade,
  normalizeLoadout,
  toggleLoadoutWeapon,
  unlockCharacter,
} from '../systems/metaShop';
import {
  commitRun,
  finalizeSummary,
  isDifficultyUnlocked,
  nextRegionSuggestion,
  registerRunStart,
} from '../systems/progression';
import { createGame, type GameController } from '../game/createGame';
import { REGIONS } from '../data/regions';
import { ENDING_MAP } from '../data/endings';
import { LOIRA_MAP } from '../data/loiras';
import { ACHIEVEMENT_CATEGORIES } from '../data/achievements';
import { GameHud } from './hud';
import { renderMenu } from './views/menu';
import { renderCharacterSelect, renderJourney } from './views/setup';
import { renderShop, renderTree } from './views/progression';
import { renderAchievements } from './views/achievements';
import { renderStats } from './views/stats';
import { renderAlbum } from './views/album';
import { renderArsenal } from './views/arsenal';
import { renderSettings } from './views/settings';
import { renderResults, type RunResultView } from './views/results';
import type { AchievementFilter, ScreenId, Selection } from './state';
import { esc } from './components';

type ToastTone = 'good' | 'bad' | 'info' | 'gold';

interface ToastOptions {
  title?: string;
  emoji?: string;
  achievement?: boolean;
}

const SCREEN_IDS: ScreenId[] = [
  'menu',
  'character',
  'journey',
  'game',
  'results',
  'shop',
  'tree',
  'achievements',
  'stats',
  'album',
  'arsenal',
  'settings',
];

function isScreenId(value: string | undefined): value is ScreenId {
  return !!value && SCREEN_IDS.includes(value as ScreenId);
}

export class App {
  private readonly root: HTMLElement;
  private readonly gameContainer: HTMLElement;
  private screenRoot!: HTMLElement;
  private toastRoot!: HTMLElement;
  private modalRoot!: HTMLElement;

  private save: SaveData;
  private achievements!: AchievementService;
  private selection: Selection;
  private screen: ScreenId = 'menu';
  private history: ScreenId[] = [];
  private achievementFilter: AchievementFilter = 'all';
  private controller: GameController | null = null;
  private hud: GameHud | null = null;
  private lastHud: HudSnapshot | null = null;
  private activeConfig: RunConfig | null = null;
  private lastRun: RunResultView | null = null;
  private runAchievements: UnlockedAchievement[] = [];
  private levelOffers: OfferCard[] = [];
  private levelUpOpen = false;
  private rerollUsedThisLevel = false;
  private rerollInFlight = false;
  private runFinalized = true;
  private lastBossName = '';
  private fpsTimer: number | null = null;
  private persistTimer: number | null = null;
  private toastSequence = 0;
  private toastTimers = new Map<number, number>();
  private modalConfirm: (() => void) | null = null;
  private storageWarned = false;
  private bootMessage = '';
  private bootMessageTone: ToastTone = 'info';
  private bound = false;

  constructor(root: HTMLElement, gameContainer: HTMLElement) {
    this.root = root;
    this.gameContainer = gameContainer;
    const loaded = loadSave(safeStorage());
    this.save = loaded.save;
    this.bootMessage = loaded.message;
    if (loaded.corrupt) this.bootMessageTone = 'bad';
    this.selection = this.defaultSelection();
    this.achievements = new AchievementService(
      this.save,
      (unlocked) => this.announceAchievement(unlocked),
      () => this.persist(),
    );
    this.achievements.setSave(this.save);
  }

  boot(): void {
    if (this.bound) return;
    this.bound = true;
    this.buildScaffold();
    this.bindEvents();
    this.normalizeSelection();
    this.audioSync();
    this.checkAchievements();
    this.render();
    if (this.bootMessage) this.toast(this.bootMessage, this.bootMessageTone, { title: 'Aviso do save' });
    audio.setMusic('menu');
    this.persist();
  }

  private buildScaffold(): void {
    this.root.innerHTML = `<div id="screen-root"></div><div id="toast-root" class="toast-root" aria-live="polite" aria-atomic="false"></div><div id="modal-root" class="modal-root"></div>`;
    this.screenRoot = this.query<HTMLElement>('#screen-root');
    this.toastRoot = this.query<HTMLElement>('#toast-root');
    this.modalRoot = this.query<HTMLElement>('#modal-root');
    this.root.dataset.screen = this.screen;
  }

  private query<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`App root missing ${selector}`);
    return element;
  }

  private bindEvents(): void {
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('input', this.handleSettingInput);
    window.addEventListener('keydown', this.handleKeydown);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    document.addEventListener(
      'pointerdown',
      () => {
        this.audioSync();
        audio.ensure();
      },
      { once: true },
    );
  }

  private defaultSelection(): Selection {
    const characterId = (this.save.unlockedCharacters[0] ?? 'heroi') as CharacterId;
    const regionId = nextRegionSuggestion(this.save);
    const loadout = normalizeLoadout(this.save.settings.loadout, this.save);
    return { characterId, regionId, difficulty: 'normal', loadout };
  }

  private normalizeSelection(): void {
    if (!this.save.unlockedCharacters.includes(this.selection.characterId)) {
      this.selection.characterId = (this.save.unlockedCharacters[0] ?? 'heroi') as CharacterId;
    }
    if (!this.save.unlockedRegions.includes(this.selection.regionId)) {
      this.selection.regionId = nextRegionSuggestion(this.save);
    }
    if (!isDifficultyUnlocked(this.save, this.selection.difficulty)) {
      this.selection.difficulty = 'normal';
    }
    const normalized = normalizeLoadout(this.save.settings.loadout, this.save);
    if (normalized.join('|') !== this.save.settings.loadout.join('|')) {
      this.save.settings.loadout = normalized;
      this.persistSoon();
    }
    this.selection.loadout = normalized;
  }

  private audioSync(): void {
    audio.updateSettings(this.save.settings);
    if (audio.isReady && this.screen !== 'game') audio.setMusic('menu');
  }

  private handleBeforeUnload = (): void => {
    this.persist();
  };

  private handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const actionEl = target?.closest<HTMLElement>('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action ?? '';
    const shouldClick = !['special', 'choose-offer'].includes(action);
    this.audioSync();
    audio.ensure();
    if (shouldClick) audio.play('click');
    switch (action) {
      case 'goto': {
        const screen = actionEl.dataset.screen;
        if (isScreenId(screen)) this.goto(screen);
        break;
      }
      case 'back':
        this.back();
        break;
      case 'route-select': {
        const region = actionEl.dataset.region as RegionId | undefined;
        if (region && this.save.unlockedRegions.includes(region)) {
          this.selection.regionId = region;
          if (this.screen === 'journey') this.renderSafeToScroll();
          else this.goto('journey');
        }
        break;
      }
      case 'select-character': {
        const id = actionEl.dataset.id as CharacterId | undefined;
        if (id && this.save.unlockedCharacters.includes(id)) {
          this.selection.characterId = id;
          this.renderSafeToScroll();
        }
        break;
      }
      case 'unlock-character': {
        const id = actionEl.dataset.id as CharacterId | undefined;
        if (!id) break;
        const result = unlockCharacter(this.save, id);
        this.toast(result.message, result.ok ? 'good' : 'bad');
        if (result.ok) {
          this.selection.characterId = id;
          this.checkAchievements();
          this.persist();
          this.renderSafeToScroll();
        }
        break;
      }
      case 'select-region': {
        const id = actionEl.dataset.id as RegionId | undefined;
        if (id && this.save.unlockedRegions.includes(id)) {
          this.selection.regionId = id;
          this.renderSafeToScroll();
        }
        break;
      }
      case 'select-difficulty': {
        const id = actionEl.dataset.id as DifficultyId | undefined;
        if (id && isDifficultyUnlocked(this.save, id)) {
          this.selection.difficulty = id;
          this.renderSafeToScroll();
        }
        break;
      }
      case 'toggle-loadout': {
        const id = actionEl.dataset.id as WeaponId | undefined;
        if (!id) break;
        const result = toggleLoadoutWeapon(this.save, id);
        this.selection.loadout = [...result.loadout];
        this.toast(result.message, result.loadout.includes(id) ? 'good' : 'info');
        this.persist();
        this.renderSafeToScroll();
        break;
      }
      case 'start-run':
        this.startRun();
        break;
      case 'buy-meta': {
        const id = actionEl.dataset.id;
        if (!id) break;
        const result = buyMetaUpgrade(this.save, id);
        this.toast(result.message, result.ok ? 'good' : 'bad');
        if (result.ok) {
          this.checkAchievements();
          this.persist();
        }
        this.renderSafeToScroll();
        break;
      }
      case 'filter-achievements': {
        const filter = actionEl.dataset.filter;
        if (filter === 'all' || ACHIEVEMENT_CATEGORIES.some((category) => category.id === filter)) {
          this.achievementFilter = filter as AchievementFilter;
          this.renderSafeToScroll();
        }
        break;
      }
      case 'toggle-mute':
        this.toggleMute();
        break;
      case 'toggle-setting': {
        const key = actionEl.dataset.setting;
        if (key) this.toggleSetting(key);
        break;
      }
      case 'set-setting': {
        const key = actionEl.dataset.setting;
        const value = actionEl.dataset.value;
        if (key && value) this.setSetting(key, value);
        break;
      }
      case 'test-sound':
        audio.ensure();
        audio.updateSettings(this.save.settings);
        audio.play('achievement');
        this.toast('Som de teste tocando. Se estiver silencioso, confira o volume do sistema.', 'info');
        break;
      case 'request-reset':
        this.openResetModal();
        break;
      case 'request-abandon':
        this.openAbandonModal();
        break;
      case 'modal-confirm':
        this.confirmModal();
        break;
      case 'modal-cancel':
        this.closeModal();
        break;
      case 'pause':
        this.controller?.pause();
        break;
      case 'resume':
        this.controller?.resume();
        break;
      case 'special':
        this.controller?.special();
        break;
      case 'close-event':
        this.hud?.hideEvent();
        break;
      case 'dismiss-toast': {
        const id = Number(actionEl.dataset.id);
        if (Number.isFinite(id)) this.dismissToast(id);
        break;
      }
      case 'choose-offer': {
        const index = Number(actionEl.dataset.index);
        if (Number.isFinite(index)) this.chooseOffer(index);
        break;
      }
      case 'reroll-offers':
        this.rerollOffers();
        break;
      case 'retry-run':
        if (this.lastRun) this.startRun(this.lastRun.summary.config);
        break;
      case 'continue-route': {
        const region = actionEl.dataset.region as RegionId | undefined;
        if (region && this.save.unlockedRegions.includes(region)) {
          this.selection.regionId = region;
          if (!isDifficultyUnlocked(this.save, this.selection.difficulty)) this.selection.difficulty = 'normal';
          this.screen = 'journey';
          this.history = [];
          this.render();
          this.audioSync();
        }
        break;
      }
      case 'show-help':
        this.openHelpModal();
        break;
      default:
        break;
    }
  };

  private handleSettingInput = (event: Event): void => {
    const input = (event.target as HTMLElement | null)?.closest<HTMLInputElement>('input[data-setting]');
    if (!input || input.type !== 'range') return;
    const key = input.dataset.setting;
    if (key !== 'masterVolume' && key !== 'musicVolume' && key !== 'sfxVolume') return;
    this.save.settings[key] = clamp(Number(input.value) / 100, 0, 1);
    const output = this.root.querySelector<HTMLElement>(`[data-volume-label="${key}"]`);
    if (output) output.textContent = `${Math.round(this.save.settings[key] * 100)}%`;
    audio.ensure();
    audio.updateSettings(this.save.settings);
    this.persistSoon();
  };

  private handleKeydown = (event: KeyboardEvent): void => {
    if (this.modalConfirm) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeModal();
      }
      return;
    }
    if (this.screen === 'game') {
      if (!this.levelUpOpen) return;
      if (event.repeat) return;
      if (event.key === '1' || event.key === '2' || event.key === '3') {
        event.preventDefault();
        this.chooseOffer(Number(event.key) - 1);
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        this.rerollOffers();
      }
      return;
    }
    if (event.key === 'Escape' && this.screen !== 'menu') {
      event.preventDefault();
      this.back();
    }
  };

  private render(): void {
    if (this.screen === 'game') return;
    this.root.dataset.screen = this.screen;
    document.body.classList.remove('in-game');
    this.screenRoot.innerHTML = this.renderView();
    this.screenRoot.scrollTop = 0;
    requestAnimationFrame(() => {
      const screen = this.screenRoot.firstElementChild;
      if (screen instanceof HTMLElement) screen.classList.add('is-visible');
    });
  }

  private renderSafeToScroll(): void {
    const previousScroll = this.screenRoot.scrollTop;
    this.render();
    this.screenRoot.scrollTop = previousScroll;
  }

  private renderView(): string {
    switch (this.screen) {
      case 'menu':
        return renderMenu(this.save, this.selection);
      case 'character':
        return renderCharacterSelect(this.save, this.selection);
      case 'journey':
        return renderJourney(this.save, this.selection);
      case 'shop':
        return renderShop(this.save);
      case 'tree':
        return renderTree(this.save);
      case 'achievements':
        return renderAchievements(this.save, this.achievementFilter);
      case 'stats':
        return renderStats(this.save);
      case 'album':
        return renderAlbum(this.save);
      case 'arsenal':
        return renderArsenal(this.save);
      case 'settings':
        return renderSettings(this.save);
      case 'results':
        return this.lastRun ? renderResults(this.lastRun, this.save) : renderMenu(this.save, this.selection);
      default:
        return renderMenu(this.save, this.selection);
    }
  }

  private goto(screen: ScreenId): void {
    if (screen === 'game' || this.controller) return;
    if (screen === this.screen) return;
    if (screen === 'results' && !this.lastRun) screen = 'menu';
    if (this.screen === 'results' || screen === 'menu') this.history = [];
    else this.history.push(this.screen);
    if (this.history.length > 25) this.history = this.history.slice(-25);
    this.screen = screen;
    this.normalizeSelection();
    this.checkAchievements();
    this.render();
    this.audioSync();
  }

  private back(): void {
    if (this.controller) return;
    let previous = this.history.pop() ?? 'menu';
    if (previous === 'game' || previous === this.screen) previous = 'menu';
    this.screen = previous;
    this.normalizeSelection();
    this.checkAchievements();
    this.render();
    this.audioSync();
  }

  private startRun(override?: RunConfig): void {
    if (this.controller) return;
    const source = override ?? {
      regionId: this.selection.regionId,
      difficulty: this.selection.difficulty,
      characterId: this.selection.characterId,
      loadout: this.save.settings.loadout,
    };
    if (!this.save.unlockedRegions.includes(source.regionId)) {
      this.toast('Essa região ainda está bloqueada. Conclua a etapa anterior.', 'bad');
      return;
    }
    if (!isDifficultyUnlocked(this.save, source.difficulty)) {
      this.toast('Essa dificuldade ainda está bloqueada.', 'bad');
      return;
    }
    if (!this.save.unlockedCharacters.includes(source.characterId)) {
      this.toast('Esse personagem ainda está bloqueado.', 'bad');
      return;
    }
    const loadout = normalizeLoadout(source.loadout, this.save);
    if (!loadout.length) {
      this.toast('Selecione pelo menos uma arma no arsenal.', 'bad');
      return;
    }
    const config: RunConfig = {
      regionId: source.regionId,
      difficulty: source.difficulty,
      characterId: source.characterId,
      loadout,
    };
    this.selection = {
      characterId: config.characterId,
      regionId: config.regionId,
      difficulty: config.difficulty,
      loadout,
    };
    this.closeModal();
    this.hud?.hideEvent();
    this.activeConfig = config;
    this.lastHud = null;
    this.levelOffers = [];
    this.levelUpOpen = false;
    this.rerollUsedThisLevel = false;
    this.runAchievements = [];
    this.runFinalized = false;
    this.lastBossName = '';
    this.screen = 'game';
    this.root.dataset.screen = 'game';
    document.body.classList.add('in-game');
    registerRunStart(this.save, config.regionId);
    this.persist();
    this.gameContainer.classList.remove('is-hidden');
    this.screenRoot.innerHTML = '';
    this.hud = new GameHud(this.screenRoot, config, this.save.settings);
    audio.updateSettings(this.save.settings);
    audio.ensure();
    try {
      this.controller = createGame(
        {
          config,
          save: this.save,
          seed: Date.now(),
          onHud: (snapshot) => {
            this.lastHud = snapshot;
            this.hud?.update(snapshot);
          },
          onLevelUp: (offers) => {
            if (this.runFinalized) return;
            this.levelOffers = offers;
            if (!this.rerollInFlight) this.rerollUsedThisLevel = false;
            this.levelUpOpen = true;
            this.hud?.showLevelUp(
              offers,
              this.lastHud?.level ?? 1,
              this.lastHud?.coins ?? 0,
              !this.rerollUsedThisLevel,
            );
          },
          onEvent: (event, detail, tone) => {
            this.hud?.showEvent(event, detail, tone);
          },
          onChallenge: () => {
            // The HUD reads the active challenge from the next snapshot.
          },
          onToast: (message, tone) => {
            this.toast(message, this.normalizeTone(tone ?? 'info'));
          },
          onEnd: (summary) => this.finishRun(summary),
          onBoss: (boss) => {
            if (!boss) {
              this.lastBossName = '';
              return;
            }
            if (boss.name !== this.lastBossName) {
              this.lastBossName = boss.name;
              this.hud?.announceBoss(boss.name);
            }
          },
          onPaused: (paused) => {
            this.hud?.setPaused(paused);
          },
          onAchievementsDirty: (snapshot) => {
            this.checkAchievements(snapshot);
          },
        },
        this.gameContainer,
      );
    } catch {
      this.hud?.destroy();
      this.hud = null;
      this.activeConfig = null;
      this.runFinalized = true;
      this.gameContainer.classList.add('is-hidden');
      this.screen = 'menu';
      this.root.dataset.screen = 'menu';
      document.body.classList.remove('in-game');
      this.toast('Não foi possível iniciar o jogo neste navegador. Tente recarregar a página.', 'bad');
      this.render();
      this.audioSync();
      return;
    }
    this.startFpsLoop();
  }

  private chooseOffer(index: number): void {
    if (!this.levelUpOpen || !this.controller) return;
    if (!this.levelOffers[index]) return;
    this.levelUpOpen = false;
    this.levelOffers = [];
    this.hud?.hideLevelUp();
    this.controller.chooseOffer(index);
  }

  private rerollOffers(): void {
    if (!this.levelUpOpen || !this.controller) return;
    if (this.rerollUsedThisLevel) {
      this.toast('Você já rerrolou as opções deste nível.', 'bad');
      return;
    }
    this.rerollInFlight = true;
    this.rerollUsedThisLevel = true;
    const offers = this.controller.reroll();
    this.rerollInFlight = false;
    if (!offers) {
      this.rerollUsedThisLevel = false;
      this.hud?.setRerollAllowed(true);
    }
  }

  private finishRun(summary: RunSummary): void {
    if (this.runFinalized) return;
    this.runFinalized = true;
    this.levelUpOpen = false;
    this.levelOffers = [];
    this.closeModal();
    const previousRegions = new Set(this.save.unlockedRegions);
    const previousWeapons = new Set(this.save.unlockedWeapons);
    finalizeSummary(summary, this.save);
    const rewards = commitRun(this.save, summary, new Rng(Date.now()));
    const runSnapshot: RunSnapshot = {
      regionId: summary.config.regionId,
      difficulty: summary.config.difficulty,
      victory: summary.victory,
      kills: summary.kills,
      level: summary.level,
      coins: summary.coins,
      bossKills: summary.bossKills,
      hpRatio: summary.hpRatio,
      noHit: summary.noHit,
      challenges: summary.challengesCompleted,
      ended: true,
      bossDefeated: summary.bossDefeated,
      score: summary.score,
      maxWeaponLevel: summary.maxWeaponLevel,
    };
    this.checkAchievements(runSnapshot);
    this.persist();
    const newRegions = this.save.unlockedRegions.filter((id) => !previousRegions.has(id));
    const newWeapons = this.save.unlockedWeapons.filter((id) => !previousWeapons.has(id));
    const ending = summary.endingId ? ENDING_MAP[summary.endingId] ?? null : null;
    const loira = summary.loiraId ? LOIRA_MAP[summary.loiraId] ?? null : null;
    this.lastRun = {
      summary,
      rewards,
      achievements: [...this.runAchievements],
      newRegions,
      newWeapons,
      ending,
      loira,
      permanentCoins: this.save.permanentCoins,
    };
    this.stopFpsLoop();
    this.hud?.destroy();
    this.hud = null;
    this.lastHud = null;
    this.activeConfig = null;
    const controller = this.controller;
    this.controller = null;
    this.gameContainer.classList.add('is-hidden');
    window.setTimeout(() => {
      controller?.destroy();
    }, 80);
    this.screen = 'results';
    this.history = [];
    document.body.classList.remove('in-game');
    this.root.dataset.screen = 'results';
    this.audioSync();
    this.render();
  }

  private checkAchievements(run?: RunSnapshot): UnlockedAchievement[] {
    const context: Partial<AchievementContext> = run ? { run } : {};
    const unlocked = this.achievements.check(context);
    if (unlocked.length) {
      if (this.activeConfig) {
        for (const entry of unlocked) {
          if (!this.runAchievements.some((existing) => existing.def.id === entry.def.id)) {
            this.runAchievements.push(entry);
          }
        }
      }
      this.persist();
    }
    return unlocked;
  }

  private announceAchievement(unlocked: UnlockedAchievement): void {
    this.toast(`${unlocked.def.name} · ${unlocked.def.description}`, 'gold', {
      title: 'Conquista desbloqueada',
      emoji: unlocked.def.emoji,
      achievement: true,
    });
  }

  private toast(message: string, tone: ToastTone = 'info', options: ToastOptions = {}): void {
    if (!this.toastRoot) return;
    const id = ++this.toastSequence;
    const iconMap: Record<ToastTone, string> = { good: '✓', bad: '!', info: 'i', gold: '★' };
    const emoji = options.emoji ?? iconMap[tone];
    const toast = document.createElement('div');
    toast.className = `toast toast-${tone} ${options.achievement ? 'toast-achievement' : ''}`;
    toast.dataset.toastId = String(id);
    toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${esc(emoji)}</span><span class="toast-copy">${options.title ? `<strong>${esc(options.title)}</strong>` : ''}<span>${esc(message)}</span></span><button class="toast-close" data-action="dismiss-toast" data-id="${id}" aria-label="Fechar aviso">×</button><span class="toast-progress" aria-hidden="true"></span>`;
    this.toastRoot.append(toast);
    while (this.toastRoot.children.length > 4) {
      const first = this.toastRoot.firstElementChild as HTMLElement | null;
      if (!first) break;
      const firstId = Number(first.dataset.toastId);
      if (Number.isFinite(firstId)) {
        const timer = this.toastTimers.get(firstId);
        if (timer !== undefined) {
          window.clearTimeout(timer);
          this.toastTimers.delete(firstId);
        }
      }
      first.remove();
    }
    const timer = window.setTimeout(() => this.dismissToast(id), options.achievement ? 6800 : 4600);
    this.toastTimers.set(id, timer);
  }

  private dismissToast(id: number): void {
    const timer = this.toastTimers.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      this.toastTimers.delete(id);
    }
    const element = this.toastRoot?.querySelector<HTMLElement>(`[data-toast-id="${id}"]`);
    if (!element) return;
    element.classList.add('is-leaving');
    window.setTimeout(() => element.remove(), 220);
  }

  private toggleMute(): void {
    this.save.settings.muted = !this.save.settings.muted;
    this.audioSync();
    audio.ensure();
    this.persist();
    if (this.screen === 'game') {
      this.hud?.updateSettings(this.save.settings);
      this.hud?.refreshPause();
    } else {
      this.renderSafeToScroll();
    }
  }

  private toggleSetting(key: string): void {
    if (key === 'screenShake' || key === 'damageNumbers' || key === 'showFps') {
      this.save.settings[key] = !this.save.settings[key];
      this.audioSync();
      this.persist();
      if (this.screen === 'game') this.hud?.updateSettings(this.save.settings);
      else this.renderSafeToScroll();
    }
  }

  private setSetting(key: string, value: string): void {
    if (key === 'quality' && (value === 'alta' || value === 'media' || value === 'baixa')) {
      this.save.settings.quality = value;
    } else if (key === 'joystickSide' && (value === 'esquerda' || value === 'direita')) {
      this.save.settings.joystickSide = value;
      if (this.screen === 'game') this.hud?.setJoystickSide(value);
    } else {
      return;
    }
    this.persist();
    if (this.screen !== 'game') this.renderSafeToScroll();
  }

  private openResetModal(): void {
    this.openModal({
      title: 'Reiniciar todo o progresso?',
      eyebrow: 'zona de perigo',
      tone: 'danger',
      body: `<p>Isso apaga <strong>moedas permanentes, upgrades, conquistas, álbum, estatísticas e configurações</strong> salvas neste navegador.</p><p>Não existe botão de desfazer. Se quiser recomeçar sem perder a coleção, basta continuar jogando ou criar um novo save em outro navegador.</p>`,
      confirmLabel: 'Sim, apagar tudo',
      cancelLabel: 'Cancelar',
      onConfirm: () => this.resetProgress(),
    });
  }

  private openAbandonModal(): void {
    this.openModal({
      title: 'Abandonar a jornada?',
      eyebrow: 'a run termina aqui',
      tone: 'danger',
      body: `<p>Ao abandonar, a run é encerrada como derrota. Você mantém as moedas já convertidas e as conquistas desbloqueadas durante a partida.</p><p>O resultado e as recompensas de derrota serão mostrados em seguida.</p>`,
      confirmLabel: 'Abandonar run',
      cancelLabel: 'Continuar jogando',
      onConfirm: () => {
        this.closeModal();
        this.controller?.abandon();
      },
    });
  }

  private openHelpModal(): void {
    this.openModal({
      title: 'Como sobreviver até Portugal',
      eyebrow: 'manual de bolso',
      tone: 'info',
      body: `<div class="help-modal-grid">
        <div><h4>Movimento</h4><p>Use <kbd>WASD</kbd> ou as setas. No celular, arraste o joystick virtual. Os ataques são automáticos.</p></div>
        <div><h4>Especial</h4><p><kbd>ESPAÇO</kbd> ou o botão ⚡ faz um dash com dano em área. Use para escapar de cercos e atravessar hordas.</p></div>
        <div><h4>Subida de nível</h4><p>Colete XP e escolha entre três melhorias. Rerrolar custa moedas temporárias — uma vez por nível.</p></div>
        <div><h4>Chefes</h4><p>O chefe aparece perto do fim da etapa. Se o tempo acabar antes de derrotá-lo, a luta continua em overtime.</p></div>
        <div><h4>Progresso</h4><p>Mesmo derrotas convertem parte das moedas em permanentes. Use a loja e a árvore para voltar mais forte.</p></div>
        <div><h4>Portugal</h4><p>O final depende do score, dificuldade, vida, moedas e desafios concluídos. Diferentes desempenhos revelam diferentes finais e loiras.</p></div>
      </div>`,
      confirmLabel: 'Entendi',
      cancelLabel: '',
      onConfirm: () => undefined,
    });
  }

  private openModal(options: {
    title: string;
    eyebrow: string;
    body: string;
    tone: 'danger' | 'info';
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  }): void {
    this.closeModal();
    this.modalConfirm = options.onConfirm;
    this.modalRoot.innerHTML = `<div class="modal-backdrop"></div>
      <section class="modal-card modal-${options.tone}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal-head"><span class="eyebrow">${esc(options.eyebrow)}</span><h2 id="modal-title">${esc(options.title)}</h2><button class="icon-btn modal-x" data-action="modal-cancel" aria-label="Fechar">×</button></header>
        <div class="modal-body">${options.body}</div>
        <footer class="modal-actions">
          ${options.cancelLabel ? `<button class="btn btn-ghost" data-action="modal-cancel">${esc(options.cancelLabel)}</button>` : ''}
          <button class="btn ${options.tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-action="modal-confirm">${esc(options.confirmLabel)}</button>
        </footer>
      </section>`;
    this.modalRoot.classList.add('is-open');
    window.setTimeout(() => {
      this.modalRoot.querySelector<HTMLButtonElement>('[data-action="modal-confirm"]')?.focus();
    }, 30);
  }

  private confirmModal(): void {
    const callback = this.modalConfirm;
    this.closeModal();
    callback?.();
  }

  private closeModal(): void {
    this.modalConfirm = null;
    this.modalRoot.classList.remove('is-open');
    this.modalRoot.innerHTML = '';
  }

  private resetProgress(): void {
    this.save = resetSave(safeStorage());
    this.achievements.setSave(this.save);
    this.selection = this.defaultSelection();
    this.achievementFilter = 'all';
    this.lastRun = null;
    this.history = [];
    this.screen = 'menu';
    this.bootMessage = '';
    this.audioSync();
    audio.setMusic('menu');
    this.persist();
    this.render();
    this.toast('Progresso reiniciado. A jornada começa de novo — com o mesmo chinelo.', 'info', {
      title: 'Novo começo',
    });
  }

  private startFpsLoop(): void {
    this.stopFpsLoop();
    this.fpsTimer = window.setInterval(() => {
      const scene = this.controller?.scene;
      if (scene) this.hud?.setFps(scene.game.loop.actualFps);
    }, 500);
  }

  private stopFpsLoop(): void {
    if (this.fpsTimer !== null) {
      window.clearInterval(this.fpsTimer);
      this.fpsTimer = null;
    }
  }

  private persistSoon(): void {
    if (this.persistTimer !== null) window.clearTimeout(this.persistTimer);
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      this.persist();
    }, 220);
  }

  private persist(): void {
    const ok = writeSave(this.save, safeStorage());
    if (!ok && !this.storageWarned) {
      this.storageWarned = true;
      this.toast('Não foi possível salvar neste navegador. Verifique o armazenamento local.', 'bad', {
        title: 'Save indisponível',
      });
    }
  }

  private normalizeTone(tone: string): ToastTone {
    if (tone === 'good' || tone === 'bad' || tone === 'info' || tone === 'gold') return tone;
    return 'info';
  }
}
