import { create } from 'zustand';
import { soundManager } from '../services/soundManager';

export type ThemeMode = 'dark' | 'light' | 'neon';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ControlScheme = 'arrows' | 'wasd' | 'custom';

export interface KeyBinding {
  up: string;
  down: string;
  left: string;
  right: string;
  pause: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: number | null;
  condition: (state: AchievementState) => boolean;
}

export interface AchievementState {
  totalGamesPlayed: number;
  totalFoodEaten: number;
  highScore: number;
  longestSnake: number;
  totalDeaths: number;
  shieldUsed: number;
  slowFoodEaten: number;
  shrinkFoodEaten: number;
  specialFoodEaten: number;
  gamesWithoutDeath: number;
}

interface SettingsState {
  theme: ThemeMode;
  graphicsQuality: GraphicsQuality;
  controlScheme: ControlScheme;
  keyBindings: KeyBinding;
  soundEnabled: boolean;
  soundVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  showFps: boolean;
  particleEffects: boolean;
  achievements: Achievement[];
  achievementState: AchievementState;
  settingsPanelOpen: boolean;
  achievementsPanelOpen: boolean;

  setTheme: (theme: ThemeMode) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  setControlScheme: (scheme: ControlScheme) => void;
  setKeyBinding: (action: keyof KeyBinding, key: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setMusicVolume: (volume: number) => void;
  setShowFps: (show: boolean) => void;
  setParticleEffects: (enabled: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setAchievementsPanelOpen: (open: boolean) => void;
  updateAchievementState: (update: Partial<AchievementState>) => void;
  checkAchievements: () => void;
  resetKeyBindings: () => void;
}

const DEFAULT_KEY_BINDINGS: KeyBinding = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  pause: 'Space',
};

const WASD_KEY_BINDINGS: KeyBinding = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  pause: 'Space',
};

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  {
    id: 'first_game',
    name: '初次尝试',
    description: '完成第一局游戏',
    icon: '🎮',
    condition: (s) => s.totalGamesPlayed >= 1,
  },
  {
    id: 'score_10',
    name: '小试牛刀',
    description: '单局得分达到10分',
    icon: '⭐',
    condition: (s) => s.highScore >= 10,
  },
  {
    id: 'score_50',
    name: '渐入佳境',
    description: '单局得分达到50分',
    icon: '🌟',
    condition: (s) => s.highScore >= 50,
  },
  {
    id: 'score_100',
    name: '百尺竿头',
    description: '单局得分达到100分',
    icon: '💎',
    condition: (s) => s.highScore >= 100,
  },
  {
    id: 'long_snake',
    name: '长蛇阵',
    description: '蛇身长度达到20节',
    icon: '🐍',
    condition: (s) => s.longestSnake >= 20,
  },
  {
    id: 'food_50',
    name: '美食家',
    description: '累计吃掉50个食物',
    icon: '🍎',
    condition: (s) => s.totalFoodEaten >= 50,
  },
  {
    id: 'food_200',
    name: '饕餮盛宴',
    description: '累计吃掉200个食物',
    icon: '🍽️',
    condition: (s) => s.totalFoodEaten >= 200,
  },
  {
    id: 'shield_user',
    name: '金钟罩',
    description: '使用护盾免死3次',
    icon: '🛡️',
    condition: (s) => s.shieldUsed >= 3,
  },
  {
    id: 'speed_demon',
    name: '速度恶魔',
    description: '吃掉5个减速食物',
    icon: '🐌',
    condition: (s) => s.slowFoodEaten >= 5,
  },
  {
    id: 'slim_down',
    name: '瘦身达人',
    description: '吃掉5个缩短食物',
    icon: '✂️',
    condition: (s) => s.shrinkFoodEaten >= 5,
  },
  {
    id: 'special_lover',
    name: '稀有猎手',
    description: '吃掉10个特殊食物',
    icon: '✨',
    condition: (s) => s.specialFoodEaten >= 10,
  },
  {
    id: 'survivor',
    name: '幸存者',
    description: '连续3局不死（单局得分>0）',
    icon: '🏆',
    condition: (s) => s.gamesWithoutDeath >= 3,
  },
  {
    id: 'veteran',
    name: '老手',
    description: '完成10局游戏',
    icon: '🎖️',
    condition: (s) => s.totalGamesPlayed >= 10,
  },
  {
    id: 'score_200',
    name: '传奇玩家',
    description: '单局得分达到200分',
    icon: '👑',
    condition: (s) => s.highScore >= 200,
  },
];

const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return { ...fallback, ...JSON.parse(stored) };
    }
  } catch {
    // localStorage may be unavailable in some environments
  }
  return fallback;
};

const saveToStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable in some environments
  }
};

const loadAchievements = (): Achievement[] => {
  const unlockedMap = loadFromStorage<Record<string, number>>('snake_achievements_unlocked', {});
  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    ...def,
    unlocked: def.id in unlockedMap,
    unlockedAt: unlockedMap[def.id] ?? null,
  }));
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: loadFromStorage<ThemeMode>('snake_theme', 'dark'),
  graphicsQuality: loadFromStorage<GraphicsQuality>('snake_graphics', 'high'),
  controlScheme: loadFromStorage<ControlScheme>('snake_control_scheme', 'arrows'),
  keyBindings: loadFromStorage<KeyBinding>('snake_key_bindings', DEFAULT_KEY_BINDINGS),
  soundEnabled: loadFromStorage<boolean>('snake_sound_enabled', true),
  soundVolume: loadFromStorage<number>('snake_sound_volume', 0.55),
  musicEnabled: loadFromStorage<boolean>('snake_music_enabled', true),
  musicVolume: loadFromStorage<number>('snake_music_volume', 0.28),
  showFps: loadFromStorage<boolean>('snake_show_fps', false),
  particleEffects: loadFromStorage<boolean>('snake_particle_effects', true),
  achievements: loadAchievements(),
  achievementState: loadFromStorage<AchievementState>('snake_achievement_state', {
    totalGamesPlayed: 0,
    totalFoodEaten: 0,
    highScore: 0,
    longestSnake: 0,
    totalDeaths: 0,
    shieldUsed: 0,
    slowFoodEaten: 0,
    shrinkFoodEaten: 0,
    specialFoodEaten: 0,
    gamesWithoutDeath: 0,
  }),
  settingsPanelOpen: false,
  achievementsPanelOpen: false,

  setTheme: (theme) => {
    set({ theme });
    saveToStorage('snake_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },

  setGraphicsQuality: (quality) => {
    set({ graphicsQuality: quality });
    saveToStorage('snake_graphics', quality);
  },

  setControlScheme: (scheme) => {
    const bindings = scheme === 'wasd' ? WASD_KEY_BINDINGS : DEFAULT_KEY_BINDINGS;
    set({ controlScheme: scheme, keyBindings: bindings });
    saveToStorage('snake_control_scheme', scheme);
    saveToStorage('snake_key_bindings', bindings);
  },

  setKeyBinding: (action, key) => {
    const newBindings = { ...get().keyBindings, [action]: key };
    set({ keyBindings: newBindings, controlScheme: 'custom' });
    saveToStorage('snake_key_bindings', newBindings);
    saveToStorage('snake_control_scheme', 'custom');
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    soundManager.setEnabled(enabled);
    saveToStorage('snake_sound_enabled', enabled);
  },

  setSoundVolume: (volume) => {
    set({ soundVolume: volume });
    soundManager.setVolume(volume);
    saveToStorage('snake_sound_volume', volume);
  },

  setMusicEnabled: (enabled) => {
    set({ musicEnabled: enabled });
    soundManager.setMusicEnabled(enabled);
    saveToStorage('snake_music_enabled', enabled);
  },

  setMusicVolume: (volume) => {
    set({ musicVolume: volume });
    soundManager.setMusicVolume(volume);
    saveToStorage('snake_music_volume', volume);
  },

  setShowFps: (show) => {
    set({ showFps: show });
    saveToStorage('snake_show_fps', show);
  },

  setParticleEffects: (enabled) => {
    set({ particleEffects: enabled });
    saveToStorage('snake_particle_effects', enabled);
  },

  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),
  setAchievementsPanelOpen: (open) => set({ achievementsPanelOpen: open }),

  updateAchievementState: (update) => {
    const newState = { ...get().achievementState, ...update };
    set({ achievementState: newState });
    saveToStorage('snake_achievement_state', newState);
    get().checkAchievements();
  },

  checkAchievements: () => {
    const { achievements, achievementState } = get();
    let changed = false;
    const updatedAchievements = achievements.map((a) => {
      if (!a.unlocked && a.condition(achievementState)) {
        changed = true;
        const now = Date.now();
        const unlockedMap = loadFromStorage<Record<string, number>>('snake_achievements_unlocked', {});
        unlockedMap[a.id] = now;
        saveToStorage('snake_achievements_unlocked', unlockedMap);
        return { ...a, unlocked: true, unlockedAt: now };
      }
      return a;
    });
    if (changed) {
      set({ achievements: updatedAchievements });
    }
  },

  resetKeyBindings: () => {
    set({ keyBindings: DEFAULT_KEY_BINDINGS, controlScheme: 'arrows' });
    saveToStorage('snake_key_bindings', DEFAULT_KEY_BINDINGS);
    saveToStorage('snake_control_scheme', 'arrows');
  },
}));
