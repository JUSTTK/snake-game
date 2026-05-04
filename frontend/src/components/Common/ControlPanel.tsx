import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Button } from './Button';

interface ControlPanelProps {
  roomID: string;
  playerID: string;
  playerName: string;
}

const getGameStateLabel = (gameState: string | null) => {
  switch (gameState) {
    case 'WAITING':
      return '等待开始';
    case 'PLAYING':
      return '进行中';
    case 'PAUSED':
      return '已暂停';
    case 'FINISHED':
      return '已结束';
    default:
      return '未连接';
  }
};

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
      setError('连接游戏服务器失败。');
    }
  };

  const handleLeave = () => {
    leaveRoom();
    setConnected(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      {error && <div className="rounded-md bg-red-600 p-3 text-white">{error}</div>}

      {!connected ? (
        <Button onClick={handleJoin} size="lg" className="w-full">
          加入对局
        </Button>
      ) : (
        <div className="flex flex-col space-y-3">
          <div className="text-center">
            <p className="text-white">
              当前状态：<span className="font-bold">{getGameStateLabel(gameState)}</span>
            </p>
          </div>

          {gameState === 'WAITING' && (
            <Button onClick={startGame} size="md" className="w-full">
              开始对局
            </Button>
          )}

          {gameState === 'PLAYING' && (
            <Button onClick={pauseGame} size="md" className="w-full">
              暂停对局
            </Button>
          )}

          {gameState === 'PAUSED' && (
            <>
              <Button onClick={resumeGame} size="md" className="w-full">
                继续对局
              </Button>
              <Button onClick={restartGame} size="md" className="w-full" variant="primary">
                重新开始
              </Button>
            </>
          )}

          {gameState === 'FINISHED' && (
            <Button onClick={restartGame} size="md" className="w-full" variant="primary">
              再来一局
            </Button>
          )}

          <Button onClick={handleLeave} variant="secondary" size="md" className="w-full">
            离开房间
          </Button>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        <p>操作说明</p>
        <p>方向键或 WASD 改变移动方向</p>
        <p>游戏开始后会自动前进</p>
        <p>空格键暂停或继续</p>
      </div>
    </div>
  );
};
