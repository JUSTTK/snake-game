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
- **多人实时对战**：通过 WebSocket 实现真正意义上的多人同场竞技
- **复古 8-bit 音效**：游戏开始、吃食物、转向、失败，每个动作都有声音
- **动态背景音乐**：游戏进行中自动播放轻快的背景旋律
- **发光食物系统**：普通食物是粉红苹果，特殊食物会旋转发光，吃了加分更多

## 🎮 游戏玩法

### 单机模式 🧍

一个人，一条蛇，与自己的速度竞赛。

**操作方式：**
- `↑` `↓` `←` `→` 或 `W` `A` `S` `D` — 改变蛇的移动方向
- `空格键` — 暂停/继续游戏

**游戏规则：**
- 吃到食物（粉红苹果）得 1 分，蛇身变长
- 吃到特殊食物（旋转发光的金色八面体）得 5 分
- 撞墙或撞到自己 — 游戏结束
- 游戏会记录你的当前分数和最高分

### 多人模式 👥

和朋友们同一个房间里一决高下。

**玩法亮点：**
- 所有玩家共享同一个房间、同一块地图
- 蛇会自动持续前进，你只需要控制方向
- 房间状态由后端统一管理，保证公平性
- 支持任意数量玩家同时加入（理论上）
- 游戏结束后可以一键重新开始

**怎么开始：**
1. 确保 Go 后端服务已启动
2. 多个浏览器窗口分别进入「多人模式」
3. 使用相同的 `roomID` 进入同一个房间
4. 每个玩家填写不同的 `playerID` 和 `playerName`
5. 点击「开始游戏」
6. 使用方向键控制，用空格键暂停

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
| `golang.org/x/net/websocket` | WebSocket 通信 |
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
{ "type": "MOVE", "data": "UP" }      // 改变方向
{ "type": "START_GAME" }               // 开始游戏
{ "type": "PAUSE" }                    // 暂停
{ "type": "RESUME" }                   // 继续
{ "type": "RESTART_GAME" }             // 重新开始
{ "type": "LEAVE" }                    // 离开房间
```

**服务端 → 客户端：**
```json
{ "type": "GAME_STATE", "data": {...} }  // 游戏状态更新
```

## 🎨 游戏视觉亮点

### 3D 蛇
- 蛇头有会转动的小眼睛
- 身体从蛇头到尾部逐渐变细
- 使用 `RoundedBox` 实现圆角方块
- 蛇头带有微弱的发光效果

### 食物系统
- **普通食物**：粉红球体 + 绿色小叶子，轻微浮动
- **特殊食物**：金色八面体，旋转发光，点光源照亮周围
- 两种食物都有自发光材质

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

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**开始你的 3D 贪吃蛇冒险吧！** 🐍🎮✨