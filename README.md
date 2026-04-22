# 贪吃蛇游戏 🐍

一条蛇，一块棋盘，两种节奏。

这里既有适合一个人安静刷分的单机模式，也有需要多人同场博弈的房间模式。前端负责把每一次转向、每一步移动、每一口吃到食物的瞬间画出来；后端负责让多人对局真正“跑起来”。

## 🎮 这项目现在能玩什么

### 单机模式 🧍

适合想立刻开一局的人。

- 打开页面就能开始
- 游戏逻辑运行在前端本地
- 方向键或 `WASD` 控制方向
- 空格键暂停或继续
- 撞墙或撞到自己后结束
- 页面会记录当前分数和最高分

### 多人模式 👥

适合两个人以上一起进房间抢节奏。

- 玩家通过 `roomID` 进入同一个房间
- 后端统一维护蛇身、食物、房间状态和胜负判定
- 点击“开始游戏”后，蛇会自动持续前进
- 方向键或 `WASD` 改变方向
- 空格键可以暂停或继续
- 游戏结束后支持“重新开始”

## ✨ 为什么它和普通练手项目不太一样

- 不只是前端动画，而是带真实后端状态同步的多人模式
- 多人模式的蛇不是“按一下走一下”，而是开始后自动持续运动
- 支持开始、暂停、继续、重新开始、离开房间这些完整流程
- 前端和后端职责分明，适合拿来做联调、练 WebSocket、练状态管理

## 🧰 技术栈

### 后端

- Go 1.21
- Gin
- `golang.org/x/net/websocket`

### 前端

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand

### 部署相关

- Docker
- Nginx
- Docker Compose

## 🗂️ 目录结构

```text
snake-game/
|-- backend/
|   |-- cmd/server/
|   |-- internal/
|   |   |-- config/
|   |   |-- handlers/
|   |   |-- models/
|   |   `-- services/
|   |-- Dockerfile
|   `-- go.mod
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- services/
|   |   |-- store/
|   |   `-- types/
|   |-- Dockerfile
|   |-- nginx.conf
|   `-- package.json
|-- docker-compose.yml
|-- README.md
|-- STARTUP_GUIDE.md
`-- TEST_GUIDE.md
```

## 🚀 三步跑起来

### 1. 启动后端

在项目根目录执行：

```bat
cd backend
set GOCACHE=d:\code\cc_test\.gocache
set GOMODCACHE=d:\code\cc_test\.gomodcache
set GOPROXY=https://goproxy.cn,direct
go run ./cmd/server
```

后端默认地址：

```text
http://localhost:8081
```

### 2. 启动前端

另开一个终端执行：

```bat
cd frontend
npm install
npm run dev -- --host
```

前端默认地址：

```text
http://localhost:5173
```

### 3. 打开浏览器开始玩

- 单机模式：直接进入就能开始
- 多人模式：两个窗口使用同一个 `roomID`，不同的 `playerID` 和 `playerName`

## 🔌 多人模式怎么通信

### HTTP 接口

- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:id/join`
- `GET /health`

### WebSocket

连接格式：

```text
ws://localhost:8081/ws?room_id=xxx&player_id=xxx&player_name=xxx
```

客户端常用消息：

```json
{ "type": "MOVE", "data": "UP" }
{ "type": "START_GAME" }
{ "type": "PAUSE" }
{ "type": "RESUME" }
{ "type": "RESTART_GAME" }
{ "type": "LEAVE" }
```

服务端会持续广播最新 `GAME_STATE`，前端根据它刷新棋盘、玩家状态和按钮状态。

## 🖥️ Windows 下现成可用的脚本

- `start-dev.bat`：同时启动前后端开发环境
- `run-server.bat`：编译并启动后端
- `run-frontend.bat`：启动前端开发服务器
- `start-prod.bat`：执行 `docker-compose up --build -d`

## 👍 当前最推荐的使用方式

如果你是来开发、联调或者验收功能，最推荐直接使用本地启动：

- 后端：`go run ./cmd/server`
- 前端：`npm run dev -- --host`

原因很简单：

- 日志最清楚
- 问题最好定位
- 当前多人模式默认就是连 `localhost:8081`

## 🐳 Docker 现在能不能直接用

可以用，但需要带着“已知风险”去用。

当前仓库里存在一处历史配置差异：

- `docker-compose.yml` 中后端映射的是 `8081:8081`
- `frontend/nginx.conf` 里 `/api` 和 `/ws` 代理目标仍写成 `backend:8080`

这意味着本地开发模式最稳，而 Docker 跑通前最好先确认代理端口是否要改成 `8081`。

## ✅ 快速自检

后端健康检查：

```text
http://localhost:8081/health
```

前端构建验证：

```bash
cd frontend
npm run build
```

如果你想快速验证多人模式，最简单的方法是：

1. 启动后端
2. 启动前端
3. 打开两个浏览器窗口
4. 输入相同的 `roomID`
5. 点击开始游戏
6. 测试自动移动、方向切换、空格暂停和重新开始

## 📚 相关文档

- [启动指南](./STARTUP_GUIDE.md)
- [测试指南](./TEST_GUIDE.md)
- [设计文档](../贪吃蛇游戏设计文档_Go版.md)

如果你是第一次接手这个项目，建议先看 `README` 了解全貌，再看 `STARTUP_GUIDE.md` 按步骤启动，最后用 `TEST_GUIDE.md` 做功能回归。
