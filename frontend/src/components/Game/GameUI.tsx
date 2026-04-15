import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useKeyPress } from '../../hooks/useKeyPress';
import { ScoreBoard } from '../Common/ScoreBoard';
import { ControlPanel } from '../Common/ControlPanel';
import { GameBoard } from './GameBoard';

const getStateLabel = (state: string) => {
  switch (state) {
    case 'WAITING':
      return '等待中';
    case 'PLAYING':
      return '游戏中';
    case 'PAUSED':
      return '已暂停';
    case 'FINISHED':
      return '已结束';
    default:
      return state;
  }
};

export const GameUI: React.FC = () => {
  const { room, mySnakeId, connected, error } = useGameStore();
  useKeyPress();

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mb-4 text-xl text-white">加载中...</div>
          <div className="text-sm text-gray-400">
            连接状态: {connected ? '已连接' : '未连接'}
          </div>
          {error && <div className="mt-2 text-sm text-red-400">错误: {error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">贪吃蛇游戏</h1>
          <p className="text-gray-400">房间: {room.name}</p>
        </div>

        <div className="mb-4 text-center">
          <span
            className={`rounded-full px-4 py-2 font-medium ${
              room.game_state === 'WAITING'
                ? 'bg-yellow-600 text-yellow-100'
                : room.game_state === 'PLAYING'
                  ? 'bg-green-600 text-green-100'
                  : room.game_state === 'PAUSED'
                    ? 'bg-blue-600 text-blue-100'
                    : 'bg-red-600 text-red-100'
            }`}
          >
            {getStateLabel(room.game_state)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-gray-800 p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-bold text-white">游戏控制</h3>
              <div className="space-y-4">
                <div className="rounded bg-gray-700 p-3">
                  <p className="text-sm text-gray-300">玩家数量</p>
                  <p className="text-lg font-bold text-white">{room.players.length}/4</p>
                </div>

                <div className="rounded bg-gray-700 p-3">
                  <p className="mb-2 text-sm text-gray-300">在线玩家</p>
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className="mb-1 flex items-center justify-between"
                    >
                      <span className="text-white">
                        {player.name} {player.id === mySnakeId && '(你)'}
                      </span>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          player.alive ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      >
                        {player.alive ? '存活' : '已出局'}
                      </span>
                    </div>
                  ))}
                </div>

                <ControlPanel
                  roomID={room.id}
                  playerID={mySnakeId || ''}
                  playerName={
                    mySnakeId
                      ? room.players.find((snake) => snake.id === mySnakeId)?.name || '玩家'
                      : '玩家'
                  }
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg bg-gray-800 p-6 shadow-lg">
              <div className="flex justify-center">
                <GameBoard room={room} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <ScoreBoard players={room.players} mySnakeId={mySnakeId} />

            <div className="mt-6 rounded-lg bg-gray-800 p-6 shadow-lg">
              <h3 className="mb-3 text-xl font-bold text-white">游戏说明</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>使用方向键或 WASD 控制蛇移动</li>
                <li>每按一次方向键前进一格</li>
                <li>空格键可暂停或继续游戏</li>
                <li>吃到食物可以增加分数</li>
                <li>撞墙或撞到身体会导致失败</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
