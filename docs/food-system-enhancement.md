# 食物系统增强文档

## 概述

本次改进围绕 **2. 食物系统增强** 展开，在原有普通食物+特殊食物的基础上，新增三种特殊效果食物（减速、护盾、缩短），优化食物刷新策略（稀有食物概率随蛇身增长、避免食物生成在蛇身附近），并同步更新前后端类型定义、3D渲染和游戏逻辑。

---

## 一、新增食物类型

### 食物类型总览

| 类型 | 常量 | 颜色 | 3D几何体 | 分值 | 效果 | 最低蛇长 |
|------|------|------|----------|------|------|----------|
| 普通食物 | NORMAL | #fb7185 (粉红) | 球体 | +1 | 增长蛇身 | 0 |
| 特殊食物 | SPECIAL | #facc15 (金黄) | 八面体 | +5 | 增长蛇身 | 0 |
| 减速食物 | SLOW | #38bdf8 (天蓝) | 二十面体 | +2 | 临时减速 | 4 |
| 护盾食物 | SHIELD | #fbbf24 (琥珀) | 十二面体 | +3 | 免死一次 | 5 |
| 缩短食物 | SHRINK | #f87171 (红色) | 四面体 | +2 | 缩短蛇身 | 6 |

### 食物配置常量

```typescript
export const FOOD_CONFIG: Record<FoodType, { color: string; emissive: string; score: number; label: string }> = {
  NORMAL:  { color: '#fb7185', emissive: '#7f1d1d', score: 1,  label: '普通食物' },
  SPECIAL: { color: '#facc15', emissive: '#ca8a04', score: 5,  label: '特殊食物' },
  SLOW:    { color: '#38bdf8', emissive: '#1e3a5f', score: 2,  label: '减速食物' },
  SHIELD:  { color: '#fbbf24', emissive: '#92400e', score: 3,  label: '护盾食物' },
  SHRINK:  { color: '#f87171', emissive: '#7f1d1d', score: 2,  label: '缩短食物' },
};
```

---

## 二、特殊食物效果详解

### 2.1 减速食物（SLOW）

- **颜色**：天蓝色 #38bdf8
- **效果**：蛇进入减速状态，移动速度从 150ms 降至 250ms
- **持续时间**：25 步
- **前端计时**：每步 `slowTimer--`，归零时移除减速状态
- **后端计时**：`TickEffects()` 每步 `SlowTimer--`，归零时 `Slowed = false`

```typescript
case 'SLOW':
  nextSnake.slowed = true;
  nextSnake.slowTimer = SLOW_DURATION; // 25
  break;
```

**3D视觉反馈**：蛇身颜色变为 #7dd3fc（浅蓝），自发光变为 #38bdf8

### 2.2 护盾食物（SHIELD）

- **颜色**：琥珀色 #fbbf24
- **效果**：蛇获得护盾，碰撞时免死一次
- **持续时间**：30 步
- **触发机制**：撞墙或撞自身时，护盾消耗，蛇不死亡但位置回退

```typescript
if (prevSnake.shielded) {
  const nextSnake: Snake = {
    ...prevSnake,
    direction: activeDirection,
    shielded: false,
    shieldTimer: 0,
  };
  soundManager.play('eat_special');
  updateAchievementState({ shieldUsed: ... + 1 });
  return nextSnake;
}
```

**3D视觉反馈**：
- 蛇身颜色变为 #fbbf24（金色），金属度 0.4
- 蛇头额外渲染半透明球体护盾（`sphereGeometry`, opacity: 0.12）

**UI状态提示**：
```
🛡️ 护盾生效中 (N步)
```

### 2.3 缩短食物（SHRINK）

- **颜色**：红色 #f87171
- **效果**：减少蛇身长度
- **缩短规则**：移除 `body.length / 3` 个尾部节段（最少1个），保留最少3节

```typescript
case 'SHRINK':
  if (nextSnake.body.length > 3) {
    const removeCount = Math.max(1, Math.floor(nextSnake.body.length / 3));
    const minLen = 3;
    const actualRemove = Math.min(removeCount, nextSnake.body.length - minLen);
    if (actualRemove > 0) {
      nextSnake.body = nextSnake.body.slice(0, -actualRemove);
    }
  }
  break;
```

**后端逻辑**（`Snake.Shrink()`）：

```go
func (s *Snake) Shrink() {
    if len(s.Body) > 3 {
        removeCount := len(s.Body) / 3
        if removeCount < 1 { removeCount = 1 }
        if len(s.Body)-removeCount < 3 { removeCount = len(s.Body) - 3 }
        if removeCount > 0 {
            s.Body = s.Body[:len(s.Body)-removeCount]
        }
    }
}
```

---

## 三、食物刷新策略优化

### 3.1 加权随机生成

食物类型通过加权随机表决定，蛇身越长，可出现的食物类型越多：

| 食物类型 | 权重 | 最低蛇身长度 | 说明 |
|----------|------|--------------|------|
| NORMAL | 55 | 0 | 始终可出现 |
| SPECIAL | 10 | 0 | 始终可出现 |
| SLOW | 12 | 4 | 蛇身≥4节后出现 |
| SHIELD | 10 | 5 | 蛇身≥5节后出现 |
| SHRINK | 13 | 6 | 蛇身≥6节后出现 |

**前端实现**（`pickFoodType`）：

```typescript
const pickFoodType = (snakeLength: number): FoodType => {
  const table: { type: FoodType; weight: number; minLen: number }[] = [
    { type: 'NORMAL', weight: 55, minLen: 0 },
    { type: 'SPECIAL', weight: 10, minLen: 0 },
    { type: 'SLOW',    weight: 12, minLen: 4 },
    { type: 'SHIELD',  weight: 10, minLen: 5 },
    { type: 'SHRINK',  weight: 13, minLen: 6 },
  ];

  const eligible = table.filter((e) => snakeLength >= e.minLen);
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of eligible) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'NORMAL';
};
```

**后端实现**（`pickFoodType` in food.go）：

```go
var FoodSpawnTable = []FoodSpawnConfig{
    {Type: NormalFood,  Weight: 0.55, MinSnakeLen: 0},
    {Type: SpecialFood, Weight: 0.10, MinSnakeLen: 0},
    {Type: SlowFood,    Weight: 0.12, MinSnakeLen: 4},
    {Type: ShieldFood,  Weight: 0.10, MinSnakeLen: 5},
    {Type: ShrinkFood,  Weight: 0.13, MinSnakeLen: 6},
}
```

### 3.2 避免食物生成在蛇身附近

**前端策略**（`generateFood`）：

```typescript
for (let attempt = 0; attempt < 50; attempt++) {
  nextPos = {
    x: Math.floor(Math.random() * width),
    y: Math.floor(Math.random() * height),
  };

  // 检查是否与蛇身重叠
  if (occupiedBody.some((s) => s.x === nextPos.x && s.y === nextPos.y)) {
    continue;
  }

  // 前40次尝试中，检查与蛇头距离
  if (attempt < 40 && snakeHead) {
    const dx = nextPos.x - snakeHead.x;
    const dy = nextPos.y - snakeHead.y;
    if (dx * dx + dy * dy < 9) {  // 曼哈顿距离 < 3格
      continue;
    }
  }

  return { pos: nextPos!, type: pickFoodType(snakeLength) };
}
```

**后端策略**（`GenerateRandomFoodAvoidProximity`）：

```go
func GenerateRandomFoodAvoidProximity(mapSize Point, occupiedPoints []Point, snakeHeads []Point, minDistance int) *Food {
    for attempt := 0; attempt < 50; attempt++ {
        // ... 生成随机位置
        // ... 检查是否被占用
        // 前40次尝试中，检查与所有蛇头的距离
        if minDistance > 0 {
            for _, head := range snakeHeads {
                dx := pos.X - head.X
                dy := pos.Y - head.Y
                if dx*dx + dy*dy < minDistance*minDistance {
                    tooClose = true
                    break
                }
            }
            if tooClose && attempt < 40 { continue }
        }
        // ...
    }
}
```

### 3.3 后端食物生成策略选择

在 `game.go` 的 `generateFood()` 中，根据最长蛇身长度选择不同的生成策略：

```go
if maxSnakeLen >= 5 {
    food = models.GenerateRandomFoodWithSnakeLen(room.MapSize, occupiedPoints, maxSnakeLen)
} else {
    food = models.GenerateRandomFoodAvoidProximity(room.MapSize, occupiedPoints, snakeHeads, 3)
}
```

| 最长蛇身 | 生成策略 | 说明 |
|----------|----------|------|
| < 5 | `GenerateRandomFoodAvoidProximity` | 避免蛇头附近3格内生成 |
| ≥ 5 | `GenerateRandomFoodWithSnakeLen` | 根据蛇身长度调整稀有食物概率 |

---

## 四、蛇状态效果系统

### Snake 类型扩展

```typescript
export interface Snake {
  // ... 原有属性
  shielded?: boolean;     // 是否处于护盾状态
  shieldTimer?: number;   // 护盾剩余步数
  slowed?: boolean;       // 是否处于减速状态
  slowTimer?: number;     // 减速剩余步数
}
```

### 效果计时器

每步移动时递减计时器，归零时移除效果：

```typescript
if ((nextSnake.shieldTimer ?? 0) > 0) {
  nextSnake.shieldTimer = (nextSnake.shieldTimer ?? 0) - 1;
  if (nextSnake.shieldTimer <= 0) {
    nextSnake.shielded = false;
  }
}
if ((nextSnake.slowTimer ?? 0) > 0) {
  nextSnake.slowTimer = (nextSnake.slowTimer ?? 0) - 1;
  if (nextSnake.slowTimer <= 0) {
    nextSnake.slowed = false;
  }
}
```

**后端**（`Snake.TickEffects()`）：

```go
func (s *Snake) TickEffects() {
    if s.ShieldTimer > 0 {
        s.ShieldTimer--
        if s.ShieldTimer <= 0 { s.Shielded = false }
    }
    if s.SlowTimer > 0 {
        s.SlowTimer--
        if s.SlowTimer <= 0 { s.Slowed = false }
    }
}
```

### 护盾碰撞处理

**后端**（`Snake.KillIfUnshielded()`）：

```go
func (s *Snake) KillIfUnshielded() bool {
    if s.Shielded {
        s.Shielded = false
        s.ShieldTimer = 0
        return false  // 护盾抵消，蛇存活
    }
    s.Alive = false
    return true  // 蛇死亡
}
```

在 `checkCollisions()` 中统一调用：

```go
if head.X < 0 || head.X >= room.MapSize.X || head.Y < 0 || head.Y >= room.MapSize.Y {
    snake.KillIfUnshielded()
}
if snake.CheckSelfCollision() {
    snake.KillIfUnshielded()
}
if occupiedPoints[head] {
    snake.KillIfUnshielded()
}
```

---

## 五、3D渲染增强

### ThreeJSFood — 食物3D模型

每种食物类型拥有独特的3D几何体和视觉效果：

| 食物类型 | 几何体 | 装饰 | 点光源 | 动画 |
|----------|--------|------|--------|------|
| NORMAL | 球体 + 草莓叶(锥体) | — | #fb7185, 0.8, 3.5 | 上下浮动 |
| SPECIAL | 八面体 + 光环(圆环) | — | #fbbf24, 1.25, 4 | 浮动+缩放+旋转 |
| SLOW | 二十面体 + 半透明环 | 透明度0.85 | #38bdf8, 1.0, 4 | 浮动+缩放+旋转 |
| SHIELD | 十二面体 + 线框球 | 透明度0.15 | #fbbf24, 1.2, 4.5 | 浮动+缩放+旋转 |
| SHRINK | 四面体 + 细环 | — | #f87171, 1.0, 4 | 浮动+缩放+旋转 |

**动画实现**：

```typescript
useFrame((state) => {
  const time = state.clock.elapsedTime;
  const floatY = Math.sin(time * 3) * 0.15;  // 上下浮动
  meshRef.current.position.y = cellSize / 2 + floatY;

  if (food.type !== 'NORMAL') {
    const scale = 1 + Math.sin(time * 4) * 0.15;  // 脉动缩放
    meshRef.current.scale.set(scale, scale, scale);
    meshRef.current.rotation.y = time * 2;          // 旋转
  }
});
```

### ThreeJSSnake — 蛇身状态视觉

蛇的状态效果通过材质颜色和自发光体现：

```typescript
<meshStandardMaterial
  color={snake.shielded ? '#fbbf24' : snake.slowed ? '#7dd3fc' : snake.color}
  roughness={0.38}
  metalness={snake.shielded ? 0.4 : 0.12}
  emissive={snake.shielded ? '#fbbf24' : snake.slowed ? '#38bdf8' : snake.color}
  emissiveIntensity={isHead ? (snake.shielded ? 0.35 : 0.18) : (snake.shielded ? 0.2 : 0.08)}
/>
```

**护盾特效**：蛇头额外渲染半透明金色球体

```typescript
{isHead && snake.shielded && (
  <mesh>
    <sphereGeometry args={[cellSize * 0.7, 16, 16]} />
    <meshStandardMaterial
      color="#fde68a"
      emissive="#f59e0b"
      emissiveIntensity={0.3}
      transparent
      opacity={0.12}
    />
  </mesh>
)}
```

### 增强面板中的食物光源

在 `ThreeJSGameBoardEnhanced` 中，非普通食物额外渲染点光源：

```typescript
{food.type !== 'NORMAL' && (
  <pointLight
    position={[foodX, cellSize / 2, foodZ]}
    color={
      food.type === 'SPECIAL' ? '#facc15' :
      food.type === 'SLOW'    ? '#38bdf8' :
      food.type === 'SHIELD'  ? '#fbbf24' :
      food.type === 'SHRINK'  ? '#f87171' : '#facc15'
    }
    intensity={0.5}
    distance={4}
  />
)}
```

---

## 六、UI状态提示

### 侧边栏状态指示器

在游戏侧边栏中，当蛇处于特殊状态时显示对应提示：

```tsx
{snake.shielded && (
  <div style={{ borderColor: 'var(--accent-yellow)', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent-yellow)' }}>
    🛡️ 护盾生效中 ({snake.shieldTimer}步)
  </div>
)}
{snake.slowed && (
  <div style={{ borderColor: 'var(--accent-blue)', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)' }}>
    🐌 减速中 ({snake.slowTimer}步)
  </div>
)}
```

### 食物效果说明面板

侧边栏底部展示所有食物类型的效果说明：

```
食物效果说明
● 普通食物 — 增长蛇身 +1分
◆ 特殊食物 — 增长蛇身 +5分
⬡ 减速食物 — 临时减速 +2分
⬠ 护盾食物 — 免死一次 +3分
▲ 缩短食物 — 缩短蛇身 +2分
```

---

## 七、文件变更总览

### 修改文件

| 文件路径 | 变更内容 |
|----------|----------|
| `frontend/src/types/game.ts` | 新增 FoodType 枚举值(SLOW/SHIELD/SHRINK)、Snake 属性(shielded/shieldTimer/slowed/slowTimer)、FOOD_CONFIG 常量 |
| `frontend/src/components/Game/ThreeJSFood.tsx` | 新增 SlowFood/ShieldFood/ShrinkFood 三个3D模型组件 |
| `frontend/src/components/Game/ThreeJSSnake.tsx` | 蛇身材质根据 shielded/slowed 状态变色，护盾球体特效 |
| `frontend/src/components/Game/ThreeJSGameBoardEnhanced.tsx` | 特殊食物点光源渲染 |
| `frontend/src/components/SinglePlayerGame.tsx` | 食物生成逻辑(pickFoodType/generateFood)、特殊效果处理、状态计时器、UI状态提示 |
| `backend/internal/models/food.go` | 新增 FoodType 常量、FoodSpawnTable、GenerateRandomFoodWithSnakeLen、GenerateRandomFoodAvoidProximity、pickFoodType |
| `backend/internal/models/snake.go` | 新增 Shielded/ShieldTimer/Slowed/SlowTimer 字段、GrowWithFood/Shrink/TickEffects/KillIfUnshielded 方法 |
| `backend/internal/services/game.go` | checkCollisions 使用 KillIfUnshielded、generateFood 根据蛇长选择生成策略 |

### 新增文件

无（所有食物系统增强均在已有文件中扩展）

---

## 八、前后端一致性对照

| 功能 | 前端实现 | 后端实现 |
|------|----------|----------|
| 食物类型 | FoodType 联合类型 | FoodType 常量 |
| 加权随机 | pickFoodType() | pickFoodType() |
| 蛇身长度门槛 | minLen 过滤 | MinSnakeLen 过滤 |
| 避免蛇身附近 | generateFood() 距离检查 | GenerateRandomFoodAvoidProximity() |
| 护盾效果 | shielded + shieldTimer | Shielded + ShieldTimer |
| 减速效果 | slowed + slowTimer | Slowed + SlowTimer |
| 缩短效果 | body.slice 截断 | Shrink() 方法 |
| 效果计时 | moveSnake 中递减 | TickEffects() |
| 碰撞处理 | shielded 检查后回退 | KillIfUnshielded() |
