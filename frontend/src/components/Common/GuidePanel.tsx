import React, { useState } from 'react';
import { useSettingsStore, type KeyBinding } from '../../store/settingsStore';
import { FOOD_CONFIG, type FoodType } from '../../types/game';

export const GuidePanel: React.FC = () => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'controls' | 'food' | 'tips'>('controls');
  const keyBindings = useSettingsStore((s) => s.keyBindings);

  if (!guideOpen) {
    return (
      <button
        onClick={() => setGuideOpen(true)}
        className="rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:opacity-80"
        style={{
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-input)',
          color: 'var(--text-secondary)',
        }}
      >
        📖 操作指南
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setGuideOpen(false)}>
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
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>操作指南</h2>
          <button
            onClick={() => setGuideOpen(false)}
            className="rounded-lg px-2 py-1 text-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: 'var(--border-primary)' }}>
          {[
            { id: 'controls' as const, label: '操作' },
            { id: 'food' as const, label: '食物' },
            { id: 'tips' as const, label: '技巧' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className="flex-1 px-3 py-3 text-sm font-medium transition-colors"
              style={{
                color: activeSection === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                borderBottom: activeSection === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                backgroundColor: activeSection === tab.id ? 'var(--glow-color)' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {activeSection === 'controls' && <ControlsGuide keyBindings={keyBindings} />}
          {activeSection === 'food' && <FoodGuide />}
          {activeSection === 'tips' && <TipsGuide />}
        </div>
      </div>
    </div>
  );
};

const ControlsGuide: React.FC<{ keyBindings: KeyBinding }> = ({ keyBindings }) => {
  const controls = [
    { action: '上移', key: keyBindings.up },
    { action: '下移', key: keyBindings.down },
    { action: '左移', key: keyBindings.left },
    { action: '右移', key: keyBindings.right },
    { action: '暂停/继续', key: keyBindings.pause },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        使用键盘控制蛇的移动方向，避免撞墙和撞到自己。
      </p>
      <div className="space-y-2">
        {controls.map((ctrl) => (
          <div
            key={ctrl.action}
            className="flex items-center justify-between rounded-lg border px-4 py-2"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{ctrl.action}</span>
            <kbd
              className="rounded-md border px-2 py-0.5 text-xs font-mono"
              style={{ borderColor: 'var(--border-accent)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              {formatKey(ctrl.key)}
            </kbd>
          </div>
        ))}
      </div>
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>💡 提示</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          可以在设置面板中自定义快捷键。按 Esc 键可以快速打开设置。
        </p>
      </div>
    </div>
  );
};

const FoodGuide: React.FC = () => {
  const foods: { type: FoodType; desc: string; effect: string }[] = [
    { type: 'NORMAL', desc: '普通食物', effect: '增长蛇身，+1分' },
    { type: 'SPECIAL', desc: '特殊食物', effect: '增长蛇身，+5分' },
    { type: 'SLOW', desc: '减速食物', effect: '临时降低移动速度，+2分' },
    { type: 'SHIELD', desc: '护盾食物', effect: '获得免死一次的保护，+3分' },
    { type: 'SHRINK', desc: '缩短食物', effect: '减少蛇身长度1/3，+2分' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        地图上会随机出现不同类型的食物，蛇身越长越容易出现稀有食物。
      </p>
      {foods.map((f) => {
        const config = FOOD_CONFIG[f.type];
        return (
          <div
            key={f.type}
            className="flex items-center gap-4 rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
              style={{ backgroundColor: config.color + '33', color: config.color }}
            >
              {f.type === 'NORMAL' ? '●' : f.type === 'SPECIAL' ? '◆' : f.type === 'SLOW' ? '⬡' : f.type === 'SHIELD' ? '⬠' : '▲'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{config.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.effect}</p>
            </div>
            <span className="text-xs font-mono" style={{ color: config.color }}>+{config.score}分</span>
          </div>
        );
      })}
    </div>
  );
};

const TipsGuide: React.FC = () => {
  const tips = [
    { title: '规划路线', desc: '提前规划蛇的移动路线，避免被自己的身体困住。' },
    { title: '利用护盾', desc: '护盾食物可以在关键时刻救命，尽量在蛇身较长时获取。' },
    { title: '缩短策略', desc: '当蛇身过长时，缩短食物可以帮助你重新获得活动空间。' },
    { title: '减速陷阱', desc: '减速食物虽然降低速度，但在需要精确操控时反而有用。' },
    { title: '边缘行走', desc: '沿着地图边缘移动可以减少被自身困住的风险。' },
    { title: '稀有食物', desc: '蛇身越长，稀有食物出现概率越高，风险与收益并存。' },
  ];

  return (
    <div className="space-y-3">
      {tips.map((tip, i) => (
        <div
          key={i}
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>{tip.title}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{tip.desc}</p>
        </div>
      ))}
    </div>
  );
};

const formatKey = (key: string): string => {
  const map: Record<string, string> = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
  };
  return map[key] ?? key.toUpperCase();
};
