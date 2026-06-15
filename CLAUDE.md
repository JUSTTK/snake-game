# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A 3D snake game with single-player and WebSocket-based multiplayer modes. The backend is Go (Gin + gorilla/websocket), the frontend is React 18 + TypeScript + Three.js (via @react-three/fiber + @react-three/drei). State management uses Zustand, styling uses Tailwind CSS, and the build tool is Vite.

## Common Commands

### Backend (Go)

```bash
cd backend
go run ./cmd/server                    # Start backend on :8081
go build ./...                         # Compile check all packages
go test ./...                          # Run all Go tests
go test ./internal/models/ -v -run TestSnake_Move  # Run a single test
```

Go environment variables for China-based development:
```bash
set GOCACHE=d:\code\cc_test\.gocache
set GOMODCACHE=d:\code\cc_test\.gomodcache
set GOPROXY=https://goproxy.cn,direct
```

### Frontend (React + Vite)

```bash
cd frontend
npm install                            # Install dependencies
npm run dev -- --host                  # Dev server (proxies /api and /ws to localhost:8081)
npm run build                          # Type-check (tsc) + production build
npm run lint                           # ESLint
npm test                               # Run Vitest unit tests (happy-dom env)
npm run test:watch                     # Vitest in watch mode
npm run test:e2e                       # Build then run Playwright e2e tests
```

### Docker

```bash
docker-compose up --build -d           # Full stack: frontend on :80, backend on :8081
```

## Architecture

### Backend (`backend/`)

- **Entry point:** `cmd/server/main.go` — creates `GameService`, wires HTTP + WebSocket handlers via Gin, optionally serves frontend `dist/` as static files.
- **Models:** `internal/models/` — `Snake`, `Food`, `Room`, `Point`, and `Direction` types. Room holds players, foods, game state (WAITING/PLAYING/PAUSED/FINISHED), and collision/death logic.
- **Game service:** `internal/services/game.go` — owns all rooms, manages game loop (150ms tick), collision detection, food generation (weighted random with 5 food types), and player start positions.
- **Handlers:** `internal/handlers/` — REST endpoints (`room.go` for room CRUD) and WebSocket handler (`http_websocket.go`). WebSocket messages use JSON `{type, data}` protocol. On `MOVE`, the server changes the snake's heading; the game loop auto-advances all snakes each tick. `GAME_STATE` broadcasts to all connections in the room on every state change.
- **Tests:** Unit tests in `internal/models/`, `internal/services/`, `internal/handlers/`. E2E test in `backend/e2e/backend_e2e_test.go` (starts real server, connects via WebSocket).

### Frontend (`frontend/src/`)

- **Routing (React Router):** `/` → mode selection, `/single-player` → `SinglePlayerGame`, `/multiplayer` → login form, `/game` → `GameUI` (multiplayer board). All routes are lazy-loaded.
- **Single-player:** `SinglePlayerGame.tsx` — self-contained game loop using `setInterval`, no backend. Manages snake, food, score, high score, achievements, and all 5 food types locally.
- **Multiplayer:** `store/gameStore.ts` (Zustand) connects via `services/api.ts` (WebSocket wrapper with auto-reconnect, heartbeat/ping-pong, exponential backoff up to 5 attempts). `GameUI.tsx` renders the 3D board and control panel.
- **3D rendering:** `ThreeJSGameBoard.tsx` is the main Canvas component. `ThreeJSSnake.tsx` renders snakes with rounded boxes, eyes, and glow. `ThreeJSFood.tsx` renders food items with distinct geometries per type. `ThreeJSFloor.tsx` renders the grid floor. `CameraController.tsx` provides 3 view modes (isometric/top/perspective) with 2 camera modes (tight/comfort), using smooth lerp-based following. `DynamicLighting.tsx` handles scene lighting.
- **State:** `store/gameStore.ts` — multiplayer WebSocket state. `store/settingsStore.ts` — theme, key bindings, graphics quality, sound/music, achievements (persisted to localStorage).
- **Sound:** `services/soundManager.ts` — Web Audio API with 8-bit WAV samples (eat, game over, start) and synthesized background music.
- **Types:** `types/game.ts` — shared TypeScript types matching Go model JSON shapes.

### Key Design Decisions

- **Multiplayer movement:** Each keypress sends a `MOVE` message that changes direction only; the server game loop advances all snakes each tick (150ms). This differs from single-player where the snake auto-advances locally.
- **Food system:** 5 types (NORMAL, SPECIAL, SLOW, SHIELD, SHRINK) with weighted spawn probabilities gated by snake length. Both frontend single-player and backend game service implement identical food-spawning logic.
- **Collision:** Snakes die on wall hit, self-collision, or head-to-head collision with another snake. Shield food provides one-time death immunity. The game ends when ≤1 player remains alive.
- **WebSocket reconnect:** Exponential backoff (1s base, up to 5 attempts). Heartbeat PING every 30s with 35s timeout. Supports both text and Blob message frames.
- **Camera:** 3 view modes × 2 camera modes = 6 configurations. Camera uses exponential smoothing (lerp) each frame with different damping factors per mode. The camera anticipates movement direction and adjusts FOV based on snake length.
- **Vite proxy:** Dev server proxies `/api` → `http://localhost:8081` and `/ws` → `ws://localhost:8081`. Production uses `VITE_WS_URL` env var for WebSocket URL resolution.

### Test Environment

- **Frontend unit tests:** Vitest with `happy-dom` environment, setup file at `src/test/setup.ts`. Tests cover store logic, type guards, and component rendering.
- **Frontend e2e:** Playwright tests build the app first (`npm run build`), then run against the built output. Located in `frontend/e2e/`.
- **Backend tests:** Standard `go test`. Models tested for snake movement, food generation, collision. E2E test spins up a real HTTP server and tests WebSocket flow.

### Enhanced 3D Effects (`frontend/src/components/Game/`)

Several advanced visual components augment the base 3D rendering:
- **`ParticleEffect.tsx`** — particle bursts on food collection, turning, and death, using Three.js Points with physics-based movement.
- **`SnakeTrail.tsx`** — motion trail/ghost segments behind each snake with configurable length and glow.
- **`DynamicLighting.tsx`** — adaptive ambient + directional lighting that follows the snake head, with breathing ambient light and snake-length-based intensity.
- **`Audio3D.tsx`** — spatial audio positioned in 3D space (SpatialAudio for localized sounds, AmbientAudio3D for environmental background).
- **`ThreeJSGameBoardEnhanced.tsx`** — integrates all above effects into a single board variant.

### Batch Scripts (Windows)

- `start-dev.bat` — sets Go env vars, `go mod tidy`, starts backend + frontend together.
- `run-server.bat` — `go mod tidy`, compiles `server.exe`, runs it.
- `run-frontend.bat` — starts Vite dev server only.
- `start-prod.bat` — runs `docker-compose up --build -d` (note: the script's printed port 8080 is outdated; actual backend is on 8081).

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.