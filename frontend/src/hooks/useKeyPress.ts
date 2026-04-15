import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export const useKeyPress = () => {
  const moveSnake = useGameStore((state) => state.moveSnake);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const gameState = useGameStore((state) => state.gameState);
  const connected = useGameStore((state) => state.connected);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!connected) {
        return;
      }

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          if (gameState === 'PLAYING') {
            moveSnake('UP');
          }
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          if (gameState === 'PLAYING') {
            moveSnake('DOWN');
          }
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          if (gameState === 'PLAYING') {
            moveSnake('LEFT');
          }
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          if (gameState === 'PLAYING') {
            moveSnake('RIGHT');
          }
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          if (event.repeat) {
            return;
          }
          if (gameState === 'PLAYING') {
            pauseGame();
          } else if (gameState === 'PAUSED') {
            resumeGame();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [connected, gameState, moveSnake, pauseGame, resumeGame]);
};
