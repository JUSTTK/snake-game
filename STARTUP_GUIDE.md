# 贪吃蛇游戏启动指南

本文档基于当前仓库实际代码编写，说明如何在本地启动前后端、如何使用现有批处理脚本，以及当前 Docker 部署链路的注意事项。

## 1. 项目组成

- 后端：Go + Gin，负责房间管理、多人游戏状态、WebSocket 通信。
- 前端：React + TypeScript + Vite，负责单机模式界面、多人模式界面和输入交互。
- 多人模式：浏览器通过 WebSocket 连接后端 `ws://localhost:8081/ws`。
- 单机模式：在前端本地运行，不依赖后端。

## 2. 环境要求

- Go 1.21 或更高版本
- Node.js 18 或更高版本
- npm
- Docker 与 Docker Compose（仅在需要容器部署时）

## 3. 推荐启动方式

当前最稳妥的方式是本地分别启动后端和前端。

原因：

- 日志更清晰，便于排查问题
- 多人模式默认直接连接 `localhost:8081`
- 当前 Docker/Nginx 配置仍有一处历史端口不一致问题，需要额外注意

## 4. 本地开发启动

### 4.1 启动后端

在项目根目录 `snake-game` 下执行：

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

正常返回：

```json
{"status":"ok"}
```

补充说明：

- 后端默认端口来自 [config.go](/d:/code/cc_test/snake-game/backend/internal/config/config.go:13)，默认值是 `8081`
- 启动入口在 [main.go](/d:/code/cc_test/snake-game/backend/cmd/server/main.go:11)

### 4.2 启动前端

另开一个终端，在项目根目录 `snake-game` 下执行：

```bat
cd frontend
npm install
npm run dev -- --host
```

开发环境默认访问地址通常为：

```text
http://localhost:5173
```

补充说明：

- Vite 开发服务器已在 [vite.config.ts](/d:/code/cc_test/snake-game/frontend/vite.config.ts:12) 中代理 `/api` 和 `/ws` 到 `localhost:8081`
- 多人模式当前前端 WebSocket 客户端默认直接连接 `ws://localhost:8081/ws`，定义在 [api.ts](/d:/code/cc_test/snake-game/frontend/src/services/api.ts:34)

## 5. 启动后如何使用

### 5.1 单机模式

1. 打开 `http://localhost:5173`
2. 点击“单机模式”
3. 点击“开始游戏”
4. 使用方向键或 `WASD` 控制方向
5. 按空格键暂停或继续

### 5.2 多人模式

1. 确保后端已启动
2. 打开 `http://localhost:5173`
3. 点击“多人模式”
4. 输入相同的 `roomID`
5. 为不同浏览器窗口填写不同的 `playerID` 和 `playerName`
6. 玩家进入房间后点击“开始游戏”
7. 多人模式中蛇会自动持续前进
8. 方向键或 `WASD` 用于改变方向
9. 空格键可暂停或继续
10. 游戏结束后可点击“重新开始”

## 6. Windows 批处理脚本说明

### 6.1 `start-dev.bat`

文件：[start-dev.bat](/d:/code/cc_test/snake-game/start-dev.bat:1)

作用：

- 设置 Go 缓存目录
- 执行 `go mod tidy`
- 启动后端开发服务
- 启动前端开发服务

适合场景：

- 日常本地开发
- 快速联调前后端

### 6.2 `run-server.bat`

文件：[run-server.bat](/d:/code/cc_test/snake-game/run-server.bat:1)

作用：

- 执行 `go mod tidy`
- 编译 `server.exe`
- 启动后端服务

适合场景：

- 单独验证后端是否能正常编译和运行

### 6.3 `run-frontend.bat`

文件：[run-frontend.bat](/d:/code/cc_test/snake-game/run-frontend.bat:1)

作用：

- 启动 Vite 前端开发服务器

适合场景：

- 单独调试前端界面

### 6.4 `start-prod.bat`

文件：[start-prod.bat](/d:/code/cc_test/snake-game/start-prod.bat:1)

作用：

- 执行 `docker-compose up --build -d`

说明：

- 该脚本最后输出“Backend: http://localhost:8080”，但这和当前 `docker-compose.yml` 的 `8081:8081` 不一致
- 实际以后端容器映射为准，当前应优先认为后端暴露在 `http://localhost:8081`

## 7. Docker 启动方式

在项目根目录 `snake-game` 下执行：

```bash
docker-compose up --build -d
```

当前 `docker-compose.yml` 中的映射为：

- 前端：`80:80`
- 后端：`8081:8081`

访问地址：

```text
前端：http://localhost
后端健康检查：http://localhost:8081/health
```

相关文件：

- [docker-compose.yml](/d:/code/cc_test/snake-game/docker-compose.yml:1)
- [frontend/Dockerfile](/d:/code/cc_test/snake-game/frontend/Dockerfile:1)
- [frontend/nginx.conf](/d:/code/cc_test/snake-game/frontend/nginx.conf:1)

## 8. 启动验证

### 8.1 后端验证

访问：

```text
http://localhost:8081/health
```

或者执行：

```bash
cd backend
go build ./...
```

### 8.2 前端验证

执行：

```bash
cd frontend
npm run build
```

### 8.3 多人联调验证

建议步骤：

1. 启动后端
2. 启动前端
3. 打开两个浏览器窗口
4. 使用相同的 `roomID`
5. 使用不同的 `playerID` 和 `playerName`
6. 进入房间后开始游戏
7. 验证自动移动、方向键、空格暂停/继续、重新开始是否正常

## 9. 常见问题

### 9.1 前端无法连接后端

优先检查：

- 后端是否确实启动在 `http://localhost:8081`
- 浏览器控制台是否有 WebSocket 报错
- 前端是否通过本机访问，而不是远程域名访问

当前多人模式前端默认连接地址为：

```text
ws://localhost:8081/ws
```

如果你换了后端地址或端口，需要同步调整前端的 `VITE_WS_URL`，或者修改 [api.ts](/d:/code/cc_test/snake-game/frontend/src/services/api.ts:34)。

### 9.2 Docker 环境下 API 或 WebSocket 代理异常

当前仓库里仍有一个历史配置问题：

- `docker-compose.yml` 中后端容器对外暴露的是 `8081`
- 但 [nginx.conf](/d:/code/cc_test/snake-game/frontend/nginx.conf:13) 里 `/api` 和 `/ws` 代理目标仍写成了 `backend:8080`

这意味着：

- 浏览器直接连 `ws://localhost:8081/ws` 时，多人模式通常还能工作
- 但如果依赖 Nginx 反向代理 `/api` 或 `/ws`，可能出现转发失败

### 9.3 `start-prod.bat` 提示的后端端口不对

这是脚本里的旧提示未更新：

- 脚本显示：`http://localhost:8080`
- 当前 Compose 实际映射：`http://localhost:8081`

### 9.4 Go 依赖下载慢或失败

可以先设置：

```bat
set GOPROXY=https://goproxy.cn,direct
```

### 9.5 npm 安装失败

可以尝试：

```bash
npm cache clean --force
npm install
```

## 10. 当前建议结论

如果你是在开发、联调或验收功能，推荐直接使用：

- 后端：`go run ./cmd/server`
- 前端：`npm run dev -- --host`

如果你要走 Docker 部署，建议先确认以下两点：

1. `frontend/nginx.conf` 中代理目标端口是否需要从 `8080` 改成 `8081`
2. `start-prod.bat` 中展示的后端地址是否需要同步修正
