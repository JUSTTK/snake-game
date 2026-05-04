import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../services/soundManager';
import { isReverseDirection, isTypingTarget, keyToDirection } from '../utils/direction';

export const useKeyPress = () => {
  const moveSnake = useGameStore((state) => state.moveSnake);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const gameState = useGameStore((state) => state.gameState);
  const connected = useGameStore((state) => state.connected);
  const room = useGameStore((state) => state.room);
  const mySnakeId = useGameStore((state) => state.mySnakeId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!connected || isTypingTarget(event.target)) {
        return;
      }

      const direction = keyToDirection(event.key);
      if (direction) {
        event.preventDefault();

        if (event.repeat || gameState !== 'PLAYING') {
          return;
        }

        const mySnake = room?.players.find((player) => player.id === mySnakeId);
        if (mySnake?.direction && isReverseDirection(mySnake.direction, direction)) {
          return;
        }

        soundManager.playTurn();
        moveSnake(direction);
        return;
      }

      if (event.code !== 'Space') {
        return;
      }

      event.preventDefault();
      if (event.repeat) {
        return;
      }

      if (gameState === 'PLAYING') {
        pauseGame();
      } else if (gameState === 'PAUSED') {
        resumeGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connected, gameState, moveSnake, mySnakeId, pauseGame, resumeGame, room]);
};
