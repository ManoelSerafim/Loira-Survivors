import type {
  BuffInfo,
  GameEventDef,
  HudSnapshot,
  OfferCard,
  RunConfig,
  SaveSettings,
  WeaponRuntimeInfo,
} from '../core/types';
import { formatNumber, formatTime } from '../core/format';
import { clamp } from '../core/format';
import { getCharacter } from '../data/characters';
import { getRegion } from '../data/regions';
import { getWeapon } from '../data/weapons';
import { RARITY_INFO } from '../data/upgrades';
import { BOSSES } from '../data/enemies';
import { REROLL_COST } from '../game/constants';
import { setVirtualInput } from '../game/input';
import { esc, spriteImg } from './components';
import { rarityLabel } from './views/shared';

interface HudRefs {
  shell: HTMLElement;
  level: HTMLElement;
  hpFill: HTMLElement;
  hpText: HTMLElement;
  hpShell: HTMLElement;
  revives: HTMLElement;
  timer: HTMLElement;
  timeFill: HTMLElement;
  xpFill: HTMLElement;
  xpText: HTMLElement;
  coins: HTMLElement;
  kills: HTMLElement;
  weapons: HTMLElement;
  buffs: HTMLElement;
  special: HTMLButtonElement;
  specialFill: HTMLElement;
  specialLabel: HTMLElement;
  boss: HTMLElement;
  bossName: HTMLElement;
  bossFill: HTMLElement;
  bossPhase: HTMLElement;
  challenge: HTMLElement;
  challengeText: HTMLElement;
  fps: HTMLElement;
  eventLayer: HTMLElement;
  bossBanner: HTMLElement;
  levelUpOverlay: HTMLElement;
  pauseOverlay: HTMLElement;
  joystick: HTMLElement;
  joystickKnob: HTMLElement;
  soundButtons: NodeListOf<HTMLButtonElement>;
}

export class GameHud {
  private readonly root: HTMLElement;
  private readonly config: RunConfig;
  private settings: SaveSettings;
  private refs: HudRefs;
  private snapshot: HudSnapshot | null = null;
  private buffSignature = '';
  private weaponSignature = '';
  private weaponCooldownNodes = new Map<string, HTMLElement>();
  private timers = new Set<number>();
  private eventTimer: number | null = null;
  private bossBannerTimer: number | null = null;
  private joystickCleanup: (() => void) | null = null;
  private rerollAllowed = true;

  constructor(parent: HTMLElement, config: RunConfig, settings: SaveSettings) {
    this.root = parent;
    this.config = config;
    this.settings = settings;
    const character = getCharacter(config.characterId);
    const region = getRegion(config.regionId);
    const difficulty = this.difficultyLabel(config.difficulty);
    parent.innerHTML = `<div class="game-shell" data-difficulty="${config.difficulty}" data-joystick-side="${settings.joystickSide}">
      <div class="hud-grain" aria-hidden="true"></div>
      <header class="hud-top">
        <div class="hud-left">
          <button class="hud-icon-btn" data-action="pause" aria-label="Pausar" title="Pausar (ESC)">Ⅱ</button>
          <div class="hud-avatar" style="--char-color:${character.color}">${spriteImg(character.portrait, character.name, 'hud-avatar-img', '🧑')}</div>
          <div class="hud-vitals">
            <div class="hud-vitals-head"><span class="hud-level">NV <strong data-hud-level>1</strong></span><span class="hud-char-name">${esc(character.name)}</span></div>
            <div class="hud-hp" data-hud-hp>
              <div class="hud-bar hud-bar-hp"><span class="hud-bar-fill" data-hud-hp-fill></span><span class="hud-bar-gloss" aria-hidden="true"></span></div>
              <span class="hud-hp-text" data-hud-hp-text>100 / 100</span>
            </div>
            <span class="hud-revives" data-hud-revives></span>
          </div>
        </div>
        <div class="hud-center">
          <span class="hud-region-chip"><img src="./${esc(region.art)}" alt="" draggable="false"><span>${esc(region.name)}<small>${esc(difficulty)}</small></span></span>
          <div class="hud-timer" data-hud-timer>00:00</div>
          <div class="hud-timebar"><span data-hud-time-fill></span></div>
        </div>
        <div class="hud-right">
          <span class="hud-counter hud-coins" title="Moedas temporárias"><span aria-hidden="true">🪙</span><strong data-hud-coins>0</strong></span>
          <span class="hud-counter" title="Inimigos derrotados"><span aria-hidden="true">☠</span><strong data-hud-kills>0</strong></span>
          <button class="hud-icon-btn hud-sound" data-action="toggle-mute" aria-label="${settings.muted ? 'Ativar som' : 'Silenciar'}">${settings.muted ? '🔇' : '🔊'}</button>
        </div>
      </header>

      <div class="hud-xp-row" aria-label="Experiência">
        <span class="hud-xp-label">XP</span>
        <div class="hud-bar hud-bar-xp"><span data-hud-xp-fill></span></div>
        <span class="hud-xp-text" data-hud-xp-text>0 / 10</span>
      </div>

      <div class="hud-boss" data-hud-boss hidden>
        <div class="hud-boss-head"><span class="hud-boss-title">CHEFE</span><strong data-hud-boss-name></strong><span class="hud-boss-phase" data-hud-boss-phase>FASE 1</span></div>
        <div class="hud-bar hud-bar-boss"><span data-hud-boss-fill></span></div>
      </div>

      <div class="hud-challenge" data-hud-challenge hidden>
        <span class="challenge-icon" aria-hidden="true">🎯</span>
        <span data-hud-challenge-text></span>
      </div>

      <div class="hud-bottom">
        <div class="hud-loadout">
          <span class="hud-bottom-title">ARMAS</span>
          <div class="hud-weapons" data-hud-weapons aria-label="Armas equipadas"></div>
          <div class="hud-buffs" data-hud-buffs></div>
        </div>
        <div class="hud-controls">
          <div class="joystick" data-hud-joystick aria-label="Joystick de movimento">
            <div class="joystick-base"><span class="joystick-ring" aria-hidden="true"></span><span class="joystick-knob" data-hud-joystick-knob></span></div>
            <span class="joystick-hint">mover</span>
          </div>
          <button class="special-btn" data-action="special" aria-label="Habilidade especial" title="Especial (ESPAÇO)">
            <span class="special-progress" data-hud-special-fill></span>
            <span class="special-inner"><span class="special-icon" aria-hidden="true">⚡</span><strong data-hud-special-label>PRONTO</strong><small>ESPECIAL</small></span>
          </button>
        </div>
      </div>

      <div class="hud-fps" data-hud-fps hidden>60 FPS</div>
      <div class="hud-event-layer" data-hud-event></div>
      <div class="hud-boss-banner" data-hud-boss-banner hidden></div>
      <div class="game-overlay levelup-overlay" data-overlay="levelup" hidden></div>
      <div class="game-overlay pause-overlay" data-overlay="pause" hidden></div>
    </div>`;

    this.refs = {
      shell: this.query('.game-shell'),
      level: this.query('[data-hud-level]'),
      hpFill: this.query('[data-hud-hp-fill]'),
      hpText: this.query('[data-hud-hp-text]'),
      hpShell: this.query('[data-hud-hp]'),
      revives: this.query('[data-hud-revives]'),
      timer: this.query('[data-hud-timer]'),
      timeFill: this.query('[data-hud-time-fill]'),
      xpFill: this.query('[data-hud-xp-fill]'),
      xpText: this.query('[data-hud-xp-text]'),
      coins: this.query('[data-hud-coins]'),
      kills: this.query('[data-hud-kills]'),
      weapons: this.query('[data-hud-weapons]'),
      buffs: this.query('[data-hud-buffs]'),
      special: this.query<HTMLButtonElement>('[data-action="special"]'),
      specialFill: this.query('[data-hud-special-fill]'),
      specialLabel: this.query('[data-hud-special-label]'),
      boss: this.query('[data-hud-boss]'),
      bossName: this.query('[data-hud-boss-name]'),
      bossFill: this.query('[data-hud-boss-fill]'),
      bossPhase: this.query('[data-hud-boss-phase]'),
      challenge: this.query('[data-hud-challenge]'),
      challengeText: this.query('[data-hud-challenge-text]'),
      fps: this.query('[data-hud-fps]'),
      eventLayer: this.query('[data-hud-event]'),
      bossBanner: this.query('[data-hud-boss-banner]'),
      levelUpOverlay: this.query('[data-overlay="levelup"]'),
      pauseOverlay: this.query('[data-overlay="pause"]'),
      joystick: this.query('[data-hud-joystick]'),
      joystickKnob: this.query('[data-hud-joystick-knob]'),
      soundButtons: this.root.querySelectorAll<HTMLButtonElement>('[data-action="toggle-mute"]'),
    };
    this.refs.fps.hidden = !settings.showFps;
    this.setupJoystick();
  }

  private query<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`HUD element not found: ${selector}`);
    return element;
  }

  update(snapshot: HudSnapshot): void {
    this.snapshot = snapshot;
    const hpRatio = snapshot.maxHp > 0 ? clamp(snapshot.hp / snapshot.maxHp, 0, 1) : 0;
    const xpRatio = snapshot.xpToNext > 0 ? clamp(snapshot.xp / snapshot.xpToNext, 0, 1) : 0;
    const timeRatio = snapshot.duration > 0 ? clamp(snapshot.elapsed / snapshot.duration, 0, 1) : 0;
    const overtime = snapshot.timeLeft <= 0;
    const specialRatio = snapshot.specialMax > 0 ? clamp(snapshot.specialCooldown / snapshot.specialMax, 0, 1) : 0;
    const ready = snapshot.specialCooldown <= 0.05;

    this.refs.level.textContent = String(snapshot.level);
    this.refs.hpFill.style.width = `${(hpRatio * 100).toFixed(2)}%`;
    this.refs.hpText.textContent = `${Math.ceil(snapshot.hp)} / ${Math.ceil(snapshot.maxHp)}`;
    this.refs.hpShell.classList.toggle('is-low', hpRatio < 0.28);
    this.refs.revives.textContent = snapshot.revivesLeft > 0 ? `🕊 ${snapshot.revivesLeft} segunda${snapshot.revivesLeft > 1 ? 's' : ''} chance${snapshot.revivesLeft > 1 ? 's' : ''}` : '';
    this.refs.timer.textContent = overtime ? `+${formatTime(Math.max(0, snapshot.elapsed - snapshot.duration))}` : formatTime(snapshot.timeLeft);
    this.refs.shell.classList.toggle('is-overtime', overtime);
    this.refs.timeFill.style.width = `${(timeRatio * 100).toFixed(2)}%`;
    this.refs.xpFill.style.width = `${(xpRatio * 100).toFixed(2)}%`;
    this.refs.xpText.textContent = `${formatNumber(snapshot.xp)} / ${formatNumber(snapshot.xpToNext)}`;
    this.refs.coins.textContent = formatNumber(snapshot.coins);
    this.refs.kills.textContent = formatNumber(snapshot.kills);
    this.updateWeapons(snapshot.weapons);
    this.updateBuffs(snapshot.buffs);
    this.updateBoss(snapshot);
    this.updateChallenge(snapshot);
    this.updateSpecial(snapshot, ready, specialRatio);

    if (!this.refs.levelUpOverlay.hidden) this.updateLevelUpEconomy(snapshot.coins);
  }

  private updateWeapons(weapons: WeaponRuntimeInfo[]): void {
    const signature = weapons.map((weapon) => `${weapon.id}:${weapon.level}:${weapon.evolved ? 1 : 0}`).join('|');
    if (signature !== this.weaponSignature) {
      this.weaponSignature = signature;
      this.weaponCooldownNodes.clear();
      this.refs.weapons.innerHTML = weapons
        .map((weapon) => {
          const def = getWeapon(weapon.id);
          return `<span class="hud-weapon ${weapon.evolved ? 'is-evolved' : ''}" style="--weapon-color:${def.color}" title="${esc(def.name)} · ${weapon.evolved ? 'Evoluída' : `Nível ${weapon.level}`}">
            <span class="hud-weapon-art">${spriteImg(def.icon, def.name, 'hud-weapon-img', '🗡️')}</span>
            <span class="hud-weapon-level">${weapon.evolved ? 'EVO' : weapon.level}</span>
            <span class="hud-weapon-cooldown" data-weapon-cooldown="${weapon.id}"></span>
          </span>`;
        })
        .join('');
      for (const weapon of weapons) {
        const node = this.refs.weapons.querySelector<HTMLElement>(`[data-weapon-cooldown="${weapon.id}"]`);
        if (node) this.weaponCooldownNodes.set(weapon.id, node);
      }
    }
    for (const weapon of weapons) {
      const node = this.weaponCooldownNodes.get(weapon.id);
      if (!node) continue;
      node.style.height = `${Math.round(clamp(weapon.cooldownRatio, 0, 1) * 100)}%`;
    }
  }

  private updateBuffs(buffs: BuffInfo[]): void {
    const signature = buffs.map((buff) => `${buff.id}:${buff.seconds}:${buff.tone}`).join('|');
    if (signature === this.buffSignature) return;
    this.buffSignature = signature;
    this.refs.buffs.innerHTML = buffs
      .map((buff) => `<span class="hud-buff is-${buff.tone}" title="${esc(buff.label)}"><span aria-hidden="true">${buff.emoji}</span>${esc(buff.label)}<strong>${buff.seconds}s</strong></span>`)
      .join('');
  }

  private updateBoss(snapshot: HudSnapshot): void {
    if (!snapshot.boss) {
      this.refs.boss.hidden = true;
      return;
    }
    this.refs.boss.hidden = false;
    this.refs.bossName.textContent = snapshot.boss.name;
    this.refs.bossPhase.textContent = snapshot.boss.phase >= 2 ? 'FASE 2' : 'FASE 1';
    const ratio = snapshot.boss.maxHp > 0 ? clamp(snapshot.boss.hp / snapshot.boss.maxHp, 0, 1) : 0;
    this.refs.bossFill.style.width = `${(ratio * 100).toFixed(2)}%`;
    this.refs.boss.classList.toggle('is-phase-2', snapshot.boss.phase >= 2);
  }

  private updateChallenge(snapshot: HudSnapshot): void {
    if (!snapshot.challenge) {
      this.refs.challenge.hidden = true;
      return;
    }
    this.refs.challenge.hidden = false;
    this.refs.challenge.classList.toggle('is-done', snapshot.challenge.done);
    this.refs.challengeText.textContent = snapshot.challenge.done
      ? `${snapshot.challenge.name} — concluído!`
      : `${snapshot.challenge.name} · ${snapshot.challenge.seconds}s`;
  }

  private updateSpecial(snapshot: HudSnapshot, ready: boolean, ratio: number): void {
    this.refs.special.disabled = !ready;
    this.refs.special.classList.toggle('is-ready', ready);
    this.refs.specialLabel.textContent = ready ? 'PRONTO' : `${Math.ceil(snapshot.specialCooldown)}s`;
    this.refs.specialFill.style.background = ready
      ? 'conic-gradient(#ffd166 0deg 360deg)'
      : `conic-gradient(#6be0ff ${Math.round((1 - ratio) * 360)}deg, rgba(255,255,255,0.14) 0deg)`;
  }

  showLevelUp(offers: OfferCard[], level: number, coins: number, rerollAllowed: boolean): void {
    this.rerollAllowed = rerollAllowed;
    this.refs.levelUpOverlay.hidden = false;
    this.refs.levelUpOverlay.innerHTML = `<div class="overlay-scrim"></div>
      <section class="levelup-panel" role="dialog" aria-modal="true" aria-labelledby="levelup-title" tabindex="-1">
        <header class="levelup-head">
          <div class="levelup-level"><span>NV</span><strong>${level}</strong></div>
          <div class="levelup-heading"><span class="eyebrow">subiu de nível</span><h2 id="levelup-title">Escolha uma melhoria</h2><p>Três caminhos. Uma decisão. A próxima horda não espera.</p></div>
          <div class="levelup-levelup-mark" aria-hidden="true">✦</div>
        </header>
        <div class="offer-grid">
          ${offers.map((offer, index) => this.offerCard(offer, index)).join('')}
        </div>
        <footer class="levelup-footer">
          <span class="levelup-help"><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> escolher <kbd>R</kbd> rerrolar</span>
          <span class="levelup-coins">🪙 <strong data-levelup-coins>${formatNumber(coins)}</strong> temporárias</span>
          <button class="btn btn-ghost btn-sm" data-action="reroll-offers" data-levelup-reroll ${this.rerollDisabled(coins, rerollAllowed) ? 'disabled' : ''}>
            <span aria-hidden="true">↻</span> Rerrolar · ${REROLL_COST} 🪙
          </button>
        </footer>
      </section>`;
    this.refs.levelUpOverlay.querySelector<HTMLElement>('.levelup-panel')?.focus();
  }

  private offerCard(offer: OfferCard, index: number): string {
    const rarity = RARITY_INFO[offer.rarity];
    const icon = offer.icon
      ? spriteImg(offer.icon, offer.name, 'offer-icon-img', offer.emoji)
      : `<span class="offer-emoji" aria-hidden="true">${offer.emoji}</span>`;
    return `<button class="offer-card rarity-${offer.rarity}" data-action="choose-offer" data-index="${index}" style="--rarity-color:${rarity.color};--rarity-glow:${rarity.glow}">
      <span class="offer-number">${index + 1}</span>
      <span class="offer-rarity">${esc(rarityLabel(offer.rarity))}</span>
      <span class="offer-icon">${icon}</span>
      <strong class="offer-name">${esc(offer.name)}</strong>
      <span class="offer-description">${esc(offer.description)}</span>
      <span class="offer-footer">${esc(offer.footer ?? (offer.kind === 'evolution' ? 'Evolução de arma' : 'Melhoria de run'))}</span>
      <span class="offer-choose">Escolher <span aria-hidden="true">→</span></span>
    </button>`;
  }

  private rerollDisabled(coins: number, allowed: boolean): boolean {
    return !allowed || coins < REROLL_COST;
  }

  private updateLevelUpEconomy(coins: number): void {
    const coinNode = this.refs.levelUpOverlay.querySelector<HTMLElement>('[data-levelup-coins]');
    const reroll = this.refs.levelUpOverlay.querySelector<HTMLButtonElement>('[data-levelup-reroll]');
    if (coinNode) coinNode.textContent = formatNumber(coins);
    if (reroll) reroll.disabled = this.rerollDisabled(coins, this.rerollAllowed);
  }

  setRerollAllowed(allowed: boolean): void {
    this.rerollAllowed = allowed;
    if (this.snapshot) this.updateLevelUpEconomy(this.snapshot.coins);
  }

  hideLevelUp(): void {
    this.refs.levelUpOverlay.hidden = true;
    this.refs.levelUpOverlay.innerHTML = '';
    this.rerollAllowed = true;
  }

  setPaused(paused: boolean): void {
    if (!paused) {
      this.refs.pauseOverlay.hidden = true;
      this.refs.pauseOverlay.innerHTML = '';
      return;
    }
    const snapshot = this.snapshot;
    const weapons = snapshot?.weapons ?? [];
    const buffs = snapshot?.buffs ?? [];
    this.refs.pauseOverlay.hidden = false;
    this.refs.pauseOverlay.innerHTML = `<div class="overlay-scrim"></div>
      <section class="pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <header class="pause-head">
          <span class="eyebrow">jornada pausada</span>
          <h2 id="pause-title">Respire. A horda espera.</h2>
          <p>${esc(getRegion(this.config.regionId).name)} · ${esc(this.difficultyLabel(this.config.difficulty))}</p>
        </header>
        <div class="pause-stats">
          <span><small>Tempo</small><strong>${formatTime(snapshot?.timeLeft ?? 0)}</strong></span>
          <span><small>Nível</small><strong>${snapshot?.level ?? 1}</strong></span>
          <span><small>Moedas</small><strong>${formatNumber(snapshot?.coins ?? 0)}</strong></span>
          <span><small>Abates</small><strong>${formatNumber(snapshot?.kills ?? 0)}</strong></span>
        </div>
        <div class="pause-loadout">
          <span class="eyebrow">armas da run</span>
          <div class="pause-weapons">${weapons.map((weapon) => {
            const def = getWeapon(weapon.id);
            return `<span class="pause-weapon" style="--weapon-color:${def.color}">${spriteImg(def.icon, def.name, 'pause-weapon-img', '🗡️')}<span><strong>${esc(def.name)}</strong><small>${weapon.evolved ? 'Evoluída' : `Nível ${weapon.level}`}</small></span></span>`;
          }).join('')}</div>
        </div>
        ${
          buffs.length
            ? `<div class="pause-buffs"><span class="eyebrow">efeitos ativos</span>${buffs.map((buff) => `<span class="hud-buff is-${buff.tone}"><span aria-hidden="true">${buff.emoji}</span>${esc(buff.label)}<strong>${buff.seconds}s</strong></span>`).join('')}</div>`
            : ''
        }
        <div class="pause-actions">
          <button class="btn btn-primary" data-action="resume"><span aria-hidden="true">▶</span> Continuar</button>
          <button class="btn btn-ghost" data-action="toggle-mute">${this.settings.muted ? '🔇 Som desligado' : '🔊 Som ligado'}</button>
          <button class="btn btn-danger btn-ghost" data-action="request-abandon"><span aria-hidden="true">🏳</span> Abandonar run</button>
        </div>
        <p class="pause-footnote"><kbd>ESC</kbd> também retoma. Abandonar encerra a jornada e concede as recompensas de derrota permitidas.</p>
      </section>`;
  }

  refreshPause(): void {
    if (!this.refs.pauseOverlay.hidden) this.setPaused(true);
  }

  showEvent(event: GameEventDef, detail: string, tone: string): void {
    if (this.eventTimer !== null) window.clearTimeout(this.eventTimer);
    const icon = event.icon && event.icon.startsWith('sprites/')
      ? spriteImg(event.icon, event.name, 'event-icon-img', event.emoji)
      : `<span class="event-emoji" aria-hidden="true">${event.emoji || event.icon}</span>`;
    this.refs.eventLayer.innerHTML = `<div class="event-card tone-${esc(tone)}">
      <div class="event-card-icon">${icon}</div>
      <div class="event-card-copy"><span class="eyebrow">evento na estrada · ${esc(event.name)}</span><h3>${esc(event.name)}</h3><p>${esc(event.description)}</p><strong>${esc(detail)}</strong></div>
      <button class="icon-btn event-close" data-action="close-event" aria-label="Fechar evento">×</button>
    </div>`;
    this.refs.eventLayer.classList.add('is-active');
    this.eventTimer = window.setTimeout(() => this.hideEvent(), 6200);
  }

  hideEvent(): void {
    if (this.eventTimer !== null) {
      window.clearTimeout(this.eventTimer);
      this.eventTimer = null;
    }
    this.refs.eventLayer.classList.remove('is-active');
    this.refs.eventLayer.innerHTML = '';
  }

  announceBoss(name: string): void {
    const boss = BOSSES.find((entry) => entry.name === name);
    if (this.bossBannerTimer !== null) window.clearTimeout(this.bossBannerTimer);
    this.refs.bossBanner.hidden = false;
    this.refs.bossBanner.innerHTML = `<div class="boss-banner-inner">
      <span class="boss-banner-kicker">CHEFE DA ETAPA</span>
      <div class="boss-banner-main">
        ${boss ? spriteImg(`sprites/${boss.sprite}.png`, boss.name, 'boss-banner-img', '☠️') : '<span class="boss-banner-img-fallback">☠️</span>'}
        <div><h2>${esc(name)}</h2><p>${esc(boss?.title ?? 'O caminho pede mais do que coragem.')}</p></div>
      </div>
      <span class="boss-banner-line" aria-hidden="true"></span>
    </div>`;
    this.bossBannerTimer = window.setTimeout(() => {
      this.refs.bossBanner.hidden = true;
      this.refs.bossBanner.innerHTML = '';
      this.bossBannerTimer = null;
    }, 3600);
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.refs.soundButtons.forEach((button) => {
      button.textContent = muted ? '🔇' : '🔊';
      button.setAttribute('aria-label', muted ? 'Ativar som' : 'Silenciar');
    });
  }

  updateSettings(settings: SaveSettings): void {
    this.settings = settings;
    this.setJoystickSide(settings.joystickSide);
    this.refs.fps.hidden = !settings.showFps;
    this.setMuted(settings.muted);
  }

  setJoystickSide(side: 'esquerda' | 'direita'): void {
    this.refs.shell.dataset.joystickSide = side;
    this.settings.joystickSide = side;
  }

  setFps(fps: number): void {
    if (!this.settings.showFps) return;
    this.refs.fps.hidden = false;
    this.refs.fps.textContent = `${Math.round(fps)} FPS`;
  }

  private setupJoystick(): void {
    const zone = this.refs.joystick;
    const knob = this.refs.joystickKnob;
    const base = zone.querySelector<HTMLElement>('.joystick-base');
    if (!base) return;
    let pointerId: number | null = null;
    let centerX = 0;
    let centerY = 0;
    let radius = 48;

    const update = (clientX: number, clientY: number): void => {
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        dx = (dx / distance) * radius;
        dy = (dy / distance) * radius;
      }
      setVirtualInput(dx / radius, dy / radius);
      knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    };

    const start = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      pointerId = event.pointerId;
      const rect = base.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      radius = Math.max(32, rect.width * 0.36);
      zone.classList.add('is-active');
      update(event.clientX, event.clientY);
    };

    const move = (event: PointerEvent): void => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      event.preventDefault();
      update(event.clientX, event.clientY);
    };

    const end = (event?: Event): void => {
      if (event && 'pointerId' in event && pointerId !== null && (event as PointerEvent).pointerId !== pointerId) return;
      pointerId = null;
      zone.classList.remove('is-active');
      knob.style.transform = 'translate(0px, 0px)';
      setVirtualInput(0, 0);
    };

    zone.addEventListener('pointerdown', start, { passive: false });
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('blur', end);
    this.joystickCleanup = () => {
      zone.removeEventListener('pointerdown', start);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('blur', end);
    };
  }

  private difficultyLabel(difficulty: RunConfig['difficulty']): string {
    if (difficulty === 'dificil') return 'Difícil';
    if (difficulty === 'lendaria') return 'Lendária';
    return 'Normal';
  }

  destroy(): void {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    if (this.eventTimer !== null) window.clearTimeout(this.eventTimer);
    if (this.bossBannerTimer !== null) window.clearTimeout(this.bossBannerTimer);
    this.eventTimer = null;
    this.bossBannerTimer = null;
    this.joystickCleanup?.();
    this.joystickCleanup = null;
    setVirtualInput(0, 0);
    this.root.innerHTML = '';
  }
}
