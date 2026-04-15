# 贪吃蛇游戏

一个基于 Go 后端和 React 前端的贪吃蛇项目，包含单机模式和多人模式。

## 项目特点

- 单机模式：前端本地运行游戏逻辑
- 多人模式：Go 后端维护房间和游戏状态，前端通过 WebSocket 同步
- 画面使用 Canvas 渲染
- 支持暂停、继续、重新开始、离开房间
- 多人模式下方向键或 `WASD` 每按一次前进一步
- 多人模式下空格键可暂停或继续

## 技术栈

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

### 部署

- Docker
- Nginx
- Docker Compose

## 当前目录结构

```text
snake-game/
├─ backend/
│  ├─ cmd/server/main.go
│  ├─ internal/
│  │  ├─ config/
│  │  ├─ handlers/
│  │  ├─ models/
│  │  └─ services/
│  ├─ Dockerfile
│  ├─ go.mod
│  └─ go.sum
├─ frontend/
│  ├─ src/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/
│  │  ├─ store/
│  │  ├─ types/
│  │  ├─ App.tsx
│  │  └─ main.tsx
│  ├─ Dockerfile
│  ├─ nginx.conf
│  ├─ package.json
│  └─ vite.config.ts
├─ docker-compose.yml
├─ README.md
├─ STARTUP_GUIDE.md
├─ run-frontend.bat
├─ run-server.bat
├─ start-dev.bat
└─ start-prod.bat
```

## 运行方式

## 本地开发

### 1. 启动后端

```bat
cd backend
set GOCACHE=d:\code\cc_test\.gocache
set GOMODCACHE=d:\code\cc_test\.gomodcache
set GOPROXY=https://goproxy.cn,direct
go run ./cmd/server
```

默认地址：

```text
http://localhost:8081
```

### 2. 启动前端

```bat
cd frontend
npm install
npm run dev -- --host
```

默认地址通常为：

```text
http://localhost:5173
```

## Windows 脚本

- `start-dev.bat`：同时启动后端和前端开发环境
- `run-server.bat`：单独编译并启动后端
- `run-frontend.bat`：单独启动前端开发服务器
- `start-prod.bat`：使用 Docker Compose 启动容器环境

## Docker 部署

```bash
docker-compose up --build -d
```

默认访问：

```text
http://localhost
```

## 游戏说明

## 单机模式

- 在前端本地运行
- 方向键或 `WASD` 控制方向
- 空格键暂停或继续
- 撞墙或撞到自己会结束
- 分数与最高分显示在页面上

## 多人模式

- 输入 `roomID`、`playerID`、`playerName` 后进入房间
- 相同 `roomID` 的玩家会进入同一房间
- 至少 2 名玩家后才可开始
- 方向键或 `WASD` 每按一次前进一步
- 空格键暂停或继续
- 吃到食物后得分并增长
- 存活到最后的玩家获胜

## API 与通信

## HTTP 接口

- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:id/join`
- `GET /health`

## WebSocket

连接格式：

```text
ws://localhost:8081/ws?room_id=xxx&player_id=xxx&player_name=xxx
```

客户端发送：

```json
{ "type": "MOVE", "data": "UP" }
{ "type": "START_GAME" }
{ "type": "PAUSE" }
{ "type": "RESUME" }
{ "type": "RESTART_GAME" }
{ "type": "LEAVE" }
```

服务端发送：

```json
{
  "type": "GAME_STATE",
  "data": {
    "room_id": "test-room",
    "game_state": "PLAYING",
    "players": [],
    "foods": [],
    "map_size": { "x": 20, "y": 15 },
    "player_count": 2
  }
}
```

## 注意事项

### 1. 本地开发是当前最稳的运行方式

当前前端 WebSocket 地址写死为：

```text
ws://localhost:8081/ws
```

所以本地联调最稳定。

### 2. Docker 配置存在端口对齐风险

当前代码默认后端端口是 `8081`，但 Docker 和 Nginx 配置使用的是 `8080`。

如果你要正式走 Docker 部署，建议至少处理：

- 为后端容器显式设置 `SERVER_PORT=8080`
- 将前端 WebSocket 地址改为相对路径 `/ws`
- 确保 Nginx 反向代理端口与后端实际监听端口一致

## 开发验证

### 后端

```bash
cd backend
go build ./...
```

### 前端

```bash
cd frontend
npm run build
```

## 补充文档

- 设计文档：`贪吃蛇游戏设计文档_Go版.md`
- 启动指南：`STARTUP_GUIDE.md`
