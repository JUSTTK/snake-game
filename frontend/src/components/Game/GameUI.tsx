import React, { useEffect, useState } from 'react';
import { useKeyPress } from '../../hooks/useKeyPress';
import { soundManager } from '../../services/soundManager';
import { useGameStore } from '../../store/gameStore';
import { ControlPanel } from '../Common/ControlPanel';
import { ScoreBoard } from '../Common/ScoreBoard';
import { CameraModeSelector } from './CameraModeSelector';
import { CameraMode, ViewMode } from './CameraController';
import { MultiViewBoard } from './MultiViewBoard';

const getStateLabel = (state: string) => {
  switch (state) {
    case 'WAITING':
      return '等待开始';
    case 'PLAYING':
      return '进行中';
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
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [cameraMode, setCameraMode] = useState<CameraMode>('comfort');

  useKeyPress();

  useEffect(() => {
    soundManager.initialize();
  }, []);

  useEffect(() => {
    soundManager.setBackgroundMusicActive(room?.game_state === 'PLAYING');
    return () => soundManager.setBackgroundMusicActive(false);
  }, [room?.game_state]);

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mb-4 text-xl text-white">正在加载房间...</div>
          <div className="text-sm text-slate-400">
            连接状态：{connected ? '已连接' : '未连接'}
          </div>
          {error && <div className="mt-2 text-sm text-red-400">错误：{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white sm:px-6">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-5 text-center shadow-xl shadow-slate-950/30">
          <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">贪吃蛇 3D 对战</h1>
          <p className="text-slate-400">房间：{room.name}</p>
        </div>

        <div className="mb-4 text-center">
          <span
            className={`rounded-full px-4 py-2 font-medium shadow-lg ${
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

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <MultiViewBoard
            room={room}
            cellSize={1.2}
            selectedView={viewMode}
            cameraMode={cameraMode}
            onSelectView={setViewMode}
            focusSnakeId={mySnakeId || undefined}
          />

          <div className="space-y-6">
            <CameraModeSelector cameraMode={cameraMode} onChange={setCameraMode} />

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
              <h3 className="mb-4 text-xl font-bold text-white">对局信息</h3>
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-800 p-3">
                  <p className="text-sm text-slate-300">当前玩家数</p>
                  <p className="text-lg font-bold text-white">{room.players.length}/4</p>
                </div>

                <div className="rounded-2xl bg-slate-800 p-3">
                  <p className="mb-2 text-sm text-slate-300">在线玩家</p>
                  {room.players.map((player) => (
                    <div key={player.id} className="mb-1 flex items-center justify-between">
                      <span className="text-white">
                        {player.name} {player.id === mySnakeId ? '(你)' : ''}
                      </span>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          player.alive ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      >
                        {player.alive ? '存活' : '出局'}
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

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
              <ScoreBoard players={room.players} mySnakeId={mySnakeId} />

              <div className="mt-6">
                <h3 className="mb-3 text-xl font-bold text-white">玩法说明</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>紧跟模式更灵敏，舒适模式更平滑。</li>
                  <li>右侧“全地图俯视”可以快速定位食物位置。</li>
                  <li>移动、转向、开局、吃食物和失败都带有声音反馈。</li>
                  <li>游戏进行中会自动播放背景音乐，暂停时会停止。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
