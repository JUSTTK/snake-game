import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore, ThemeMode, GraphicsQuality, ControlScheme } from '../store/settingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should have correct default state', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('dark');
    expect(state.graphicsQuality).toBe('high');
    expect(state.controlScheme).toBe('arrows');
    expect(state.soundEnabled).toBe(true);
    expect(state.soundVolume).toBe(0.55);
    expect(state.musicEnabled).toBe(true);
    expect(state.musicVolume).toBe(0.28);
    expect(state.showFps).toBe(false);
    expect(state.particleEffects).toBe(true);
    expect(state.settingsPanelOpen).toBe(false);
    expect(state.achievementsPanelOpen).toBe(false);
  });

  it('should set theme', () => {
    useSettingsStore.getState().setTheme('neon');
    expect(useSettingsStore.getState().theme).toBe('neon');
  });

  it('should set graphics quality', () => {
    useSettingsStore.getState().setGraphicsQuality('low');
    expect(useSettingsStore.getState().graphicsQuality).toBe('low');
  });

  it('should set control scheme to wasd', () => {
    useSettingsStore.getState().setControlScheme('wasd');
    const state = useSettingsStore.getState();
    expect(state.controlScheme).toBe('wasd');
    expect(state.keyBindings.up).toBe('w');
    expect(state.keyBindings.down).toBe('s');
    expect(state.keyBindings.left).toBe('a');
    expect(state.keyBindings.right).toBe('d');
  });

  it('should set control scheme to arrows', () => {
    useSettingsStore.getState().setControlScheme('wasd');
    useSettingsStore.getState().setControlScheme('arrows');
    const state = useSettingsStore.getState();
    expect(state.controlScheme).toBe('arrows');
    expect(state.keyBindings.up).toBe('ArrowUp');
  });

  it('should set individual key binding', () => {
    useSettingsStore.getState().setKeyBinding('up', 'KeyW');
    const state = useSettingsStore.getState();
    expect(state.keyBindings.up).toBe('KeyW');
    expect(state.controlScheme).toBe('custom');
  });

  it('should reset key bindings', () => {
    useSettingsStore.getState().setKeyBinding('up', 'KeyW');
    useSettingsStore.getState().resetKeyBindings();
    const state = useSettingsStore.getState();
    expect(state.keyBindings.up).toBe('ArrowUp');
    expect(state.controlScheme).toBe('arrows');
  });

  it('should set sound enabled', () => {
    useSettingsStore.getState().setSoundEnabled(false);
    expect(useSettingsStore.getState().soundEnabled).toBe(false);
  });

  it('should set sound volume', () => {
    useSettingsStore.getState().setSoundVolume(0.8);
    expect(useSettingsStore.getState().soundVolume).toBe(0.8);
  });

  it('should set music enabled', () => {
    useSettingsStore.getState().setMusicEnabled(false);
    expect(useSettingsStore.getState().musicEnabled).toBe(false);
  });

  it('should set music volume', () => {
    useSettingsStore.getState().setMusicVolume(0.5);
    expect(useSettingsStore.getState().musicVolume).toBe(0.5);
  });

  it('should set show fps', () => {
    useSettingsStore.getState().setShowFps(true);
    expect(useSettingsStore.getState().showFps).toBe(true);
  });

  it('should set particle effects', () => {
    useSettingsStore.getState().setParticleEffects(false);
    expect(useSettingsStore.getState().particleEffects).toBe(false);
  });

  it('should toggle settings panel', () => {
    useSettingsStore.getState().setSettingsPanelOpen(true);
    expect(useSettingsStore.getState().settingsPanelOpen).toBe(true);

    useSettingsStore.getState().setSettingsPanelOpen(false);
    expect(useSettingsStore.getState().settingsPanelOpen).toBe(false);
  });

  it('should toggle achievements panel', () => {
    useSettingsStore.getState().setAchievementsPanelOpen(true);
    expect(useSettingsStore.getState().achievementsPanelOpen).toBe(true);
  });

  it('should update achievement state', () => {
    useSettingsStore.getState().updateAchievementState({ totalFoodEaten: 10, highScore: 50 });
    const state = useSettingsStore.getState();
    expect(state.achievementState.totalFoodEaten).toBe(10);
    expect(state.achievementState.highScore).toBe(50);
    expect(state.achievementState.totalGamesPlayed).toBe(0);
  });

  it('should unlock achievement when condition is met', () => {
    useSettingsStore.getState().updateAchievementState({ totalGamesPlayed: 1 });
    const achievements = useSettingsStore.getState().achievements;
    const firstGame = achievements.find((a) => a.id === 'first_game');
    expect(firstGame?.unlocked).toBe(true);
    expect(firstGame?.unlockedAt).toBeGreaterThan(0);
  });

  it('should not unlock achievement when condition is not met', () => {
    const achievements = useSettingsStore.getState().achievements;
    const score200 = achievements.find((a) => a.id === 'score_200');
    expect(score200?.unlocked).toBe(false);
  });

  it('should persist theme to localStorage', () => {
    useSettingsStore.getState().setTheme('light');
    const stored = localStorage.getItem('snake_theme');
    expect(stored).toBe('"light"');
  });

  it('should persist graphics quality to localStorage', () => {
    useSettingsStore.getState().setGraphicsQuality('medium');
    const stored = localStorage.getItem('snake_graphics');
    expect(stored).toBe('"medium"');
  });

  it('should have all 14 achievements defined', () => {
    const achievements = useSettingsStore.getState().achievements;
    expect(achievements.length).toBe(14);
  });

  it('should have valid achievement conditions', () => {
    const achievements = useSettingsStore.getState().achievements;
    for (const a of achievements) {
      expect(a.id).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(typeof a.condition).toBe('function');
    }
  });
});
