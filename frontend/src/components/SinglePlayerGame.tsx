import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameBoard } from './Game/GameBoard';
import { SinglePlayerScoreBoard } from './Common/SinglePlayerScoreBoard';
import { SinglePlayerControlPanel } from './Common/SinglePlayerControlPanel';
import { Food, Room, Snake } from '../types/game';

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
  cellSize = 20,
}) => {
  const [gameState, setGameState] = useState<SinglePlayerGameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [snake, setSnake] = useState<Snake>(createInitialSnake);
  const [food, setFood] = useState<Food>({
    pos: { x: 15, y: 10 },
    type: 'NORMAL',
  });

  const gameLoopRef = useRef<number | null>(null);
  const directionRef = useRef<SinglePlayerDirection>('RIGHT');

  const generateFood = useCallback((): Point => {
    let nextFood: Point;
    do {
      nextFood = {
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height),
      };
    } while (
      snake.body.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y)
    );

    return nextFood;
  }, [height, snake.body, width]);

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake.body[0] };

      switch (directionRef.current) {
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

      if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
        setGameState('gameOver');
        return prevSnake;
      }

      if (prevSnake.body.some((segment) => segment.x === head.x && segment.y === head.y)) {
        setGameState('gameOver');
        return prevSnake;
      }

      const nextBody = [head, ...prevSnake.body];
      const nextSnake: Snake = {
        ...prevSnake,
        direction: directionRef.current,
        body: nextBody,
      };

      if (head.x === food.pos.x && head.y === food.pos.y) {
        setScore((prevScore) => {
          const scoreDelta = food.type === 'SPECIAL' ? 5 : 1;
          const nextScore = prevScore + scoreDelta;
          setHighScore((prevHighScore) => Math.max(prevHighScore, nextScore));
          return nextScore;
        });

        setFood({
          pos: generateFood(),
          type: Math.random() > 0.8 ? 'SPECIAL' : 'NORMAL',
        });
      } else {
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
    setFood({
      pos: { x: 15, y: 10 },
      type: 'NORMAL',
    });
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
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (gameState === 'playing' && directionRef.current !== 'DOWN') {
            event.preventDefault();
            directionRef.current = 'UP';
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (gameState === 'playing' && directionRef.current !== 'UP') {
            event.preventDefault();
            directionRef.current = 'DOWN';
          }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (gameState === 'playing' && directionRef.current !== 'RIGHT') {
            event.preventDefault();
            directionRef.current = 'LEFT';
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (gameState === 'playing' && directionRef.current !== 'LEFT') {
            event.preventDefault();
            directionRef.current = 'RIGHT';
          }
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          if (!event.repeat) {
            pauseGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
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
    localStorage.setItem('snakeHighScore', highScore.toString());
  }, [highScore]);

  const room = createBoardRoom(width, height, { ...snake, score }, food);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-gray-800 p-6 shadow-xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">贪吃蛇 - 单机模式</h1>

        <div className="mb-4 flex justify-between">
          <SinglePlayerScoreBoard score={score} highScore={highScore} />
        </div>

        <div className="mb-4 flex justify-center">
          <GameBoard room={room} cellSize={cellSize} />
        </div>

        <SinglePlayerControlPanel
          gameState={gameState}
          onStart={startGame}
          onPause={pauseGame}
          onRestart={restartGame}
        />

        <div className="mt-4 text-center text-sm text-gray-400">
          <p>使用方向键或 WASD 控制移动，空格键暂停或继续</p>
        </div>
      </div>
    </div>
  );
};
