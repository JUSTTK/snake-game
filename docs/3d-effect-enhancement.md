# 3D效果增强文档

## 概述

本次改进围绕 **5. 3D效果增强** 展开，在原有 Three.js 渲染基础上新增四大视觉效果模块：粒子爆炸系统、蛇身移动残影、3D空间音效、动态光影系统，并创建了增强版游戏面板统一集成所有效果。

---

## 一、粒子爆炸效果

### 新增文件

- `frontend/src/components/Game/ParticleEffect.tsx`

### 功能说明

在特定游戏事件触发时，在对应3D位置生成粒子爆炸效果，粒子沿径向扩散并受重力和阻力影响逐渐消散。

### 支持的粒子类型

| 类型 | 粒子数量 | 粒子大小 | 生命周期(帧) | 颜色 | 触发场景 |
|------|----------|----------|--------------|------|----------|
| food | 25 | 0.02~0.10 | 60 | #fb7185 (粉红) | 吃普通食物 |
| special | 40 | 0.02~0.10 | 60 | #facc15 (金黄) | 吃特殊食物 |
| turn | 25 | 0.02~0.10 | 60 | #67e8f9 (青色) | 蛇转向 |
| death | 50 | 0.05~0.20 | 120 | #ef4444 (红色) | 蛇死亡 |

### 物理模拟

```typescript
// 每帧更新逻辑
particle.position.add(particle.velocity);   // 位移
particle.velocity.y -= 0.0008;              // 重力
particle.velocity.multiplyScalar(0.98);     // 空气阻力

// 颜色渐变（随生命衰减）
const fadeAlpha = 1 - (particle.life / particle.maxLife);
color.multiplyScalar(fadeAlpha);
```

### 渲染方式

- 使用 Three.js `Points` + `BufferGeometry` 高效渲染大量粒子
- `AdditiveBlending` 混合模式实现发光叠加效果
- `vertexColors` 逐粒子着色
- `sizeAttenuation` 近大远小透视

### 组件接口

```typescript
interface ParticleEffectProps {
  position: [number, number, number];  // 3D世界坐标
  type: 'food' | 'special' | 'turn' | 'death';
  isActive: boolean;                    // 是否激活
  onComplete?: () => void;              // 播放完成回调
}
```

---

## 二、蛇身移动残影

### 新增文件

- `frontend/src/components/Game/SnakeTrail.tsx`

### 导出组件

#### SnakeTrail — 移动轨迹残影

在蛇头移动路径上留下半透明残影方块，1秒后自动消失。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| snake | Snake | — | 蛇对象 |
| cellSize | number | — | 格子大小 |
| maxTrailLength | number | 8 | 最大残影数量 |

**残影特性：**
- 几何体：`BoxGeometry(0.8, 0.1, 0.8)` — 扁平方块
- 材质：`MeshStandardMaterial`，透明度 0.3
- 生命周期：1000ms 后自动清理
- 去重：同位置不重复创建残影

#### SnakeGlowTrail — 蛇身发光效果

为蛇身每个节段添加圆柱形发光效果，带呼吸脉动动画。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| snake | Snake | — | 蛇对象 |
| cellSize | number | — | 格子大小 |
| intensity | number | 0.15 | 发光强度 |

**发光特性：**
- 几何体：`CylinderGeometry(0.6, 0.6, height, 16)`
- 自发光：`emissive` 使用蛇身颜色
- 脉动：`opacity = intensity * (1 + sin(time * 3 - delay) * 0.3)`
- 延迟：每个节段延迟 `index * 0.1`，形成波浪效果
- 金属质感：`metalness: 0.8, roughness: 0.2`

---

## 三、3D空间音效

### 新增文件

- `frontend/src/components/Game/Audio3D.tsx`

### 导出组件

#### Audio3D — 音效管理器（占位组件）

```typescript
interface Audio3DProps {
  enabled?: boolean;
}
```

当前为占位实现，返回 `null`。预留后续扩展。

#### SpatialAudio — 3D空间音效

在指定3D位置播放程序化生成的音效，通过 Web Audio API 的 `PannerNode` 实现空间定位。

| 参数 | 类型 | 说明 |
|------|------|------|
| position | [number, number, number] | 3D世界坐标 |
| type | 'move' \| 'turn' \| 'eat' \| 'special' \| 'death' | 音效类型 |
| enabled | boolean | 是否启用 |

**音频信号链：**

```
BufferSource → GainNode → PannerNode → AudioContext.destination
```

**PannerNode 参数：**
- `refDistance`: 5 — 参考距离
- `rolloffFactor`: 2 — 衰减系数

**程序化音效生成：**

| 类型 | 频率 | 时长 | 波形描述 |
|------|------|------|----------|
| move | 800Hz | 0.1s | 正弦波 × 指数衰减(exp(-3t)) |
| turn | 1200Hz | 0.2s | 正弦波 × 指数衰减(exp(-2t)) |
| eat | 600+800Hz | 0.3s | 双频叠加 × 指数衰减(exp(-4t)) |
| special | 1000Hz | 0.4s | 正弦波 × 指数衰减(exp(-1.5t)) |
| death | 200Hz | 0.8s | 低频正弦波 × 指数衰减(exp(-1t)) |

#### AmbientAudio3D — 环境背景音

循环播放10秒的环境音效，由三个频率层叠加：

| 层 | 频率 | 振幅 | 调制 |
|----|------|------|------|
| 基础低频 | 80Hz | 0.05 | 无 |
| 中频 | 200Hz | 0.03 | 0.5Hz 正弦调制 |
| 高频细节 | 800Hz | 0.01 | 2Hz 正弦调制 |

总音量：0.15（较轻柔的背景氛围）

---

## 四、动态光影系统

### 新增文件

- `frontend/src/components/Game/DynamicLighting.tsx`

### 功能说明

根据蛇身长度和位置动态调整场景光照，实现以下效果：

1. **蛇身越长，光照越亮** — 鼓励玩家成长
2. **主光源跟随蛇头** — 聚焦玩家注意力
3. **补光环绕旋转** — 增加场景动感
4. **蛇身点光源** — 让蛇自带发光效果
5. **环境光呼吸** — 微妙的明暗脉动

### 光照参数计算

```typescript
const baseIntensity = 0.95;
const snakeLengthMultiplier = 1 + (totalSnakeLength * 0.02);

const ambientIntensity  = Math.min(baseIntensity * snakeLengthMultiplier, 1.5);
const mainLightIntensity = Math.min(1.8 * snakeLengthMultiplier, 2.5);
const fillLightIntensity = Math.min(0.9 * snakeLengthMultiplier, 1.2);
```

### 光源组成

| 光源 | 类型 | 作用 | 动态行为 |
|------|------|------|----------|
| 环境光 | AmbientLight | 基础照明 | 呼吸效果：`sin(time * 0.5) * 0.05` |
| 主方向光 | DirectionalLight | 主照明+阴影 | 跟随蛇头，预判移动方向，`lerp(0.05)` 平滑过渡 |
| 补光 | DirectionalLight | 填充暗部 | 环绕旋转：`cos(time*0.3), sin(time*0.3)`，强度脉动 |
| 半球光 | HemisphereLight | 天地渐变 | 固定：天色 #67e8f9，地色 #0f172a |
| 蛇头点光 | PointLight | 蛇头照明 | 跟随蛇头位置，强度随蛇长增长 |
| 蛇身点光 | PointLight | 蛇身照明 | 前5节，强度递减 `×(1 - index*0.2)` |

### 主方向光跟随逻辑

```typescript
// 预判蛇的移动方向
const directionVector = getDirectionVector(focusSnake.direction);
const leadDistance = cellSize * (1.5 + focusSnake.body.length * 0.1);

targetPosition = [
  headX + directionVector.x * leadDistance,
  18,
  headZ + directionVector.z * leadDistance
];

// 平滑过渡
directionalLightRef.current.position.lerp(target, 0.05);
```

### 阴影配置

```typescript
<directionalLight
  castShadow
  shadow-mapSize-width={2048}
  shadow-mapSize-height={2048}
  shadow-camera-far={50}
  shadow-camera-left={-20}
  shadow-camera-right={20}
  shadow-camera-top={20}
  shadow-camera-bottom={-20}
/>
```

---

## 五、增强版游戏面板

### 新增文件

- `frontend/src/components/Game/ThreeJSGameBoardEnhanced.tsx`

### 功能说明

在原有 `ThreeJSGameBoard` 基础上集成所有增强效果，作为增强版3D渲染面板。

### 集成的增强效果

| 效果 | 组件 | 位置 |
|------|------|------|
| 动态光照 | `<DynamicLighting>` | 场景根级 |
| 蛇身残影 | `<SnakeTrail>` | 每条蛇 |
| 蛇身发光 | `<SnakeGlowTrail>` | 每条蛇 |
| 蛇头点光 | `<pointLight>` | 每条蛇头部 |
| 粒子效果 | `<ParticleEffect>` | 事件触发 |
| 环境音效 | `<AmbientAudio3D>` | 场景根级 |
| 空间音效 | `<SpatialAudio>` | 每条蛇头部 |
| 特殊食物点光 | `<pointLight>` | 非普通食物 |

### 特殊食物光源颜色

| 食物类型 | 光源颜色 | 强度 | 距离 |
|----------|----------|------|------|
| SPECIAL | #facc15 | 0.5 | 4 |
| SLOW | #38bdf8 | 0.5 | 4 |
| SHIELD | #fbbf24 | 0.5 | 4 |
| SHRINK | #f87171 | 0.5 | 4 |

### 组件接口

```typescript
interface ThreeJSGameBoardEnhancedProps {
  room: Room;
  cellSize?: number;
  viewMode?: 'top' | 'isometric' | 'perspective';
  cameraMode?: CameraMode;
  allowOrbitControls?: boolean;
  focusSnakeId?: string;
  cameraTargetMode?: 'follow' | 'overview';
  onParticleEffect?: (type: string, position: [number, number, number]) => void;
}
```

### 相机焦点计算

增强版面板包含智能相机焦点计算逻辑 `getCameraFocusState()`：

1. **跟随模式**：焦点在蛇头前方，预判移动方向
2. **食物权重**：附近食物影响焦点偏移（tight: 6%, comfort: 12%）
3. **边界约束**：焦点不超出地图边缘 `cellSize * 2` 的边距
4. **可见范围**：根据蛇身长度和食物距离动态调整

---

## 六、文件变更总览

### 新增文件（5个）

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/components/Game/ParticleEffect.tsx` | 粒子爆炸效果 |
| `frontend/src/components/Game/SnakeTrail.tsx` | 蛇身残影 + 发光效果 |
| `frontend/src/components/Game/DynamicLighting.tsx` | 动态光影系统 |
| `frontend/src/components/Game/Audio3D.tsx` | 3D空间音效 + 环境音 |
| `frontend/src/components/Game/ThreeJSGameBoardEnhanced.tsx` | 增强版游戏面板 |

### 依赖关系

```
ThreeJSGameBoardEnhanced
├── DynamicLighting
├── ParticleEffect
├── SnakeTrail
│   └── SnakeGlowTrail
├── Audio3D
│   ├── SpatialAudio
│   └── AmbientAudio3D
├── ThreeJSFood (已有)
├── ThreeJSSnake (已有)
├── ThreeJSFloor (已有)
├── CameraController (已有)
└── OrbitControls (@react-three/drei)
```
