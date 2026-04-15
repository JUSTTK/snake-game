import React from 'react';
import { Button } from './Button';
import { useGameStore } from '../../store/gameStore';

interface ControlPanelProps {
  roomID: string;
  playerID: string;
  playerName: string;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  roomID,
  playerID,
  playerName,
}) => {
  const {
    gameState,
    connected,
    error,
    connect,
    startGame,
    pauseGame,
    resumeGame,
    restartGame,
    leaveRoom,
    setConnected,
    setError,
  } = useGameStore();

  const handleJoin = async () => {
    try {
      setError(null);
      await connect(roomID, playerID, playerName);
    } catch {
      setError('Failed to connect to game server');
    }
  };

  const handleLeave = () => {
    leaveRoom();
    setConnected(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      {error && (
        <div className="rounded-md bg-red-600 p-3 text-white">
          {error}
        </div>
      )}

      {!connected ? (
        <Button onClick={handleJoin} size="lg" className="w-full">
          Join Game
        </Button>
      ) : (
        <div className="flex flex-col space-y-3">
          <div className="text-center">
            <p className="text-white">
              Status:{' '}
              <span className="font-bold">
                {gameState === 'WAITING' && 'Waiting'}
                {gameState === 'PLAYING' && 'Playing'}
                {gameState === 'PAUSED' && 'Paused'}
                {gameState === 'FINISHED' && 'Finished'}
              </span>
            </p>
          </div>

          {gameState === 'WAITING' && (
            <Button onClick={startGame} size="md" className="w-full">
              Start Game
            </Button>
          )}

          {gameState === 'PLAYING' && (
            <Button onClick={pauseGame} size="md" className="w-full">
              Pause Game
            </Button>
          )}

          {gameState === 'PAUSED' && (
            <Button onClick={resumeGame} size="md" className="w-full">
              Resume Game
            </Button>
          )}

          {(gameState === 'FINISHED' || gameState === 'PAUSED') && (
            <Button onClick={restartGame} size="md" className="w-full" variant="primary">
              Restart Game
            </Button>
          )}

          <Button onClick={handleLeave} variant="secondary" size="md" className="w-full">
            Leave Room
          </Button>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        <p>Controls:</p>
        <p>Arrow keys or WASD move one cell per key press</p>
        <p>Space toggles pause and resume</p>
      </div>
    </div>
  );
};
