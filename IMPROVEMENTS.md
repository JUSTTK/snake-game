# 贪吃蛇 3D 项目改进建议

> 基于对代码库的全面分析，涵盖代码质量、安全性、架构、测试和开发体验。

**状态核对：2026-10-09 逐条对照当前代码复核。** 下面各条的正文保留的是**初版分析原文**（可能已过时，例如其中的行号与示例代码），**以紧跟标题的 `**状态：**` 一行为当前结论**：

- ✅ **已修复** — 当前代码已解决
- 🟡 **部分修复** — 只解决了一部分，仍有余项
- ⬜ **仍未处理** — 与初版分析一致

| # | 问题 | 状态 |
|---|------|------|
| 1 | WebSocket 允许所有来源 | ✅ |
| 2 | 配置文件从未生效 | ✅ |
| 3 | 食物生成可能无限循环 | ✅ |
| 4 | 无速率限制 | 🟡 |
| 5 | ThreeJSGameBoard 文件几乎完全重复 | ⬜ |
| 6 | 食物配置重复出现在 5 个位置 | 🟡 |
| 7 | 无优雅关闭 | ✅ |
| 8 | WebSocket 无读超时 | ✅ |
| 9 | 乐观 UI 更新无服务端确认 | ⬜ |
| 10 | Docker 容器以 root 运行 | ⬜ |
| 11 | 核心模块无测试覆盖 | 🟡 |
| 12 | README 食物分数与实际不符 | ✅ |
| 13 | 已提交二进制文件和无关目录 | ✅ |
| 14 | gorilla/websocket 已归档 | ⬜ |
| 15 | 无代码格式化工具 | ⬜ |
| 16 | 批处理脚本仅 Windows | ⬜ |
| 17 | 玩家可以加入正在进行的游戏 | ⬜ |
| 18 | CI 无覆盖率阈值 | ⬜ |
| 19 | 无后端代码静态分析 | 🟡 |
| 20 | 玩家断线重连后状态丢失 | 🟡 |
| 21 | 其他小问题 | 🟡 |

小计：✅ 7 项 · 🟡 6 项 · ⬜ 8 项

---

## 🔴 高优先级

### 1. WebSocket 允许所有来源（安全漏洞）

**状态：** ✅ 已修复 — `CheckOrigin` 现在走 `isOriginAllowed()`，与 `config.AllowedOrigins`（`ALLOWED_ORIGINS` 环境变量）比对；`Origin` 为空时放行（非浏览器客户端）。

**文件：** `backend/internal/handlers/http_websocket.go:15-19`

```go
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true  // 任何来源都能连接
    },
}
```

**问题：** 这导致跨站 WebSocket 劫持（CSWSH）。任何恶意网站都可以打开 WebSocket 连接到游戏服务器，加入房间、注入 MOVE 指令、开始/重启游戏。

**建议修复：**
```go
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        allowedOrigins := []string{
            "http://localhost:5173",
            "http://localhost:80",
        }
        for _, allowed := range allowedOrigins {
            if origin == allowed {
                return true
            }
        }
        return false
    },
}
```

---

### 2. 配置文件从未生效

**状态：** ✅ 已修复 — `NewGameService(cfg)` 已接收配置并填入 `GameConfig`。另外补了非法值兜底：`GAME_UPDATE_INTERVAL`/`MAP_WIDTH` 等填 0、负数或非数字时回落到默认值并打日志（此前会 panic）。

**文件：** `backend/cmd/server/main.go:39-42` + `backend/internal/services/game.go:31-36`

```go
// main.go — 加载了配置但未使用
cfg := config.Load()
gameService := services.NewGameService()  // cfg 没传进去

// game.go — NewGameService 全部硬编码
func NewGameService() *GameService {
    return &GameService{
        config: &GameConfig{
            UpdateInterval: 150,   // 硬编码
            MaxPlayers:     4,     // 硬编码
            MapWidth:       20,    // 硬编码
            MapHeight:      15,    // 硬编码
        },
    }
}
```

**问题：** `config.go` 定义的 `GAME_UPDATE_INTERVAL`、`MAX_PLAYERS_PER_ROOM` 等环境变量完全无效。`Room.AddPlayer` 的4人限制也是单独硬编码在 `room.go:50`。

**建议修复：**
```go
func NewGameService(cfg *config.Config) *GameService {
    return &GameService{
        config: &GameConfig{
            UpdateInterval: cfg.GameUpdateInterval,
            MaxPlayers:     cfg.MaxPlayersPerRoom,
            MapWidth:       20,
            MapHeight:      15,
        },
    }
}
```

---

### 3. 食物生成可能无限循环

**状态：** ✅ 已修复 — `GenerateRandomFoodWithSnakeLen` 上限 100 次尝试，`GenerateRandomFoodAvoidProximity` 上限 50 次，两者都有兜底返回普通食物。

**文件：** `backend/internal/models/food.go:51-71`

```go
func GenerateRandomFoodWithSnakeLen(mapSize Point, occupiedPoints []Point, maxSnakeLen int) *Food {
    for {  // ← 无上限，可能死循环
        pos := Point{
            X: rand.Intn(mapSize.X),
            Y: rand.Intn(mapSize.Y),
        }
        // ... 检查是否被占用，如果被占用就 continue
    }
}
```

**问题：** 20×15=300格的地图，4条蛇不断增长后可能占满所有格子，导致无限循环。

**对比：** 前端版本 `SinglePlayerGame.tsx:150` 有50次尝试限制+兜底逻辑，后端却没有。

**建议修复：**
```go
func GenerateRandomFoodWithSnakeLen(mapSize Point, occupiedPoints []Point, maxSnakeLen int) *Food {
    for attempt := 0; attempt < 100; attempt++ {
        pos := Point{
            X: rand.Intn(mapSize.X),
            Y: rand.Intn(mapSize.Y),
        }
        occupied := false
        for _, p := range occupiedPoints {
            if p == pos {
                occupied = true
                break
            }
        }
        if !occupied {
            foodType := pickFoodType(maxSnakeLen)
            return NewFood(pos, foodType)
        }
    }
    // 兜底：返回普通食物（即使覆盖已有位置也比死循环好）
    pos := Point{X: rand.Intn(mapSize.X), Y: rand.Intn(mapSize.Y)}
    return NewFood(pos, NormalFood)
}
```

---

### 4. 无速率限制

**状态：** 🟡 部分修复 — 每连接限流已就位：`maxMovesPerSecond = 10`（`checkMoveRate`）、状态变更 1 秒冷却（`checkStateChangeCooldown`）、入站帧上限 4096 字节。**仍缺**：房间创建无每 IP 限制，`POST /api/rooms` 与 WebSocket 自动建房都能无限创建房间。

**文件：** `backend/internal/handlers/http_websocket.go:143-149`

```go
case "MOVE":
    if direction, ok := msg.Data.(string); ok {
        if h.gameService.MoveSnake(roomID, playerID, models.Direction(direction)) {
            h.sendGameStateToRoom(roomID)
        }
    }
```

**问题：** MOVE 消息没有速率限制。客户端可以每秒发送数千条消息，导致锁竞争和广播风暴。房间创建（第86-88行）也没有限制，攻击者可以创建无限房间。

**建议修复：**
- 对 MOVE 消息实施每连接每秒最多10次的限制（令牌桶）
- 对房间创建实施每IP限制
- 考虑使用 `gin-contrib/limiter` 或自行实现

---

## 🟡 中优先级

### 5. ThreeJSGameBoard 文件几乎完全重复

**状态：** ⬜ 仍未处理 — 两个文件都还在（286 行 / 343 行），`DIRECTION_VECTORS` 等常量各自定义一份。

**文件：**
- `frontend/src/components/Game/ThreeJSGameBoard.tsx`（286行）
- `frontend/src/components/Game/ThreeJSGameBoardEnhanced.tsx`（344行）

**问题：** 两个文件是近乎相同的副本。相同的内容包括：
- `DIRECTION_VECTORS` 常量定义
- `getTrackedSnake`、`getCameraFocusState`、`clamp` 辅助函数
- 大量注释掉的代码块（约60行）
- 渲染逻辑高度重复

**建议修复：** 让 Enhanced 版本继承基础版本，或通过 props（如 `enableEffects`）控制差异部分，合并为单一组件。

---

### 6. 食物配置重复出现在5个位置

**状态：** 🟡 部分修复 — 前端颜色/分数已统一到 `types/game.ts` 的 `FOOD_CONFIG`（`SinglePlayerGame`、`GuidePanel` 都引用它，两个 Board 文件里的内联颜色映射已消失）。**仍缺**：刷食物的权重表还是两份 —— 前端 `SinglePlayerGame.tsx:64` 的 `pickFoodType` 与后端 `food.go` 的 `FoodSpawnTable` 各维护一套。

| 位置 | 内容 |
|------|------|
| `frontend/src/types/game.ts:49-55` | `FOOD_CONFIG`（颜色、发光色、分数、标签） |
| `backend/internal/models/food.go:39-45` | `FoodSpawnTable`（类型、权重、最小蛇长） |
| `frontend/src/components/SinglePlayerGame.tsx:64-84` | `pickFoodType`（权重表） |
| ~~`frontend/src/components/Game/ThreeJSGameBoard.tsx:201-205`~~ | ~~内联颜色映射~~ ✅ 已消除 |
| ~~`frontend/src/components/Game/ThreeJSGameBoardEnhanced.tsx:258-263`~~ | ~~相同的内联颜色映射~~ ✅ 已消除 |

**问题：** 修改食物参数需要同时改5个地方，容易遗漏导致前后端不一致。

**建议修复：**
- 前端：所有食物配置统一引用 `types/game.ts` 中的 `FOOD_CONFIG`
- 后端：将 `FoodSpawnTable` 作为唯一来源
- 前端 `SinglePlayerGame` 复用 `types/game.ts` 的类型和配置

---

### 7. 无优雅关闭

**状态：** ✅ 已修复 — `main.go` 用 `signal.NotifyContext(SIGINT, SIGTERM)` + 显式 `http.Server`（`ReadHeaderTimeout` 10s / `IdleTimeout` 60s）；收到信号后先 `webSocketHandler.Shutdown()` 关掉所有 WebSocket（`http.Server.Shutdown` 不管被劫持的连接），再 `gameService.Shutdown()` 停 janitor 与全部游戏循环，最后 `Shutdown(ctx)` 限时 5 秒。

**文件：** `backend/cmd/server/main.go:73`

```go
log.Fatal(r.Run(port))
```

**问题：** 没有 SIGTERM/SIGINT 信号处理。进程被 kill 时：
- 所有 WebSocket 连接突然断开（无 close frame）
- 游戏循环 goroutine 被强制终止
- 所有内存中的游戏状态丢失
- 客户端收到不干净的断开

**建议修复：**
```go
srv := &http.Server{Addr: port, Handler: r}
go func() {
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatal(err)
    }
}()
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit
log.Println("Shutting down server...")
// 通知所有客户端、停止游戏循环...
srv.Shutdown(ctx)
```

---

### 8. WebSocket 无读超时

**状态：** ✅ 已修复 — `readPump` 进入时 `SetReadDeadline(pongWait=60s)`，`SetPongHandler` 每次收到 Pong 就顺延；服务端 `writePump` 每 30s 主动发 Ping。僵死连接最迟 60s 被清理（`maxMessageSize=4096` 也一并加了）。

**文件：** `backend/internal/handlers/http_websocket.go:124`

```go
_, data, err := client.conn.ReadMessage()
```

**问题：** `ReadMessage()` 永久阻塞。如果客户端浏览器崩溃或网络断开但 TCP 连接未关闭，服务端 goroutine 永远阻塞，连接永远留在 `roomConnections` 中。

**建议修复：**
```go
// 每次读取前设置超时
conn.SetReadDeadline(time.Now().Add(60 * time.Second))
_, data, err := client.conn.ReadMessage()
```

配合服务端心跳检测（当前只有客户端发 PING，服务端被动回 PONG）。

---

### 9. 乐观 UI 更新无服务端确认

**状态：** ⬜ 仍未处理 — `pauseGame`/`resumeGame` 依旧先 `set()` 本地状态再发消息，服务端拒绝时 UI 会短暂显示错误状态。

**文件：** `frontend/src/store/gameStore.ts:59-67`

```typescript
pauseGame: () => {
    // 先改本地状态...
    set((state) => ({
        gameState: 'PAUSED',
        room: state.room ? { ...state.room, game_state: 'PAUSED' } : null,
    }));
    gameAPI.sendMessage('PAUSE');  // 后发消息
},
```

**问题：** 如果服务端拒绝暂停（如游戏已结束），UI 短暂显示 "PAUSED" 而实际游戏仍在运行，直到下次 `GAME_STATE` 推送才纠正。

**建议修复：** 只在收到服务端 `GAME_STATE` 确认后才更新本地状态，或至少在发送消息后不立即乐观更新。

---

### 10. Docker 容器以 root 运行

**状态：** ⬜ 仍未处理 — `backend/Dockerfile`（`WORKDIR /root/`）与 `frontend/Dockerfile`（`nginx:alpine`）都没有 `USER`。

**文件：** `backend/Dockerfile:23` + `frontend/Dockerfile:17`

```dockerfile
# backend
WORKDIR /root/

# frontend
FROM nginx:alpine  # 默认以 root 运行
```

**问题：** 两个容器都以 root 身份运行，违反容器安全最佳实践。

**建议修复：**
```dockerfile
# backend/Dockerfile
USER 1000:1000

# frontend/Dockerfile
USER nginx
```

---

### 11. 核心模块无测试覆盖

**状态：** 🟡 部分修复 — 前端已有 5 个测试文件（`services/api.test.ts`、`test/gameStore.test.ts`、`test/ScoreBoard.test.tsx`、`test/settingsStore.test.ts`、`test/types.test.ts`），后端有 models/services/handlers + `e2e/` 全链路测试（含 `go test -race`）。**仍缺**：`gameStore.connect()` 的异步连接流程（测试里是 `connect: vi.fn()` 打桩，没走真实流程）、`soundManager.ts`、`useKeyPress.ts`，以及全部 3D 组件（`ThreeJSGameBoard`、`CameraController`、`ParticleEffect`、`SnakeTrail`、`DynamicLighting`、`Audio3D` 等）。

**问题：** 约25个前端组件和多个核心模块完全没有测试。

**无测试的组件：**
`SinglePlayerGame`、`GameUI`、`ThreeJSGameBoard`、`CameraController`、`ParticleEffect`、`SnakeTrail`、`DynamicLighting`、`Audio3D`、`MultiViewBoard`、`SettingsPanel`、`AchievementsPanel`、`GuidePanel`、`ErrorBoundary` 等

**无测试的模块：**
- `frontend/src/services/api.ts` — WebSocket 连接、重连、心跳逻辑
- `frontend/src/services/soundManager.ts` — Web Audio API 音效管理
- `frontend/src/hooks/useKeyPress.ts` — 键盘事件 hook
- `frontend/src/utils/direction.ts` — 方向工具函数

**无测试的 store 方法：**
- `gameStore.connect()` — 最复杂的异步连接流程，包括回调注册、分数检测、音效触发

**建议修复：** 优先为以下模块补测试：
1. `gameStore.connect()` — 异步流程最复杂
2. `api.ts` — WebSocket 核心逻辑
3. `direction.ts` — 纯函数，最容易测试
4. `soundManager.ts` — 可 mock Web Audio API

---

### 12. README 食物分数与实际不符

**状态：** ✅ 已修复 — README 现在是 5 种食物的完整表格，分数与 `snake.go:118-136` 一致（NORMAL 10 / SPECIAL 50 / SLOW 20 / SHIELD 30 / SHRINK 20），并补了各类型的效果说明。

**文件：** `README.md`

README 写的是：
> 吃到食物（粉红苹果）得 1 分
> 吃到特殊食物（旋转发光的金色八面体）得 5 分

**实际代码：**

| 食物类型 | 实际分数 | README 描述 |
|----------|----------|------------|
| NORMAL | 10分 | 1分 |
| SPECIAL | 50分 | 5分 |
| SLOW | 20分 | 未提及 |
| SHIELD | 30分 | 未提及 |
| SHRINK | 20分 | 未提及 |

`backend/internal/models/snake.go:118-136` + `frontend/src/types/game.ts:49-55`

---

## 🟢 低优先级

### 13. 已提交二进制文件和无关目录

**状态：** ✅ 已修复 — `backend/server.exe`（16MB）、`backend/coverage`、`backend/venv/` 已从 git 移除（文件保留在磁盘）；`.gitignore` 补上 `*.exe`、`backend/server`、`backend/coverage`、`backend/venv/`。仓库根目录那个未跟踪的旧 `server.exe` 也被 `*.exe` 覆盖。

**文件：**
- `backend/server.exe` — 编译产物，不应提交
- `backend/venv/` — Python 虚拟环境，不应出现在 Go 项目中

**建议修复：** 添加到 `.gitignore` 并从仓库中删除：
```gitignore
*.exe
backend/venv/
backend/server
```

---

### 14. gorilla/websocket 已归档不再维护

**状态：** ⬜ 仍未处理 — `go.mod` 里仍是 `github.com/gorilla/websocket v1.5.3`，未迁移。

**文件：** `backend/go.mod:8`

```
github.com/gorilla/websocket v1.5.3
```

**问题：** gorilla/websocket 项目已于2023年底归档，不再有安全补丁。

**建议修复：** 迁移到 `github.com/coder/websocket`（社区维护的 fork）或 `nhooyr.io/websocket`。

---

### 15. 无代码格式化工具

**状态：** ⬜ 仍未处理 — 仍无 `.prettierrc`、`.editorconfig`、`.nvmrc`，`package.json` 也没有 `format` 脚本。补充：Go 侧同样没有卡点——`config.go`、`handlers/room.go`、`models/room.go` 目前都不符合 `gofmt`（不是本次改动引入的），说明 CI 里既没有 `gofmt -l` 也没有 prettier 检查。

**问题：** 项目缺少：
- `.prettierrc` — 代码格式化配置
- `.editorconfig` — 编辑器统一配置
- `.nvmrc` — Node 版本统一
- `format` npm script

**建议修复：**
1. 添加 `.prettierrc` 和 `.editorconfig`
2. 在 `package.json` 中添加 `"format": "prettier --write ."`
3. 添加 `.nvmrc`（内容：`18`）

---

### 16. 批处理脚本仅 Windows

**状态：** ⬜ 仍未处理 — 仓库里只有 `.bat`，没有任何 `.sh` 或 `Makefile`；脚本里的 `d:\code\cc_test\.gocache` 仍是硬编码路径。

**文件：** `start-dev.bat`、`run-server.bat`、`run-frontend.bat`

**问题：**
- 仅支持 Windows（.bat 格式）
- 包含硬编码的机器特定路径（`d:\code\cc_test\.gocache`）
- 无 macOS/Linux 替代方案

**建议修复：**
1. 创建跨平台的 `scripts/` 目录
2. 使用 shell 脚本（`.sh`）或 Makefile
3. 将机器特定路径改为环境变量

---

### 17. 玩家可以加入正在进行的游戏

**状态：** ⬜ 仍未处理 — `AddPlayerToRoom` 依旧只看房间是否存在与人数上限，不看 `GameState`，PLAYING 中途仍可加入（并拿到新的起始位置）。注意：断线重连依赖这条路径，若改成直接拒绝，需要同时做"重连宽限期/会话令牌"（见 #20），否则会把正常重连一起挡掉。

**文件：** `backend/internal/services/game.go:85-105` + `backend/internal/handlers/http_websocket.go:84-103`

```go
func (gs *GameService) AddPlayerToRoom(roomID, playerID, playerName string) (*models.Snake, bool) {
    // 没有检查 room.GameState
}
```

**问题：** WebSocket 连接时调用 `AddPlayerToRoom` 不检查房间是否已经在 PLAYING 或 FINISHED 状态。

**建议修复：**
```go
func (gs *GameService) AddPlayerToRoom(roomID, playerID, playerName string) (*models.Snake, bool) {
    room, exists := gs.rooms[roomID]
    if !exists || room.GameState == models.Playing || room.GameState == models.Finished {
        return nil, false
    }
    // ...
}
```

---

### 18. CI 无覆盖率阈值

**状态：** ⬜ 仍未处理 — 没有 `vitest.config.ts`（配置在 `vite.config.ts` 里），其中没有 `coverage.thresholds`；后端 CI 也只上传 `coverage.out` 供人工下载。

**文件：** `.github/workflows/ci-cd.yml`

**问题：** 覆盖率已生成并上传但从未检查阈值，覆盖率可以无声退化。

**建议修复：**
```yaml
# vitest.config.ts
test: {
  coverage: {
    thresholds: {
      lines: 60,
      branches: 50,
      functions: 60,
      statements: 60,
    },
  },
}
```

---

### 19. 无后端代码静态分析（仅 go vet）

**状态：** 🟡 部分修复 — CI 已加 `go test -race -count=1`（本次），能抓出 vet 覆盖不到的数据竞争，且已在 Linux 容器里验证全绿。**仍缺**：`staticcheck` / `golangci-lint`、`gofmt` 检查（见 #15）。

**文件：** `.github/workflows/ci-cd.yml`

**问题：** CI 只用 `go vet`（覆盖面很窄），缺少 `golangci-lint` 或 `staticcheck`。

**建议修复：** 在 CI 中添加：
```yaml
- name: Run golangci-lint
  uses: golangci/golangci-lint-action@v3
```

---

### 20. 玩家断线重连后状态丢失

**状态：** 🟡 部分修复（本次）— 已修掉这条里最危险的一半：
- 同一 `player_id` 重复加入不再产生第二条蛇（`AddPlayerToRoom` 先移除旧蛇）；
- 断线清理改为**按蛇 ID**而不是 `player_id`。这一点很关键：僵尸连接要等最多 60s（`pongWait`）才会被回收，若按 `player_id` 删除，它会删掉重连后刚建好的新蛇。

**仍未做**：会话令牌 / 重连宽限期。重连依然是"换一条新蛇"，分数、位置、护盾全部丢失，且房满时重连仍会失败。

**文件：** `frontend/src/services/api.ts:139-170` + `backend/internal/handlers/http_websocket.go:84-103`

**问题：** 玩家断线后重连时：
- 以新蛇的身份加入（分数、位置、护盾等全部丢失）
- 如果房间满员，重连失败
- 如果旧蛇还未被清理（defer 未执行），可能冲突

**建议修复：** 实现会话令牌机制，让重连玩家可以恢复原有蛇的状态。

---

### 21. 其他小问题

**状态：** 🟡 部分修复 — `food.go` 的死代码已消失、玩家列表 key 改为优先用 `id`；其余 6 项仍在。

| 问题 | 位置 | 状态 |
|------|------|------|
| `ThreeJSGameBoard.tsx:191` 用数组索引作为 React key | 食物被吃掉后可能导致渲染错误 | ⬜ 仍在（第 191 行，key 由 index 拼成） |
| `SinglePlayerGame.tsx:431` `localStorage.getItem` 无 try/catch | 无痕模式下可能抛异常 | ⬜ 仍在（`SinglePlayerGame.tsx:421,439`） |
| `food.go:74-75` 死代码 `maxSnakeLen := 0; _ = maxSnakeLen` | `GenerateRandomFoodAvoidProximity` 中无用变量 | ✅ 已消失 |
| `ThreeJSGameBoard.tsx:245` 不安全的 `as` 类型转换 | `particle.type as ParticleEffectProps['type']` | ⬜ 仍在（第 245 行） |
| `docker-compose.yml:10` `SERVER_PORT` 硬编码为 8081 | 与 `${BACKEND_PORT:-8081}` 变量不一致 | ⬜ 仍在（`SERVER_PORT=8081`） |
| Nginx WebSocket 代理缺少 `proxy_read_timeout` | 默认60秒，心跳间隔30秒勉强够用 | ⬜ 仍在（`nginx.conf` 只设了 `proxy_http_version`/`Connection`） |
| 无 Docker Compose `healthcheck` | 即使有 `/health` 端点也未配置 | ⬜ 仍未配置 |
| 多人模式玩家列表用 `index` 作为 key | 同 #21 第一条 | 🟡 已改为优先 `player.id`（`ScoreBoard.tsx:19`，仅缺 id 时回退 index） |

---

## 建议修复顺序

| 优先级 | 问题 | 影响 | 状态 |
|--------|------|------|------|
| 1 | WebSocket origin 校验 | 安全 | ✅ |
| 2 | 连接配置到 GameService | 功能 bug | ✅ |
| 3 | 食物生成加迭代上限 | 生产事故 | ✅ |
| 4 | 添加速率限制 | 安全/稳定性 | 🟡 连接级已有，房间创建仍无限制 |
| 5 | WebSocket 读超时 | 资源泄漏 | ✅ |
| 6 | 合并 ThreeJSGameBoard 重复代码 | 可维护性 | ⬜ |
| 7 | 统一食物配置来源 | 一致性 | 🟡 前端已统一，前后端权重表仍两份 |
| 8 | 添加优雅关闭 | 可靠性 | ✅ |
| 9 | Docker 非 root 运行 | 安全 | ⬜ |
| 10 | 为核心模块补测试 | 质量 | 🟡 |
| 11 | README 更新食物分数 | 文档准确性 | ✅ |
| 12 | 清理已提交的二进制文件 | 仓库整洁 | ✅ |
| 13 | 添加格式化工具配置 | 开发体验 | ⬜ |
| 14 | 迁移 websocket 库 | 长期维护 | ⬜ |
| 15 | 其他小问题 | 质量 | 🟡 2/8 已解决 |

## 建议的下一步（按收益/风险排序）

1. **统一食物权重表**（#6/#7）——前端 `pickFoodType` 与后端 `FoodSpawnTable` 各自维护，改一处漏一处会直接造成单机/多人手感不一致。
2. **房间总量与每 IP 限流**（#4）——目前房间创建无任何上限，是唯一还敞开着的资源耗尽口子。
3. **重连宽限期 / 会话令牌**（#20）——本次已修掉"旧蛇被误删"，但重连仍会丢分数与位置；这也是 #17 能否收紧的前提。
4. **Docker 非 root + healthcheck**（#10/#21）——改动小、收益直接。
5. 其余（#5 合并重复组件、#14 迁移 websocket 库、#15 加格式化卡点）属于维护性投入，可按计划排。

## 本次核对中完成的改动（2026-10-09）

- **删除 `POST /api/rooms/:id/join`** —— 它会给房间加一条没有连接支撑的蛇，而 janitor 只清理 0 人房间，于是房间永久泄漏且占满名额；前端从未调用过该接口。
- **同一 `player_id` 去重 + 断线清理按蛇 ID** —— 修掉重连场景下"僵尸连接清理误删新蛇"。这两条必须同时改，只做去重反而会把问题放大。
- **MOVE 不再触发即时全量广播** —— 实测：单连接 10 次/秒的 MOVE 让房间广播从 16 条/1.5s 涨到 31 条，现在回到 15 条（去掉的是纯重复的即时回显，输入和转向不受影响）。
- **MOVE 方向白名单校验** —— 非法方向原本会让 `ChangeDirection` 写入未知值、`Move()` 原地不动，下一 tick 自撞身亡。
- **房间/玩家/昵称长度上限**，与前端输入框的 `maxLength` 对齐（服务端按字符数计）。
- **配置非法值兜底**（0/负数/非数字 → 回落默认并告警），此前会直接 panic。
- **优雅关闭**（#7）与 **tick 耗时/丢 tick 观测日志**。
- **CI 加 `go test -race`**；**仓库瘦身**（#13）。

---

*初版：2026-06-12 · 状态核对与上述改动：2026-10-09*
