import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SinglePlayerControlPanel } from './Common/SinglePlayerControlPanel';
import { SinglePlayerScoreBoard } from './Common/SinglePlayerScoreBoard';
import { CameraModeSelector } from './Game/CameraModeSelector';
import { CameraMode, ViewMode } from './Game/CameraController';
import { MultiViewBoard } from './Game/MultiViewBoard';
import { SettingsPanel } from './Common/SettingsPanel';
import { GuidePanel } from './Common/GuidePanel';
import { AchievementsPanel, AchievementNotification } from './Common/AchievementsPanel';
import { soundManager } from '../services/soundManager';
import { useSettingsStore } from '../store/settingsStore';
import { Food, FoodType, Room, Snake, FOOD_CONFIG } from '../types/game';
import { isReverseDirection, isTypingTarget } from '../utils/direction';

export type SinglePlayerGameState = 'idle' | 'playing' | 'paused' | 'gameOver';
export type SinglePlayerDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Point {
  x: number;
  y: number;
}

interface SinglePlayerGameProps {
  width?: number;
  height?: number;
  cellSize?: number;
}

const BASE_SPEED = 150;
const SLOW_SPEED = 250;
const SHIELD_DURATION = 30;
const SLOW_DURATION = 25;

const createInitialSnake = (): Snake => ({
  body: [{ x: 10, y: 10 }],
  direction: 'RIGHT',
  color: '#10b981',
  score: 0,
  alive: true,
  name: '玩家',
  id: 'single-player',
  shielded: false,
  shieldTimer: 0,
  slowed: false,
  slowTimer: 0,
});

const createBoardRoom = (
  width: number,
  height: number,
  snake: Snake,
  food: Food
): Room => ({
  id: 'single-player-room',
  name: '单机模式',
  game_state: 'PLAYING',
  players: [snake],
  foods: [food],
  map_size: { x: width, y: height },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const pickFoodType = (snakeLength: number): FoodType => {
  const table: { type: FoodType; weight: number; minLen: number }[] = [
    { type: 'NORMAL', weight: 55, minLen: 0 },
    { type: 'SPECIAL', weight: 10, minLen: 0 },
    { type: 'SLOW', weight: 12, minLen: 4 },
    { type: 'SHIELD', weight: 10, minLen: 5 },
    { type: 'SHRINK', weight: 13, minLen: 6 },
  ];

  const eligible = table.filter((e) => snakeLength >= e.minLen);
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of eligible) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.type;
    }
  }
  return 'NORMAL';
};

const keyBindingToDirection = (key: string, keyBindings: { up: string; down: string; left: string; right: string }): SinglePlayerDirection | null => {
  const k = key.toLowerCase();
  if (key === keyBindings.up || k === keyBindings.up.toLowerCase()) return 'UP';
  if (key === keyBindings.down || k === keyBindings.down.toLowerCase()) return 'DOWN';
  if (key === keyBindings.left || k === keyBindings.left.toLowerCase()) return 'LEFT';
  if (key === keyBindings.right || k === keyBindings.right.toLowerCase()) return 'RIGHT';
  return null;
};

export const SinglePlayerGame: React.FC<SinglePlayerGameProps> = ({
  width = 20,
  height = 20,
  cellSize = 1.2,
}) => {
  const [gameState, setGameState] = useState<SinglePlayerGameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [snake, setSnake] = useState<Snake>(createInitialSnake);
  const [food, setFood] = useState<Food>({
    pos: { x: 15, y: 10 },
    type: 'NORMAL',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [cameraMode, setCameraMode] = useState<CameraMode>('comfort');
  const [fps, setFps] = useState(0);

  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef<SinglePlayerDirection>('RIGHT');
  const queuedDirectionRef = useRef<SinglePlayerDirection>('RIGHT');
  const fpsFrameRef = useRef<number>(0);
  const fpsTimeRef = useRef<number>(0);

  const keyBindings = useSettingsStore((s) => s.keyBindings);
  const theme = useSettingsStore((s) => s.theme);
  const showFps = useSettingsStore((s) => s.showFps);
  const setSettingsPanelOpen = useSettingsStore((s) => s.setSettingsPanelOpen);
  const setAchievementsPanelOpen = useSettingsStore((s) => s.setAchievementsPanelOpen);
  const updateAchievementState = useSettingsStore((s) => s.updateAchievementState);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!showFps) return;
    let animId: number;
    const tick = (time: number) => {
      fpsFrameRef.current++;
      if (time - fpsTimeRef.current >= 1000) {
        setFps(fpsFrameRef.current);
        fpsFrameRef.current = 0;
        fpsTimeRef.current = time;
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [showFps]);

  const generateFood = useCallback(
    (occupiedBody: Point[], snakeLength: number): Food => {
      let nextPos: Point;
      const snakeHead = occupiedBody[0];

      for (let attempt = 0; attempt < 50; attempt++) {
        nextPos = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        };

        if (occupiedBody.some((s) => s.x === nextPos.x && s.y === nextPos.y)) {
          continue;
        }

        if (attempt < 40 && snakeHead) {
          const dx = nextPos.x - snakeHead.x;
          const dy = nextPos.y - snakeHead.y;
          if (dx * dx + dy * dy < 9) {
            continue;
          }
        }

        return {
          pos: nextPos!,
          type: pickFoodType(snakeLength),
        };
      }

      return {
        pos: {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        },
        type: 'NORMAL',
      };
    },
    [height, width]
  );

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const activeDirection = queuedDirectionRef.current;
      directionRef.current = activeDirection;
      const head = { ...prevSnake.body[0] };

      switch (activeDirection) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      const willGrow = head.x === food.pos.x && head.y === food.pos.y;
      const collisionSegments = willGrow ? prevSnake.body : prevSnake.body.slice(0, -1);

      if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
        if (prevSnake.shielded) {
          const nextSnake: Snake = {
            ...prevSnake,
            direction: activeDirection,
            shielded: false,
            shieldTimer: 0,
          };
          soundManager.play('eat_special');
          updateAchievementState({ shieldUsed: (useSettingsStore.getState().achievementState.shieldUsed ?? 0) + 1 });
          return nextSnake;
        }
        soundManager.play('game_over');
        setGameState('gameOver');
        const achState = useSettingsStore.getState().achievementState;
        updateAchievementState({
          totalGamesPlayed: achState.totalGamesPlayed + 1,
          totalDeaths: achState.totalDeaths + 1,
          gamesWithoutDeath: 0,
        });
        return prevSnake;
      }

      if (collisionSegments.some((segment) => segment.x === head.x && segment.y === head.y)) {
        if (prevSnake.shielded) {
          const nextSnake: Snake = {
            ...prevSnake,
            direction: activeDirection,
            shielded: false,
            shieldTimer: 0,
          };
          soundManager.play('eat_special');
          updateAchievementState({ shieldUsed: (useSettingsStore.getState().achievementState.shieldUsed ?? 0) + 1 });
          return nextSnake;
        }
        soundManager.play('game_over');
        setGameState('gameOver');
        const achState = useSettingsStore.getState().achievementState;
        updateAchievementState({
          totalGamesPlayed: achState.totalGamesPlayed + 1,
          totalDeaths: achState.totalDeaths + 1,
          gamesWithoutDeath: 0,
        });
        return prevSnake;
      }

      const nextBody = [head, ...prevSnake.body];
      const nextSnake: Snake = {
        ...prevSnake,
        direction: activeDirection,
        body: nextBody,
      };

      if (willGrow) {
        const isSpecial = food.type !== 'NORMAL';
        soundManager.play(isSpecial ? 'eat_special' : 'eat_normal');

        const config = FOOD_CONFIG[food.type];
        setScore((prevScore) => {
          const nextScore = prevScore + config.score;
          setHighScore((prevHighScore) => {
            const newHigh = Math.max(prevHighScore, nextScore);
            updateAchievementState({ highScore: newHigh });
            return newHigh;
          });
          return nextScore;
        });

        const achState = useSettingsStore.getState().achievementState;
        const foodUpdate: Record<string, number> = { totalFoodEaten: achState.totalFoodEaten + 1 };

        switch (food.type) {
          case 'SHIELD':
            nextSnake.shielded = true;
            nextSnake.shieldTimer = SHIELD_DURATION;
            break;
          case 'SLOW':
            nextSnake.slowed = true;
            nextSnake.slowTimer = SLOW_DURATION;
            foodUpdate.slowFoodEaten = achState.slowFoodEaten + 1;
            break;
          case 'SHRINK':
            if (nextSnake.body.length > 3) {
              const removeCount = Math.max(1, Math.floor(nextSnake.body.length / 3));
              const minLen = 3;
              const actualRemove = Math.min(removeCount, nextSnake.body.length - minLen);
              if (actualRemove > 0) {
                nextSnake.body = nextSnake.body.slice(0, nextSnake.body.length - actualRemove);
              }
            }
            foodUpdate.shrinkFoodEaten = achState.shrinkFoodEaten + 1;
            break;
          case 'SPECIAL':
            foodUpdate.specialFoodEaten = achState.specialFoodEaten + 1;
            break;
        }

        updateAchievementState(foodUpdate);

        const newBodyLen = nextSnake.body.length;
        const achState2 = useSettingsStore.getState().achievementState;
        if (newBodyLen > achState2.longestSnake) {
          updateAchievementState({ longestSnake: newBodyLen });
        }

        setFood(generateFood(nextBody, nextSnake.body.length));
      } else {
        soundManager.playMoveTick();
        nextSnake.body.pop();
      }

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

      return nextSnake;
    });
  }, [food.pos.x, food.pos.y, food.type, generateFood, height, width, updateAchievementState]);

  const startGame = useCallback(() => {
    const initialSnake = createInitialSnake();
    setGameState('playing');
    setScore(0);
    setSnake(initialSnake);
    directionRef.current = 'RIGHT';
    queuedDirectionRef.current = 'RIGHT';
    setFood({
      pos: { x: 15, y: 10 },
      type: 'NORMAL',
    });
    soundManager.play('game_start');
  }, []);

  const pauseGame = useCallback(() => {
    setGameState((prevState) => {
      if (prevState === 'playing') {
        return 'paused';
      }
      if (prevState === 'paused') {
        return 'playing';
      }
      return prevState;
    });
  }, []);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSettingsPanelOpen(true);
        return;
      }

      const nextDirection = keyBindingToDirection(event.key, keyBindings);
      if (nextDirection) {
        event.preventDefault();

        if (gameState !== 'playing' || event.repeat) {
          return;
        }

        const currentDirection = directionRef.current;
        const queuedDirection = queuedDirectionRef.current;
        if (
          !isReverseDirection(currentDirection, nextDirection) &&
          !isReverseDirection(queuedDirection, nextDirection)
        ) {
          queuedDirectionRef.current = nextDirection;
          soundManager.playTurn();
        }
        return;
      }

      if (event.key === keyBindings.pause || event.code === 'Space') {
        event.preventDefault();
        if (!event.repeat) {
          pauseGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, pauseGame, keyBindings, setSettingsPanelOpen]);

  useEffect(() => {
    if (gameLoopRef.current !== null) {
      window.clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    if (gameState === 'playing') {
      const speed = snake.slowed ? SLOW_SPEED : BASE_SPEED;
      gameLoopRef.current = window.setInterval(moveSnake, speed);
    }

    return () => {
      if (gameLoopRef.current !== null) {
        window.clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, moveSnake, snake.slowed]);

  useEffect(() => {
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  useEffect(() => {
    soundManager.initialize();
  }, []);

  useEffect(() => {
    soundManager.setBackgroundMusicActive(gameState === 'playing');
    return () => soundManager.setBackgroundMusicActive(false);
  }, [gameState]);

  useEffect(() => {
    localStorage.setItem('snakeHighScore', highScore.toString());
  }, [highScore]);

  const room = createBoardRoom(width, height, { ...snake, score }, food);

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <SettingsPanel />
      <AchievementsPanel />
      <AchievementNotification />

      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <header className="rounded-3xl border px-6 py-5 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', boxShadow: `0 10px 30px var(--shadow-color)` }}>
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <div className="text-center">
              <h1 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                贪吃蛇 3D 单机版
              </h1>
              <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-muted)' }}>
                三个跟随视角加全地图总览，支持紧跟模式和舒适模式切换
              </p>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              {showFps && (
                <span className="rounded-lg px-2 py-1 text-xs font-mono" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--accent-primary)' }}>
                  {fps} FPS
                </span>
              )}
              <button
                onClick={() => setAchievementsPanelOpen(true)}
                className="rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
              >
                🏆 成就
              </button>
              <button
                onClick={() => setSettingsPanelOpen(true)}
                className="rounded-xl border px-3 py-2 text-sm font-medium transition-all hover:opacity-80"
                style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}
              >
                ⚙️ 设置
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <MultiViewBoard
            room={room}
            cellSize={cellSize}
            selectedView={viewMode}
            cameraMode={cameraMode}
            onSelectView={setViewMode}
            focusSnakeId={snake.id}
          />

          <aside className="flex flex-col gap-5 rounded-3xl border p-5 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-primary)', boxShadow: `0 10px 30px var(--shadow-color)` }}>
            <SinglePlayerScoreBoard score={score} highScore={highScore} />

            {snake.shielded && (
              <div className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: 'var(--accent-yellow)', backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'var(--accent-yellow)' }}>
                🛡️ 护盾生效中 ({snake.shieldTimer}步)
              </div>
            )}
            {snake.slowed && (
              <div className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: 'var(--accent-blue)', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)' }}>
                🐌 减速中 ({snake.slowTimer}步)
              </div>
            )}

            <CameraModeSelector cameraMode={cameraMode} onChange={setCameraMode} />
            <SinglePlayerControlPanel
              gameState={gameState}
              onStart={startGame}
              onPause={pauseGame}
              onRestart={restartGame}
            />

            <GuidePanel />

            <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-input)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>食物效果说明</p>
              <div className="mt-2 space-y-1.5">
                <p style={{ color: 'var(--text-secondary)' }}><span className="text-rose-400">●</span> 普通食物 — 增长蛇身 +1分</p>
                <p style={{ color: 'var(--text-secondary)' }}><span className="text-yellow-400">◆</span> 特殊食物 — 增长蛇身 +5分</p>
                <p style={{ color: 'var(--text-secondary)' }}><span className="text-sky-400">⬡</span> 减速食物 — 临时减速 +2分</p>
                <p style={{ color: 'var(--text-secondary)' }}><span className="text-amber-400">⬠</span> 护盾食物 — 免死一次 +3分</p>
                <p style={{ color: 'var(--text-secondary)' }}><span className="text-red-400">▲</span> 缩短食物 — 缩短蛇身 +2分</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
