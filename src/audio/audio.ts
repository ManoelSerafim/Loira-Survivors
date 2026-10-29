import type { RegionId, SaveSettings } from '../core/types';

type MusicMode = 'menu' | RegionId;
type SfxName =
  | 'click'
  | 'shoot'
  | 'hit'
  | 'explosion'
  | 'pickup'
  | 'coin'
  | 'levelup'
  | 'upgrade'
  | 'hurt'
  | 'death'
  | 'boss'
  | 'chest'
  | 'achievement'
  | 'victory'
  | 'defeat'
  | 'event'
  | 'revive'
  | 'evolve'
  | 'dash';

const MUSIC: Record<MusicMode, { tempo: number; root: number; scale: number[]; wave: OscillatorType; pad: number[] }> = {
  menu: { tempo: 76, root: 57, scale: [0, 3, 5, 7, 10], wave: 'triangle', pad: [0, 7, 12] },
  brasil: { tempo: 108, root: 62, scale: [0, 2, 4, 7, 9], wave: 'square', pad: [0, 4, 7] },
  aeroporto: { tempo: 92, root: 52, scale: [0, 2, 3, 7, 8], wave: 'square', pad: [0, 3, 7] },
  atlantico: { tempo: 96, root: 57, scale: [0, 2, 3, 7, 8], wave: 'sawtooth', pad: [0, 5, 10] },
  europa: { tempo: 84, root: 60, scale: [0, 2, 4, 6, 7, 11], wave: 'triangle', pad: [0, 4, 7, 11] },
  portugal: { tempo: 104, root: 59, scale: [0, 1, 4, 5, 7, 8], wave: 'square', pad: [0, 4, 9] },
};

const MIDI = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private mode: MusicMode | null = null;
  private step = 0;
  private nextTime = 0;
  private settings: Pick<SaveSettings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'> = {
    masterVolume: 0.8,
    musicVolume: 0.55,
    sfxVolume: 0.8,
    muted: false,
  };
  private ducked = false;

  get isReady(): boolean {
    return !!this.ctx;
  }

  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.noiseBuffer = this.createNoiseBuffer(this.ctx);
    this.applyVolumes();
    if (this.mode) {
      const mode = this.mode;
      this.mode = null;
      this.setMusic(mode);
    }
  }

  updateSettings(settings: Pick<SaveSettings, 'masterVolume' | 'musicVolume' | 'sfxVolume' | 'muted'>): void {
    this.settings = { ...settings };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    const mute = this.settings.muted ? 0 : 1;
    this.master.gain.setTargetAtTime(0.7 * this.settings.masterVolume * mute, now, 0.04);
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * (this.ducked ? 0.18 : 0.38), now, 0.08);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfxVolume * 0.65, now, 0.04);
  }

  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    this.applyVolumes();
  }

  setMusic(mode: MusicMode | null): void {
    if (this.mode === mode && this.timer !== null) return;
    this.stopMusic();
    this.mode = mode;
    if (!this.ctx || !mode) return;
    const tempo = MUSIC[mode].tempo;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.scheduleMusic();
    this.timer = window.setInterval(() => this.scheduleMusic(), 70);
    void tempo;
  }

  stopMusic(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.mode = null;
  }

  private scheduleMusic(): void {
    if (!this.ctx || !this.mode) return;
    const config = MUSIC[this.mode];
    const stepDuration = 60 / config.tempo / 2;
    while (this.nextTime < this.ctx.currentTime + 0.22) {
      this.scheduleStep(config, this.step, this.nextTime);
      this.step = (this.step + 1) % 32;
      this.nextTime += stepDuration;
    }
  }

  private scheduleStep(config: (typeof MUSIC)[MusicMode], step: number, time: number): void {
    if (!this.ctx || !this.musicBus) return;
    const degree = config.scale[step % config.scale.length];
    const octave = step % 16 >= 8 ? 12 : 0;
    const melodyNote = config.root + 12 + degree + octave;

    if (step % 2 === 0) {
      this.noteTime(MIDI(melodyNote), 0.11, config.wave, 0.045, time, this.musicBus);
    }
    if (step % 8 === 0) {
      this.noteTime(MIDI(config.root - 12 + config.pad[step % config.pad.length]), 0.34, 'triangle', 0.13, time, this.musicBus);
    }
    if (step % 8 === 4) {
      this.noteTime(MIDI(config.root - 5), 0.25, 'triangle', 0.08, time, this.musicBus);
    }
    if (step % 4 === 0) this.kick(time, 0.055, this.musicBus);
    if (step % 8 === 6) this.noise(time, 0.06, 0.022, 6200, this.musicBus);
    if (step % 16 === 0) {
      this.noteTime(MIDI(config.root + config.pad[0] + 12), 0.9, 'sine', 0.02, time, this.musicBus);
    }
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const bus = this.sfxBus;
    const t = ctx.currentTime;
    switch (name) {
      case 'click':
        this.noteTime(640, 0.05, 'square', 0.11, t, bus);
        this.noteTime(920, 0.05, 'square', 0.06, t + 0.04, bus);
        break;
      case 'shoot':
        this.noteTime(700, 0.09, 'square', 0.06, t, bus, 1200);
        break;
      case 'hit':
        this.noise(t, 0.06, 0.07, 2400, bus);
        this.noteTime(180, 0.06, 'triangle', 0.05, t, bus, 90);
        break;
      case 'explosion':
        this.noise(t, 0.42, 0.18, 900, bus);
        this.noteTime(90, 0.35, 'sawtooth', 0.12, t, bus, 40);
        break;
      case 'pickup':
        this.noteTime(880, 0.08, 'sine', 0.08, t, bus);
        this.noteTime(1320, 0.08, 'sine', 0.06, t + 0.05, bus);
        break;
      case 'coin':
        this.noteTime(1180, 0.06, 'square', 0.06, t, bus);
        this.noteTime(1560, 0.09, 'square', 0.05, t + 0.05, bus);
        break;
      case 'levelup':
        [0, 4, 7, 12].forEach((n, i) => this.noteTime(MIDI(60 + n), 0.24, 'triangle', 0.1, t + i * 0.09, bus));
        break;
      case 'upgrade':
        this.noteTime(MIDI(72), 0.18, 'sine', 0.09, t, bus);
        this.noteTime(MIDI(79), 0.28, 'sine', 0.08, t + 0.08, bus);
        break;
      case 'hurt':
        this.noteTime(150, 0.16, 'sawtooth', 0.12, t, bus, 65);
        this.noise(t, 0.12, 0.05, 700, bus);
        break;
      case 'death':
        [0, -3, -7, -12].forEach((n, i) => this.noteTime(MIDI(57 + n), 0.4, 'triangle', 0.12, t + i * 0.18, bus));
        break;
      case 'boss':
        this.noteTime(55, 1.1, 'sawtooth', 0.18, t, bus, 38);
        this.noise(t, 0.8, 0.1, 300, bus);
        break;
      case 'chest':
        [0, 5, 9, 12, 17].forEach((n, i) => this.noteTime(MIDI(67 + n), 0.18, 'square', 0.055, t + i * 0.07, bus));
        break;
      case 'achievement':
        [0, 7, 12, 16, 19].forEach((n, i) => this.noteTime(MIDI(64 + n), 0.3, 'triangle', 0.1, t + i * 0.1, bus));
        break;
      case 'victory': {
        const notes = [60, 64, 67, 72, 67, 72, 76, 79];
        notes.forEach((n, i) => this.noteTime(MIDI(n), 0.34, 'square', 0.075, t + i * 0.14, bus));
        break;
      }
      case 'defeat':
        [0, -2, -5, -9].forEach((n, i) => this.noteTime(MIDI(60 + n), 0.55, 'triangle', 0.09, t + i * 0.3, bus));
        break;
      case 'event':
        this.noteTime(440, 0.1, 'square', 0.08, t, bus);
        this.noteTime(660, 0.16, 'square', 0.07, t + 0.1, bus);
        break;
      case 'revive':
        [0, 5, 9, 12, 16].forEach((n, i) => this.noteTime(MIDI(60 + n), 0.4, 'sine', 0.1, t + i * 0.12, bus));
        break;
      case 'evolve':
        this.noise(t, 0.5, 0.06, 7000, bus);
        [0, 7, 12, 19, 24].forEach((n, i) => this.noteTime(MIDI(67 + n), 0.5, 'sine', 0.09, t + i * 0.09, bus));
        break;
      case 'dash':
        this.noise(t, 0.18, 0.08, 1800, bus);
        this.noteTime(320, 0.12, 'sine', 0.07, t, bus, 900);
        break;
    }
  }

  private noteTime(
    freq: number,
    duration: number,
    wave: OscillatorType,
    volume: number,
    when: number,
    destination: GainNode,
    slideTo?: number,
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private kick(when: number, volume: number, destination: GainNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.12);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(when);
    osc.stop(when + 0.18);
  }

  private noise(when: number, duration: number, volume: number, cutoff: number, destination: GainNode): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, when);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}

export const audio = new AudioManager();
