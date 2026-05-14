import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SinglePlayerControlPanel } from './Common/SinglePlayerControlPanel';
import { SinglePlayerScoreBoard } from './Common/SinglePlayerScoreBoard';
import { CameraModeSelector } from './Game/CameraModeSelector';
import { CameraMode, ViewMode } from './Game/CameraController';
import { MultiViewBoard } from './Game/MultiViewBoard';
import { soundManager } from '../services/soundManager';
import { Food, FoodType, Room, Snake, FOOD_CONFIG } from '../types/game';
import { isReverseDirection, isTypingTarget, keyToDirection } from '../utils/direction';

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

  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef<SinglePlayerDirection>('RIGHT');
  const queuedDirectionRef = useRef<SinglePlayerDirection>('RIGHT');

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
          return nextSnake;
        }
        soundManager.play('game_over');
        setGameState('gameOver');
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
          return nextSnake;
        }
        soundManager.play('game_over');
        setGameState('gameOver');
        return prevSnake;
      }

      const nextBody = [head, ...prevSnake.body];
      let nextSnake: Snake = {
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
          setHighScore((prevHighScore) => Math.max(prevHighScore, nextScore));
          return nextScore;
        });

        switch (food.type) {
          case 'SHIELD':
            nextSnake.shielded = true;
            nextSnake.shieldTimer = SHIELD_DURATION;
            break;
          case 'SLOW':
            nextSnake.slowed = true;
            nextSnake.slowTimer = SLOW_DURATION;
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
            break;
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
  }, [food.pos.x, food.pos.y, food.type, generateFood, height, width]);

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

      const nextDirection = keyToDirection(event.key);
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

      if (event.code !== 'Space') {
        return;
      }

      event.preventDefault();
      if (!event.repeat) {
        pauseGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, pauseGame]);

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
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white sm:px-6">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-5 shadow-xl shadow-slate-950/30">
          <h1 className="text-center text-3xl font-bold text-white sm:text-4xl">
            贪吃蛇 3D 单机版
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400 sm:text-base">
            三个跟随视角加全地图总览，支持紧跟模式和舒适模式切换。
          </p>
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

          <aside className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
            <SinglePlayerScoreBoard score={score} highScore={highScore} />
            <CameraModeSelector cameraMode={cameraMode} onChange={setCameraMode} />
            <SinglePlayerControlPanel
              gameState={gameState}
              onStart={startGame}
              onPause={pauseGame}
              onRestart={restartGame}
            />
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">食物效果说明</p>
              <div className="mt-2 space-y-1.5">
                <p><span className="text-rose-400">●</span> 普通食物 — 增长蛇身 +1分</p>
                <p><span className="text-yellow-400">◆</span> 特殊食物 — 增长蛇身 +5分</p>
                <p><span className="text-sky-400">⬡</span> 减速食物 — 临时减速 +2分</p>
                <p><span className="text-amber-400">⬠</span> 护盾食物 — 免死一次 +3分</p>
                <p><span className="text-red-400">▲</span> 缩短食物 — 缩短蛇身 +2分</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
