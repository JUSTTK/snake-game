import React from 'react';
import { Button } from './Button';

interface SinglePlayerControlPanelProps {
  gameState: 'idle' | 'playing' | 'paused' | 'gameOver';
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
}

export const SinglePlayerControlPanel: React.FC<SinglePlayerControlPanelProps> = ({
  gameState,
  onStart,
  onPause,
  onRestart,
}) => {
  const getStatusText = () => {
    switch (gameState) {
      case 'idle':
        return '准备开始';
      case 'playing':
        return '游戏进行中';
      case 'paused':
        return '已暂停';
      case 'gameOver':
        return '游戏结束';
      default:
        return '未知状态';
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="text-center">
        <p className="text-white">
          当前状态：<span className="font-bold">{getStatusText()}</span>
        </p>
      </div>

      <div className="flex flex-col space-y-3">
        {gameState === 'idle' && (
          <Button onClick={onStart} size="md" className="w-full">
            开始游戏
          </Button>
        )}

        {gameState === 'playing' && (
          <Button onClick={onPause} size="md" className="w-full">
            暂停游戏
          </Button>
        )}

        {gameState === 'paused' && (
          <Button onClick={onPause} size="md" className="w-full">
            继续游戏
          </Button>
        )}

        {(gameState === 'gameOver' || gameState === 'playing' || gameState === 'paused') && (
          <Button onClick={onRestart} variant="secondary" size="md" className="w-full">
            重新开始
          </Button>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-400">
        <p>操作说明：</p>
        <p>方向键或 WASD 控制移动</p>
        <p>空格键暂停或继续</p>
      </div>
    </div>
  );
};
