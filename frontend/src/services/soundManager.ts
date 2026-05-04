export type SoundType = 'eat_normal' | 'eat_special' | 'game_over' | 'game_start';

interface SoundConfig {
  enabled: boolean;
  volume: number;
  musicEnabled: boolean;
  musicVolume: number;
}

type ToneOptions = {
  duration: number;
  volume: number;
  type: OscillatorType;
  glideTo?: number;
  when?: number;
};

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled = true;
  private masterVolume = 0.55;
  private musicEnabled = true;
  private musicVolume = 0.28;
  private initialized = false;
  private backgroundMusicActive = false;
  private audioContext: AudioContext | null = null;
  private effectsGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicLoopTimer: number | null = null;
  private musicStep = 0;
  private lastMoveTickAt = 0;
  private lastTurnAt = 0;

  private readonly soundPaths: Record<SoundType, string> = {
    eat_normal: '/sounds/eat_normal.wav',
    eat_special: '/sounds/eat_special.wav',
    game_over: '/sounds/game_over.wav',
    game_start: '/sounds/game_start.wav',
  };

  private readonly musicPattern: Array<Array<number | null>> = [
    [392, 523.25],
    [440],
    [523.25],
    [392],
    [349.23, 440],
    [392],
    [523.25],
    [440],
  ];

  private ensureAudioContext() {
    if (this.audioContext) {
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    this.audioContext = new AudioContextCtor();
    this.effectsGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();
    this.effectsGain.gain.value = this.masterVolume;
    this.musicGain.gain.value = this.musicVolume;
    this.effectsGain.connect(this.audioContext.destination);
    this.musicGain.connect(this.audioContext.destination);
  }

  private async resumeAudioContext() {
    this.ensureAudioContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  private playTone(frequency: number, options: ToneOptions) {
    if (!this.enabled) {
      return;
    }

    this.ensureAudioContext();
    if (!this.audioContext || !this.effectsGain) {
      return;
    }

    void this.resumeAudioContext();

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const startAt = options.when ?? this.audioContext.currentTime;
    const endAt = startAt + options.duration;

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (options.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(options.glideTo, 1),
        endAt
      );
    }

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(
      Math.max(options.volume * this.masterVolume, 0.0001),
      startAt + Math.min(options.duration * 0.18, 0.02)
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gainNode);
    gainNode.connect(this.effectsGain);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.01);
  }

  private playMusicChord(notes: Array<number | null>) {
    if (!this.audioContext || !this.musicGain || !this.enabled || !this.musicEnabled) {
      return;
    }

    const startAt = this.audioContext.currentTime + 0.02;

    notes.forEach((note, index) => {
      if (!note) {
        return;
      }

      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      const frequency = index === 0 ? note : note * 0.5;
      const attackEnd = startAt + 0.04;
      const releaseAt = startAt + 0.32;

      oscillator.type = index === 0 ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gainNode.gain.setValueAtTime(0.0001, startAt);
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(this.musicVolume * (index === 0 ? 0.65 : 0.35), 0.0001),
        attackEnd
      );
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseAt);

      oscillator.connect(gainNode);
      gainNode.connect(this.musicGain!);
      oscillator.start(startAt);
      oscillator.stop(releaseAt + 0.03);
    });
  }

  private scheduleMusicLoop() {
    if (!this.backgroundMusicActive || !this.musicEnabled || !this.enabled) {
      return;
    }

    this.ensureAudioContext();
    void this.resumeAudioContext();

    const chord = this.musicPattern[this.musicStep % this.musicPattern.length];
    this.playMusicChord(chord);
    this.musicStep += 1;

    this.musicLoopTimer = window.setTimeout(() => {
      this.scheduleMusicLoop();
    }, 340);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.ensureAudioContext();
    const loadPromises: Promise<void>[] = [];

    for (const [type, path] of Object.entries(this.soundPaths)) {
      const promise = new Promise<void>((resolve) => {
        const audio = new Audio(path);
        audio.volume = this.masterVolume;
        audio.addEventListener('canplaythrough', () => {
          this.sounds.set(type as SoundType, audio);
          resolve();
        });
        audio.addEventListener('error', () => {
          console.warn(`Failed to load sound: ${path}`);
          resolve();
        });
      });
      loadPromises.push(promise);
    }

    try {
      await Promise.all(loadPromises);
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing sounds:', error);
    }
  }

  play(soundType: SoundType): void {
    if (!this.enabled) {
      return;
    }

    const sound = this.sounds.get(soundType);
    if (!sound) {
      if (!this.initialized) {
        console.warn('SoundManager not initialized. Call initialize() first.');
      }
      return;
    }

    void this.resumeAudioContext();
    sound.currentTime = 0;
    sound.volume = this.masterVolume;
    sound.play().catch((error) => {
      console.warn(`Failed to play sound ${soundType}:`, error);
    });
  }

  playMoveTick(): void {
    const now = performance.now();
    if (now - this.lastMoveTickAt < 95) {
      return;
    }

    this.lastMoveTickAt = now;
    this.playTone(210, {
      duration: 0.045,
      volume: 0.16,
      type: 'triangle',
      glideTo: 170,
    });
  }

  playTurn(): void {
    const now = performance.now();
    if (now - this.lastTurnAt < 60) {
      return;
    }

    this.lastTurnAt = now;
    this.playTone(520, {
      duration: 0.05,
      volume: 0.12,
      type: 'square',
      glideTo: 700,
    });
  }

  setBackgroundMusicActive(active: boolean) {
    this.backgroundMusicActive = active;

    if (!active || !this.enabled || !this.musicEnabled) {
      if (this.musicLoopTimer !== null) {
        window.clearTimeout(this.musicLoopTimer);
        this.musicLoopTimer = null;
      }
      return;
    }

    if (this.musicLoopTimer === null) {
      this.scheduleMusicLoop();
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.setBackgroundMusicActive(false);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => {
      sound.volume = this.masterVolume;
    });
    if (this.effectsGain) {
      this.effectsGain.gain.value = this.masterVolume;
    }
  }

  getVolume(): number {
    return this.masterVolume;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.setBackgroundMusicActive(false);
    } else if (this.backgroundMusicActive) {
      this.scheduleMusicLoop();
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  getConfig(): SoundConfig {
    return {
      enabled: this.enabled,
      volume: this.masterVolume,
      musicEnabled: this.musicEnabled,
      musicVolume: this.musicVolume,
    };
  }

  setConfig(config: SoundConfig): void {
    this.enabled = config.enabled;
    this.setVolume(config.volume);
    this.musicEnabled = config.musicEnabled;
    this.setMusicVolume(config.musicVolume);
  }
}

export const soundManager = new SoundManager();
