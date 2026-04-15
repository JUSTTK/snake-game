# 贪吃蛇游戏启动指南

本文档说明如何在当前项目中启动前端、后端，以及如何使用现有脚本和 Docker 进行运行。

## 1. 环境要求

- Go 1.21 或更高版本
- Node.js 18 或更高版本
- npm
- Docker 与 Docker Compose

## 2. 推荐启动方式

推荐本地分别启动后端和前端。

原因：

- 日志更清晰
- 问题定位更方便
- 当前多人模式 WebSocket 默认连接 `localhost:8081`

## 3. 本地开发启动

## 3.1 启动后端

在 `snake-game` 目录下执行：

```bat
cd backend
set GOCACHE=d:\code\cc_test\.gocache
set GOMODCACHE=d:\code\cc_test\.gomodcache
set GOPROXY=https://goproxy.cn,direct
go run ./cmd/server
```

默认监听地址：

```text
http://localhost:8081
```

健康检查地址：

```text
http://localhost:8081/health
```

返回示例：

```json
{ "status": "ok" }
```

## 3.2 启动前端

另开一个终端，在 `snake-game` 目录下执行：

```bat
cd frontend
npm install
npm run dev -- --host
```

默认访问地址通常为：

```text
http://localhost:5173
```

## 4. Windows 脚本说明

## 4.1 `start-dev.bat`

功能：

- 设置 Go 缓存目录
- 执行 `go mod tidy`
- 启动后端 `go run ./cmd/server`
- 启动前端 `npm run dev -- --host`

适合：

- 本地日常开发

## 4.2 `run-server.bat`

功能：

- 执行 `go mod tidy`
- 编译为 `server.exe`
- 启动后端服务

适合：

- 单独验证后端服务

## 4.3 `run-frontend.bat`

功能：

- 启动前端开发服务器

适合：

- 单独调试前端页面

## 4.4 `start-prod.bat`

功能：

- 执行 `docker-compose up --build -d`

适合：

- 快速启动容器环境

## 5. Docker 启动

在 `snake-game` 目录下执行：

```bash
docker-compose up --build -d
```

默认访问：

```text
http://localhost
```

## 6. 启动后如何验证

## 6.1 后端验证

访问：

```text
http://localhost:8081/health
```

或执行：

```bash
cd backend
go build ./...
```

## 6.2 前端验证

执行：

```bash
cd frontend
npm run build
```

## 6.3 多人模式联调

建议步骤：

1. 启动后端
2. 启动前端
3. 打开两个浏览器窗口
4. 在两个窗口输入相同的 `roomID`
5. 使用不同的 `playerID` 和 `playerName`
6. 两个玩家进入后点击开始
7. 测试方向键、`WASD`、空格键、暂停按钮、继续按钮、重新开始按钮

## 7. 常见问题

## 7.1 前端连不上后端

检查项：

- 后端是否已启动在 `http://localhost:8081`
- 前端是否从本机访问
- 浏览器控制台是否有 WebSocket 连接错误

当前多人模式 WebSocket 客户端写死为：

```text
ws://localhost:8081/ws
```

## 7.2 Docker 环境访问异常

当前项目存在一个已知风险：

- 后端代码默认端口是 `8081`
- Dockerfile、Nginx、`docker-compose.yml` 使用的是 `8080`

这会导致容器部署时可能端口不一致。

如果你要稳定使用 Docker，建议：

1. 给后端容器设置 `SERVER_PORT=8080`
2. 将前端 WebSocket 地址改成相对路径 `/ws`
3. 确认 Nginx `/api` 和 `/ws` 代理目标与后端监听端口一致

## 7.3 Go 依赖下载慢或失败

可以设置：

```bat
set GOPROXY=https://goproxy.cn,direct
```

## 7.4 前端依赖安装失败

尝试：

```bash
npm cache clean --force
npm install
```

## 8. 当前推荐结论

如果只是开发和联调，推荐直接使用：

- 后端：`go run ./cmd/server`
- 前端：`npm run dev -- --host`

如果要走生产部署，请先处理：

- 后端端口与 Docker/Nginx 端口不一致的问题
- 前端 WebSocket 地址写死的问题
