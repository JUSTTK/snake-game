# UI/UX 改进文档

## 概述

本次改进围绕 **6. UI/UX改进** 展开，涵盖游戏设置面板、主题切换系统、操作指南与快捷键自定义、成就系统四大模块，并同步修复了全站组件的主题适配问题，确保暗色/亮色/霓虹三种主题下所有页面视觉一致。

---

## 一、游戏设置面板

### 新增文件

- `frontend/src/components/Common/SettingsPanel.tsx`

### 功能说明

提供四个标签页，覆盖所有游戏配置项：

| 标签页 | 配置项 | 说明 |
|--------|--------|------|
| 通用 | 主题模式 | 暗色/亮色/霓虹三选一，带图标预览 |
| 通用 | 显示FPS | 开关，在游戏头部显示实时帧率 |
| 控制 | 控制方式 | 方向键/WASD/自定义三选一 |
| 控制 | 快捷键绑定 | 逐项自定义（上/下/左/右/暂停），点击后按键即可重新绑定 |
| 控制 | 重置默认 | 一键恢复默认快捷键 |
| 音频 | 音效开关+音量 | 独立控制游戏音效 |
| 音频 | 背景音乐开关+音量 | 独立控制背景音乐 |
| 画质 | 画质等级 | 低（关闭粒子与残影）/中（开启残影关闭粒子）/高（全部开启） |
| 画质 | 粒子效果 | 独立开关 |

### 交互方式

- 点击头部 `⚙️ 设置` 按钮打开
- 按 `Esc` 键快速打开
- 点击遮罩层或 `✕` 关闭

---

## 二、主题切换系统

### 修改文件

- `frontend/src/index.css` — 新增三套 CSS 变量主题定义
- `frontend/src/store/settingsStore.ts` — 主题状态管理与持久化

### 主题定义

#### 暗色（默认）

```css
[data-theme="dark"] {
  --bg-primary: #020617;
  --bg-secondary: #0f172a;
  --bg-card: #1e293b;
  --accent-primary: #4ade80;
  --accent-cyan: #06b6d4;
  --shadow-color: rgba(2, 6, 23, 0.3);
  --glow-color: rgba(74, 222, 128, 0.15);
  /* ... 完整变量见 index.css */
}
```

#### 亮色

```css
[data-theme="light"] {
  --bg-primary: #f8fafc;
  --bg-secondary: #f1f5f9;
  --bg-card: #ffffff;
  --accent-primary: #22c55e;
  --accent-cyan: #0891b2;
  --shadow-color: rgba(0, 0, 0, 0.08);
  --glow-color: rgba(34, 197, 94, 0.1);
  /* ... */
}
```

#### 霓虹

```css
[data-theme="neon"] {
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-card: #1a1a2e;
  --accent-primary: #00ff88;
  --accent-cyan: #00ddff;
  --shadow-color: rgba(0, 0, 0, 0.5);
  --glow-color: rgba(0, 255, 136, 0.2);
  /* ... */
}
```

### CSS 变量清单

| 变量名 | 用途 |
|--------|------|
| `--bg-primary` | 页面主背景 |
| `--bg-secondary` | 次级背景（面板、区块） |
| `--bg-card` | 卡片背景 |
| `--bg-card-hover` | 卡片悬停背景 |
| `--bg-input` | 输入框/内嵌区域背景 |
| `--border-primary` | 主边框色 |
| `--border-accent` | 强调边框色 |
| `--text-primary` | 主文字色 |
| `--text-secondary` | 次级文字色 |
| `--text-muted` | 弱化文字色 |
| `--accent-primary` | 主强调色（绿色系） |
| `--accent-secondary` | 次强调色 |
| `--accent-hover` | 强调色悬停态 |
| `--accent-cyan` | 青色强调 |
| `--accent-red` | 红色强调 |
| `--accent-yellow` | 黄色强调 |
| `--accent-blue` | 蓝色强调 |
| `--shadow-color` | 阴影颜色 |
| `--glow-color` | 发光效果颜色 |
| `--canvas-bg` | 3D 画布背景 |
| `--fog-color` | 3D 雾效颜色 |
| `--floor-color` | 地板颜色 |
| `--floor-grid` | 地板网格颜色 |

### 霓虹主题特效类

```css
.neon-glow    /* 文字发光 */
.neon-border  /* 边框发光 */
.neon-button  /* 按钮悬停发光 */
```

### 主题切换机制

1. 用户在设置面板选择主题
2. `settingsStore.setTheme()` 更新状态并保存到 localStorage
3. 同时设置 `document.documentElement.setAttribute('data-theme', theme)`
4. `SinglePlayerGame` 组件中 `useEffect` 监听 theme 变化，同步到 DOM
5. 所有使用 `var(--xxx)` 的组件自动响应

---

## 三、操作指南与快捷键自定义

### 新增文件

- `frontend/src/components/Common/GuidePanel.tsx`

### 功能说明

三个标签页：

#### 操作标签页

| 操作 | 默认按键 | 说明 |
|------|----------|------|
| 上移 | ↑ | 可自定义 |
| 下移 | ↓ | 可自定义 |
| 左移 | ← | 可自定义 |
| 右移 | → | 可自定义 |
| 暂停/继续 | Space | 可自定义 |

快捷键显示动态读取用户自定义设置，修改后立即反映。

#### 食物标签页

| 食物类型 | 图标 | 效果 | 分值 |
|----------|------|------|------|
| 普通食物 | ● | 增长蛇身 | +1 |
| 特殊食物 | ◆ | 增长蛇身 | +5 |
| 减速食物 | ⬡ | 临时降低移动速度 | +2 |
| 护盾食物 | ⬠ | 获得免死一次保护 | +3 |
| 缩短食物 | ▲ | 减少蛇身长度1/3 | +2 |

#### 技巧标签页

六条游戏策略建议：规划路线、利用护盾、缩短策略、减速陷阱、边缘行走、稀有食物。

### 交互方式

- 侧边栏 `📖 操作指南` 按钮打开/关闭
- 点击遮罩层或 `✕` 关闭

---

## 四、成就系统

### 相关文件

- `frontend/src/store/settingsStore.ts` — 成就定义、状态追踪、解锁检测
- `frontend/src/components/Common/AchievementsPanel.tsx` — 成就面板 + 解锁通知

### 成就列表（14个）

| ID | 名称 | 描述 | 图标 | 解锁条件 |
|----|------|------|------|----------|
| first_game | 初次尝试 | 完成第一局游戏 | 🎮 | totalGamesPlayed ≥ 1 |
| score_10 | 小试牛刀 | 单局得分达到10分 | ⭐ | highScore ≥ 10 |
| score_50 | 渐入佳境 | 单局得分达到50分 | 🌟 | highScore ≥ 50 |
| score_100 | 百尺竿头 | 单局得分达到100分 | 💎 | highScore ≥ 100 |
| score_200 | 传奇玩家 | 单局得分达到200分 | 👑 | highScore ≥ 200 |
| long_snake | 长蛇阵 | 蛇身长度达到20节 | 🐍 | longestSnake ≥ 20 |
| food_50 | 美食家 | 累计吃掉50个食物 | 🍎 | totalFoodEaten ≥ 50 |
| food_200 | 饕餮盛宴 | 累计吃掉200个食物 | 🍽️ | totalFoodEaten ≥ 200 |
| shield_user | 金钟罩 | 使用护盾免死3次 | 🛡️ | shieldUsed ≥ 3 |
| speed_demon | 速度恶魔 | 吃掉5个减速食物 | 🐌 | slowFoodEaten ≥ 5 |
| slim_down | 瘦身达人 | 吃掉5个缩短食物 | ✂️ | shrinkFoodEaten ≥ 5 |
| special_lover | 稀有猎手 | 吃掉10个特殊食物 | ✨ | specialFoodEaten ≥ 10 |
| survivor | 幸存者 | 连续3局不死 | 🏆 | gamesWithoutDeath ≥ 3 |
| veteran | 老手 | 完成10局游戏 | 🎖️ | totalGamesPlayed ≥ 10 |

### 追踪状态

```typescript
interface AchievementState {
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
```

### 解锁机制

1. 游戏中各种事件（吃食物、死亡、护盾触发等）调用 `updateAchievementState()`
2. `updateAchievementState()` 更新状态后自动调用 `checkAchievements()`
3. `checkAchievements()` 遍历所有未解锁成就，检查条件是否满足
4. 满足条件的成就标记为已解锁，记录解锁时间戳
5. `AchievementNotification` 组件监听成就列表变化，检测到新解锁时弹出右上角通知

### 成就面板

- 进度条显示解锁比例
- 已解锁成就高亮显示，带解锁日期
- 未解锁成就灰显，图标替换为 🔒
- 底部统计栏：累计食物 / 游戏局数 / 最高分

### 解锁通知

- 右上角弹出，带滑入动画（`animate-slide-in`）
- 显示成就图标和名称
- 3.5秒后自动消失

---

## 五、设置状态管理

### 新增文件

- `frontend/src/store/settingsStore.ts`

### 状态结构

```typescript
interface SettingsState {
  theme: ThemeMode;              // 'dark' | 'light' | 'neon'
  graphicsQuality: GraphicsQuality; // 'low' | 'medium' | 'high'
  controlScheme: ControlScheme;  // 'arrows' | 'wasd' | 'custom'
  keyBindings: KeyBinding;       // { up, down, left, right, pause }
  soundEnabled: boolean;
  soundVolume: number;           // 0~1
  musicEnabled: boolean;
  musicVolume: number;           // 0~1
  showFps: boolean;
  particleEffects: boolean;
  achievements: Achievement[];
  achievementState: AchievementState;
  settingsPanelOpen: boolean;
  achievementsPanelOpen: boolean;
}
```

### 持久化策略

所有设置通过 localStorage 持久化，键名前缀 `snake_`：

| 键名 | 内容 |
|------|------|
| `snake_theme` | 主题模式 |
| `snake_graphics` | 画质等级 |
| `snake_control_scheme` | 控制方式 |
| `snake_key_bindings` | 快捷键绑定 |
| `snake_sound_enabled` | 音效开关 |
| `snake_sound_volume` | 音效音量 |
| `snake_music_enabled` | 音乐开关 |
| `snake_music_volume` | 音乐音量 |
| `snake_show_fps` | FPS显示 |
| `snake_particle_effects` | 粒子效果 |
| `snake_achievement_state` | 成就追踪状态 |
| `snake_achievements_unlocked` | 成就解锁时间映射 |

### 与 soundManager 的集成

设置变更时同步调用 soundManager 方法：

| 设置项 | 调用方法 |
|--------|----------|
| soundEnabled | `soundManager.setEnabled()` |
| soundVolume | `soundManager.setVolume()` |
| musicEnabled | `soundManager.setMusicEnabled()` |
| musicVolume | `soundManager.setMusicVolume()` |

---

## 六、主题适配修复

以下组件原先使用硬编码 Tailwind 颜色类（如 `bg-slate-950`、`text-white`），切换主题时不会跟随变化。已全部改为 CSS 变量引用。

### 修改文件列表

| 文件 | 修改内容 |
|------|----------|
| `App.tsx` | 首页、多人登录页、加载页、404页全面改用 CSS 变量 |
| `ErrorBoundary.tsx` | 错误边界页面改用 CSS 变量 |
| `Button.tsx` | 按钮组件改用 `style` 属性应用主题变量 |
| `SinglePlayerScoreBoard.tsx` | 分数面板颜色改为 CSS 变量 |
| `SinglePlayerControlPanel.tsx` | 控制面板颜色改为 CSS 变量 |
| `CameraModeSelector.tsx` | 镜头模式选择器颜色改为 CSS 变量 |
| `MultiViewBoard.tsx` | 多视图面板全面改用 CSS 变量 |
| `SinglePlayerGame.tsx` | 游戏主页面全面改用 CSS 变量，集成新组件 |

### 改造模式

**改造前：**
```tsx
<div className="bg-slate-950 text-white">
```

**改造后：**
```tsx
<div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
```

---

## 七、游戏主页面集成

### 修改文件

- `frontend/src/components/SinglePlayerGame.tsx`

### 集成内容

1. **头部工具栏**：FPS 显示、🏆 成就按钮、⚙️ 设置按钮
2. **侧边栏状态提示**：护盾生效中（黄色）、减速中（蓝色）
3. **操作指南按钮**：嵌入侧边栏
4. **成就追踪**：吃食物、死亡、护盾使用等事件自动更新成就状态
5. **自定义快捷键支持**：替代硬编码方向键，通过 `keyBindingToDirection()` 映射
6. **Esc 快捷键**：快速打开设置面板
7. **主题同步**：`useEffect` 监听 theme 变化，同步到 `data-theme` 属性

### 新增 CSS 动画

```css
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

.animate-slide-in {
  animation: slide-in-right 0.4s ease-out;
}
```

用于成就解锁通知的滑入效果。

---

## 八、文件变更总览

### 新增文件（4个）

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/store/settingsStore.ts` | 设置与成就状态管理 |
| `frontend/src/components/Common/SettingsPanel.tsx` | 游戏设置面板 |
| `frontend/src/components/Common/GuidePanel.tsx` | 操作指南面板 |
| `frontend/src/components/Common/AchievementsPanel.tsx` | 成就面板 + 解锁通知 |

### 修改文件（9个）

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/index.css` | 新增三套主题 CSS 变量 + 动画 |
| `frontend/src/App.tsx` | 主题适配 |
| `frontend/src/components/ErrorBoundary.tsx` | 主题适配 |
| `frontend/src/components/Common/Button.tsx` | 主题适配 |
| `frontend/src/components/Common/SinglePlayerScoreBoard.tsx` | 主题适配 |
| `frontend/src/components/Common/SinglePlayerControlPanel.tsx` | 主题适配 |
| `frontend/src/components/Game/CameraModeSelector.tsx` | 主题适配 |
| `frontend/src/components/Game/MultiViewBoard.tsx` | 主题适配 |
| `frontend/src/components/SinglePlayerGame.tsx` | 集成所有新功能 + 主题适配 |

---

## 九、构建验证

- TypeScript 类型检查：✅ 零错误
- Vite 生产构建：✅ 成功
- Vite 开发服务器热更新：✅ 无报错
- VS Code 诊断：✅ 无问题
