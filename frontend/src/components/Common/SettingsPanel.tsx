import React, { useCallback, useEffect, useState } from 'react';
import { useSettingsStore, type ThemeMode, type GraphicsQuality, type ControlScheme, type KeyBinding } from '../../store/settingsStore';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'dark', label: '暗色', icon: '🌙' },
  { value: 'light', label: '亮色', icon: '☀️' },
  { value: 'neon', label: '霓虹', icon: '💜' },
];

const GRAPHICS_OPTIONS: { value: GraphicsQuality; label: string; desc: string }[] = [
  { value: 'low', label: '低', desc: '关闭粒子与残影' },
  { value: 'medium', label: '中', desc: '开启残影，关闭粒子' },
  { value: 'high', label: '高', desc: '全部效果开启' },
];

const CONTROL_OPTIONS: { value: ControlScheme; label: string }[] = [
  { value: 'arrows', label: '方向键' },
  { value: 'wasd', label: 'WASD' },
  { value: 'custom', label: '自定义' },
];

type KeyAction = keyof KeyBinding;
const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  up: '上移',
  down: '下移',
  left: '左移',
  right: '右移',
  pause: '暂停',
};

export const SettingsPanel: React.FC = () => {
  const {
    theme,
    graphicsQuality,
    controlScheme,
    keyBindings,
    soundEnabled,
    soundVolume,
    musicEnabled,
    musicVolume,
    showFps,
    particleEffects,
    settingsPanelOpen,
    setTheme,
    setGraphicsQuality,
    setControlScheme,
    setKeyBinding,
    setSoundEnabled,
    setSoundVolume,
    setMusicEnabled,
    setMusicVolume,
    setShowFps,
    setParticleEffects,
    setSettingsPanelOpen,
    resetKeyBindings,
  } = useSettingsStore();

  const [listeningKey, setListeningKey] = useState<KeyAction | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'controls' | 'audio' | 'graphics'>('general');

  const handleKeyCapture = useCallback((action: KeyAction) => {
    setListeningKey(action);
  }, []);

  useEffect(() => {
    if (!listeningKey) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const keyName = e.key === ' ' ? 'Space' : e.key;
      setKeyBinding(listeningKey, keyName);
      setListeningKey(null);
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listeningKey, setKeyBinding]);

  if (!settingsPanelOpen) return null;

  const tabs = [
    { id: 'general' as const, label: '通用', icon: '⚙️' },
    { id: 'controls' as const, label: '控制', icon: '🎮' },
    { id: 'audio' as const, label: '音频', icon: '🔊' },
    { id: 'graphics' as const, label: '画质', icon: '🎨' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSettingsPanelOpen(false)}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
          boxShadow: '0 25px 50px var(--shadow-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>游戏设置</h2>
          <button
            onClick={() => setSettingsPanelOpen(false)}
            className="rounded-lg px-2 py-1 text-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: 'var(--border-primary)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-3 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                backgroundColor: activeTab === tab.id ? 'var(--glow-color)' : 'transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>主题模式</label>
                <div className="grid grid-cols-3 gap-3">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className="rounded-xl border px-4 py-3 text-center transition-all"
                      style={{
                        borderColor: theme === opt.value ? 'var(--accent-primary)' : 'var(--border-primary)',
                        backgroundColor: theme === opt.value ? 'var(--glow-color)' : 'var(--bg-input)',
                        color: theme === opt.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                        boxShadow: theme === opt.value ? '0 0 10px var(--glow-color)' : 'none',
                      }}
                    >
                      <div className="text-2xl">{opt.icon}</div>
                      <div className="mt-1 text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>显示FPS</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>在游戏画面上显示帧率</p>
                </div>
                <ToggleSwitch checked={showFps} onChange={setShowFps} />
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>控制方式</label>
                <div className="grid grid-cols-3 gap-3">
                  {CONTROL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setControlScheme(opt.value)}
                      className="rounded-xl border px-4 py-2 text-sm font-medium transition-all"
                      style={{
                        borderColor: controlScheme === opt.value ? 'var(--accent-primary)' : 'var(--border-primary)',
                        backgroundColor: controlScheme === opt.value ? 'var(--glow-color)' : 'var(--bg-input)',
                        color: controlScheme === opt.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>快捷键绑定</label>
                  <button
                    onClick={resetKeyBindings}
                    className="rounded-lg px-3 py-1 text-xs transition-colors"
                    style={{ color: 'var(--accent-cyan)' }}
                  >
                    重置默认
                  </button>
                </div>
                <div className="space-y-2">
                  {(Object.keys(KEY_ACTION_LABELS) as KeyAction[]).map((action) => (
                    <div
                      key={action}
                      className="flex items-center justify-between rounded-lg border px-4 py-2"
                      style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{KEY_ACTION_LABELS[action]}</span>
                      <button
                        onClick={() => handleKeyCapture(action)}
                        className="min-w-[80px] rounded-lg border px-3 py-1 text-sm font-mono transition-all"
                        style={{
                          borderColor: listeningKey === action ? 'var(--accent-primary)' : 'var(--border-accent)',
                          backgroundColor: listeningKey === action ? 'var(--glow-color)' : 'var(--bg-card)',
                          color: listeningKey === action ? 'var(--accent-primary)' : 'var(--text-primary)',
                          boxShadow: listeningKey === action ? '0 0 8px var(--glow-color)' : 'none',
                        }}
                      >
                        {listeningKey === action ? '按下按键...' : formatKeyName(keyBindings[action])}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>音效</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>游戏内音效</p>
                </div>
                <ToggleSwitch checked={soundEnabled} onChange={setSoundEnabled} />
              </div>

              {soundEnabled && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>音效音量</label>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>背景音乐</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>游戏进行中的背景音乐</p>
                </div>
                <ToggleSwitch checked={musicEnabled} onChange={setMusicEnabled} />
              </div>

              {musicEnabled && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>音乐音量</label>
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-green-500"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'graphics' && (
            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>画质等级</label>
                <div className="space-y-2">
                  {GRAPHICS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setGraphicsQuality(opt.value)}
                      className="w-full rounded-xl border px-4 py-3 text-left transition-all"
                      style={{
                        borderColor: graphicsQuality === opt.value ? 'var(--accent-primary)' : 'var(--border-primary)',
                        backgroundColor: graphicsQuality === opt.value ? 'var(--glow-color)' : 'var(--bg-input)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: graphicsQuality === opt.value ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {opt.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>粒子效果</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>吃食物时的爆炸效果</p>
                </div>
                <ToggleSwitch checked={particleEffects} onChange={setParticleEffects} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="relative h-6 w-11 rounded-full transition-colors"
    style={{ backgroundColor: checked ? 'var(--accent-primary)' : 'var(--border-accent)' }}
  >
    <span
      className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform"
      style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
    />
  </button>
);

const formatKeyName = (key: string): string => {
  const map: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
  };
  return map[key] ?? key.toUpperCase();
};
