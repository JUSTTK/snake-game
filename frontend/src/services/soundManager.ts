export type SoundType = 'eat_normal' | 'eat_special' | 'game_over' | 'game_start';

interface SoundConfig {
  enabled: boolean;
  volume: number;
}

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map();
  private enabled = true;
  private masterVolume = 0.5;
  private initialized = false;

  private soundPaths: Record<SoundType, string> = {
    eat_normal: '/sounds/eat_normal.wav',
    eat_special: '/sounds/eat_special.wav',
    game_over: '/sounds/game_over.wav',
    game_start: '/sounds/game_start.wav',
  };

  async initialize(): Promise<void> {
    if (this.initialized) return;

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
    if (!this.enabled) return;

    const sound = this.sounds.get(soundType);
    if (!sound) {
      if (!this.initialized) {
        console.warn('SoundManager not initialized. Call initialize() first.');
      }
      return;
    }

    sound.currentTime = 0;
    sound.volume = this.masterVolume;
    sound.play().catch((error) => {
      console.warn(`Failed to play sound ${soundType}:`, error);
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((sound) => {
      sound.volume = this.masterVolume;
    });
  }

  getVolume(): number {
    return this.masterVolume;
  }

  getConfig(): SoundConfig {
    return {
      enabled: this.enabled,
      volume: this.masterVolume,
    };
  }

  setConfig(config: SoundConfig): void {
    this.enabled = config.enabled;
    this.setVolume(config.volume);
  }
}

export const soundManager = new SoundManager();
