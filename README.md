# 贪吃蛇 3D 🐍✨

> 经典玩法，全新视角。用 Three.js 打造的沉浸式贪吃蛇体验。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.160-000000?logo=three.js)](https://threejs.org/)
[![Go](https://img.shields.io/badge/Go-1.21-00ADD8?logo=go)](https://golang.org/)

---

## 🎯 项目特色

这不是你记忆中的那个 2D 网格贪吃蛇。在这里：

- **真·3D 渲染**：使用 Three.js 构建完整的三维游戏世界
- **三视角系统**：等轴视角、俯视图、透视跟随，一键切换
- **智能相机跟随**：相机能预判你的前进方向，还会悄悄帮你找食物
- **两种相机模式**：「舒适模式」给你开阔视野，「紧跟模式」提供沉浸体验
- **多人实时对战**：通过 WebSocket 实现真正意义上的多人同场竞技，状态由后端权威推进
- **5 种食物系统**：普通 / 特殊 / 减速 / 护盾 / 缩短，按蛇身长度加权刷新，策略性十足
- **护盾免死机制**：吃到护盾食物可抵消一次致命碰撞（含撞墙、自撞、对撞）
- **复古 8-bit 音效**：游戏开始、吃食物、转向、失败，每个动作都有声音
- **动态背景音乐**：游戏进行中自动播放轻快的背景旋律
- **可配置化运行**：地图尺寸、tick 间隔、最大人数、允许来源等均可通过环境变量调整
- **安全与限流**：WebSocket Origin 校验、消息速率限制，防止 CSWSH 与洪水攻击
- **成就系统**：单机模式记录累计进食、护盾使用、零失误等成就，持久化到 localStorage

## 🎮 游戏玩法

### 单机模式 🧍

一个人，一条蛇，与自己的速度竞赛。

**操作方式：**
- `↑` `↓` `←` `→` 或 `W` `A` `S` `D` — 改变蛇的移动方向（可在设置中切换/自定义按键）
- `空格键` — 暂停/继续游戏

**游戏规则：**
- 吃到普通食物得 10 分，蛇身变长
- 吃到特殊食物得 50 分（旋转发光的金色八面体）
- 撞墙或撞到自己 — 游戏结束（若有护盾则抵消一次）
- 游戏会记录你的当前分数和最高分，并解锁成就

### 多人模式 👥

和朋友们同一个房间里一决高下。

**玩法亮点：**
- 所有玩家共享同一个房间、同一块地图
- 蛇会自动持续前进，你只需要控制方向（MOVE 仅改变朝向，服务端游戏循环按 tick 推进全体蛇）
- 房间状态由后端统一管理，保证公平性
- 支持最多 4 人同场（可通过 `MAX_PLAYERS_PER_ROOM` 调整）
- 头对头正面相撞**双双死亡**；撞到他人蛇身也会死亡（护盾可救一次）
- 游戏结束后可以一键重新开始

**怎么开始：**
1. 确保 Go 后端服务已启动
2. 多个浏览器窗口分别进入「多人模式」
3. 使用相同的 `roomID` 进入同一个房间
4. 每个玩家填写不同的 `playerID` 和 `playerName`
5. 点击「开始游戏」（需至少 2 名玩家）
6. 使用方向键控制，用空格键暂停

### 5 种食物系统 🍎

| 食物 | 类型 | 效果 | 解锁条件（蛇长 ≥） |
|------|------|------|---------------------|
| 粉红苹果 | `NORMAL` | +10 分，蛇身 +1 | — |
| 金色八面体 | `SPECIAL` | +50 分，蛇身 +5 | — |
| 减速药水 | `SLOW` | +20 分，自身减速（隔 tick 移动）持续一段时间 | 4 |
| 护盾 | `SHIELD` | +30 分，获得一次性死亡免疫 | 5 |
| 缩短药水 | `SHRINK` | +20 分，蛇身缩短 | 6 |

刷新采用加权随机，高级食物仅当蛇身足够长时才有概率出现；前后端使用同一套刷新逻辑。

## 🗂️ 项目结构

```
snake-game/
├── backend/                    # Go 后端服务
│   ├── cmd/server/            # 服务入口
│   │   └── main.go            # 主程序
│   ├── internal/              # 内部业务逻辑
│   │   ├── config/            # 配置管理
│   │   ├── handlers/         # HTTP 处理器
│   │   ├── models/            # 数据模型
│   │   └── services/         # 业务服务（含 WebSocket）
│   ├── go.mod                # Go 依赖管理
│   └── Dockerfile            # Docker 镜像构建
│
├── frontend/                  # React 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── Common/       # 通用组件
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── ControlPanel.tsx
│   │   │   │   ├── ScoreBoard.tsx
│   │   │   │   └── ViewSwitcher.tsx
│   │   │   ├── Game/         # 游戏核心组件
│   │   │   │   ├── CameraController.tsx    # 智能相机控制器
│   │   │   │   ├── CameraModeSelector.tsx  # 相机模式切换
│   │   │   │   ├── GameUI.tsx             # 多人游戏主界面
│   │   │   │   ├── MultiViewBoard.tsx     # 多视图棋盘
│   │   │   │   ├── ThreeJSFloor.tsx       # 3D 地面
│   │   │   │   ├── ThreeJSFood.tsx        # 3D 食物
│   │   │   │   ├── ThreeJSGameBoard.tsx   # 3D 游戏棋盘
│   │   │   │   └── ThreeJSSnake.tsx       # 3D 蛇
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── SinglePlayerGame.tsx       # 单机游戏
│   │   ├── hooks/             # React 自定义 Hooks
│   │   ├── services/          # 服务层
│   │   │   ├── api.ts        # HTTP & WebSocket API
│   │   │   └── soundManager.ts  # 音效管理器
│   │   ├── store/             # 状态管理
│   │   ├── types/             # TypeScript 类型定义
│   │   ├── utils/             # 工具函数
│   │   ├── App.tsx            # 应用主入口
│   │   └── main.tsx           # React 挂载点
│   ├── public/                # 静态资源
│   │   └── sounds/            # 8-bit 音效文件
│   │       ├── eat_normal.wav
│   │       ├── eat_special.wav
│   │       ├── game_over.wav
│   │       └── game_start.wav
│   ├── package.json           # npm 依赖
│   ├── vite.config.ts         # Vite 配置
│   ├── tailwind.config.js     # Tailwind CSS 配置
│   └── Dockerfile            # Docker 镜像构建
│
├── docker-compose.yml         # Docker Compose 编排
├── README.md                  # 项目说明（本文档）
├── STARTUP_GUIDE.md          # 详细启动指南
└── TEST_GUIDE.md             # 测试指南
```

## 🛠️ 技术栈

### 后端
| 技术 | 用途 |
|------|------|
| Go 1.21 | 核心编程语言 |
| Gin | HTTP Web 框架 |
| `github.com/gorilla/websocket` | WebSocket 通信 |
| Docker | 容器化部署 |

### 前端
| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Three.js | 3D 渲染引擎 |
| @react-three/fiber | React + Three.js 集成 |
| @react-three/drei | Three.js 辅助组件库 |
| Tailwind CSS | 样式框架 |
| Zustand | 状态管理 |
| React Router | 路由管理 |
| Vitest + Playwright | 单元测试 + E2E 测试 |

## 🚀 快速开始

### 方式一：本地开发（推荐）

1. **启动后端**
```bash
cd backend
go run ./cmd/server
```

2. **启动前端**
```bash
cd frontend
npm install
npm run dev -- --host
```

3. **打开浏览器**
- 单机模式：直接开始玩
- 多人模式：用相同 roomID 多开窗口一起玩

### 方式二：Docker 部署

```bash
docker-compose up --build -d
```

访问：
- 前端：http://localhost
- 后端健康检查：http://localhost:8081/health

> 前端镜像采用多阶段构建（构建阶段 `npm run build`，运行阶段 nginx 托管），后端在 release 模式下可选地内嵌并托管前端 `dist/`。

## ⚙️ 配置（环境变量）

后端通过环境变量配置运行参数，均有默认值，开箱即用：

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `SERVER_PORT` | `8081` | 后端监听端口 |
| `GAME_UPDATE_INTERVAL` | `150` | 游戏循环 tick 间隔（毫秒） |
| `MAX_PLAYERS_PER_ROOM` | `4` | 单房间最大玩家数 |
| `MAP_WIDTH` | `20` | 地图宽度（格） |
| `MAP_HEIGHT` | `15` | 地图高度（格） |
| `ALLOWED_ORIGINS` | `localhost:5173,localhost:8081,localhost:80` | 允许的 WebSocket Origin（逗号分隔，CSWSH 防护） |

前端开发态通过 Vite 代理 `/api` 与 `/ws` 到 `localhost:8081`；生产态用 `VITE_WS_URL` 指定 WebSocket 地址。

## 📡 API 接口

### HTTP 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/rooms` | 获取所有房间 |
| POST | `/api/rooms` | 创建新房间 |
| POST | `/api/rooms/:id/join` | 加入指定房间 |
| GET | `/health` | 健康检查 |

### WebSocket 连接

```
ws://localhost:8081/ws?room_id=xxx&player_id=xxx&player_name=xxx
```

### 消息类型

**客户端 → 服务端：**
```json
{ "type": "PING" }                      // 心跳探测，服务端回 PONG
{ "type": "MOVE", "data": "UP" }        // 改变方向（仅朝向，不直接移动）
{ "type": "START_GAME" }                // 开始游戏（需 ≥2 名玩家）
{ "type": "PAUSE" }                     // 暂停
{ "type": "RESUME" }                    // 继续
{ "type": "RESTART_GAME" }              // 重新开始
{ "type": "LEAVE" }                     // 离开房间
```

**服务端 → 客户端：**
```json
{ "type": "GAME_STATE", "data": {...} }  // 游戏状态广播（每 tick + 状态变更）
{ "type": "PONG", "data": "pong" }       // 心跳响应
{ "type": "ERROR", "data": "..." }       // 错误信息
```

## 🎨 游戏视觉亮点

### 3D 蛇
- 蛇头有会转动的小眼睛
- 身体从蛇头到尾部逐渐变细
- 使用 `RoundedBox` 实现圆角方块
- 蛇头带有微弱的发光效果

### 食物系统
- **普通食物（NORMAL）**：粉红球体 + 绿色小叶子，轻微浮动
- **特殊食物（SPECIAL）**：金色八面体，旋转发光，点光源照亮周围
- **减速 / 护盾 / 缩短**：各有独立几何体与材质，便于一眼识别
- 所有食物都有自发光材质

### 光照与阴影
- 动态方向光跟随相机移动
- 双色调光照（主光 + 青色补光）
- 环境光与半球光配合
- 所有物体都投射和接收阴影

### 智能相机
- 预判蛇的移动方向，相机提前转向
- 自动计算与最近食物的距离，相机视角微妙向食物倾斜
- 根据蛇身长度动态调整视野范围
- 平滑阻尼，镜头移动如丝般顺滑

## 🔊 音效系统

所有音效采用 8-bit 复古风格，使用 Python + NumPy 生成：

| 音效 | 文件 | 触发条件 |
|------|------|----------|
| 开始游戏 | `game_start.wav` | 点击开始按钮 |
| 普通食物 | `eat_normal.wav` | 吃到粉红苹果 |
| 特殊食物 | `eat_special.wav` | 吃到金色食物 |
| 游戏结束 | `game_over.wav` | 撞墙或自撞 |

**背景音乐：**
- 使用 Web Audio API 实时合成
- 轻快的 8-bit 循环旋律
- 游戏暂停时自动停止
- 游戏进行中持续播放

## 📊 相机模式详解

### 视角类型

| 视角 | 特点 |
|------|------|
| **俯视图** | 完全垂直向下，适合全局规划 |
| **等轴视角** | 经典游戏视角，平衡全局与细节 |
| **透视跟随** | 低角度沉浸视角，有立体纵深感 |

### 相机模式

| 模式 | 特点 |
|------|------|
| **舒适模式** | 视野开阔，适合初学者 |
| **紧跟模式** | 视野较紧，沉浸感更强 |

## 🔒 安全与稳定性

后端针对多人对战场景做了多项加固：

- **WebSocket Origin 校验**：基于 `ALLOWED_ORIGINS` 白名单校验连接来源，防止跨站 WebSocket 劫持（CSWSH）；无 Origin 头的非浏览器客户端放行。
- **消息速率限制**：MOVE 消息每秒上限 10 次；START/RESTART/PAUSE/RESUME 状态变更冷却 1 秒，防止洪水攻击与状态抖动。
- **写泵 + 缓冲通道**：每个连接由独立 `writePump` 串行化写操作，带 30s Ping / 60s 读超时；慢客户端的广播帧会被丢弃而非阻塞，单卡顿连接不会冻结整个房间。
- **连接生命周期管理**：加入房间失败 / LEAVE / 读错误等所有退出路径都经幂等 `closeClient` 清理，杜绝连接泄漏。
- **状态快照防竞态**：广播与 REST 序列化使用锁内深拷贝快照，避免与游戏循环并发修改切片导致的 panic。
- **食物生成防死循环**：生成器有 100 次尝试上限并 fallback 到普通食物；地图接近填满时不会卡死。

## 🧪 测试

| 层级 | 工具 | 范围 |
|------|------|------|
| 后端单元测试 | `go test` | 蛇移动、碰撞裁决、食物生成、护盾/减速、房间管理、连接生命周期、速率限制 |
| 后端竞态 | `go test -race` | 并发读写、广播快照 |
| 后端 E2E | `go test`（`e2e/`） | 真实 HTTP + WebSocket 握手与 PONG 流程 |
| 前端单元测试 | Vitest + happy-dom | store 逻辑、类型守卫、组件渲染、WS 生命周期 |
| 前端 E2E | Playwright | 构建后的端到端 UI 流程 |

```bash
# 后端
cd backend && go vet ./... && go test ./... && go test -race ./...

# 前端
cd frontend && npm run lint && npx tsc --noEmit && npm test && npm run build
```

CI（`.github/workflows/ci-cd.yml`）在每次 push/PR 时执行上述检查，通过后构建并推送 Docker 镜像至 GHCR，再部署到自托管 runner。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**开始你的 3D 贪吃蛇冒险吧！** 🐍🎮✨