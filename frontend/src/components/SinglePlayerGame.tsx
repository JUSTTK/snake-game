import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SinglePlayerControlPanel } from './Common/SinglePlayerControlPanel';
import { SinglePlayerScoreBoard } from './Common/SinglePlayerScoreBoard';
import { CameraModeSelector } from './Game/CameraModeSelector';
import { CameraMode, ViewMode } from './Game/CameraController';
import { MultiViewBoard } from './Game/MultiViewBoard';
import { soundManager } from '../services/soundManager';
import { Food, Room, Snake } from '../types/game';
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

const createInitialSnake = (): Snake => ({
  body: [{ x: 10, y: 10 }],
  direction: 'RIGHT',
  color: '#10b981',
  score: 0,
  alive: true,
  name: '玩家',
  id: 'single-player',
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
    (occupiedBody: Point[]): Point => {
      let nextFood: Point;
      do {
        nextFood = {
          x: Math.floor(Math.random() * width),
          y: Math.floor(Math.random() * height),
        };
      } while (
        occupiedBody.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y)
      );

      return nextFood;
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
        soundManager.play('game_over');
        setGameState('gameOver');
        return prevSnake;
      }

      if (collisionSegments.some((segment) => segment.x === head.x && segment.y === head.y)) {
        soundManager.play('game_over');
        setGameState('gameOver');
        return prevSnake;
      }

      const nextBody = [head, ...prevSnake.body];
      const nextSnake: Snake = {
        ...prevSnake,
        direction: activeDirection,
        body: nextBody,
      };

      if (willGrow) {
        soundManager.play(food.type === 'SPECIAL' ? 'eat_special' : 'eat_normal');
        setScore((prevScore) => {
          const scoreDelta = food.type === 'SPECIAL' ? 5 : 1;
          const nextScore = prevScore + scoreDelta;
          setHighScore((prevHighScore) => Math.max(prevHighScore, nextScore));
          return nextScore;
        });

        setFood({
          pos: generateFood(nextBody),
          type: Math.random() > 0.8 ? 'SPECIAL' : 'NORMAL',
        });
      } else {
        soundManager.playMoveTick();
        nextSnake.body.pop();
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
    if (gameState === 'playing') {
      gameLoopRef.current = window.setInterval(moveSnake, 150);
    } else if (gameLoopRef.current !== null) {
      window.clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    return () => {
      if (gameLoopRef.current !== null) {
        window.clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, moveSnake]);

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
              <p className="font-semibold text-white">声音与视野</p>
              <p className="mt-2">
                移动、转向、吃食物、开局和失败都有音效，游戏进行中会播放背景音乐。
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
