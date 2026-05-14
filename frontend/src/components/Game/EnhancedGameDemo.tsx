import React, { useState, useCallback } from 'react';
import { ThreeJSGameBoardEnhanced } from './ThreeJSGameBoardEnhanced';
import { Room, Snake, Food } from '../../types/game';
import { SinglePlayerGameState } from '../SinglePlayerGame';

interface EnhancedGameDemoProps {
  width?: number;
  height?: number;
  cellSize?: number;
}

const createDemoRoom = (width: number, height: number): Room => {
  const snake1: Snake = {
    id: 'snake1',
    name: '玩家1',
    body: [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
    ],
    direction: 'RIGHT',
    color: '#10b981',
    score: 5,
    alive: true,
  };

  const snake2: Snake = {
    id: 'snake2',
    name: '玩家2',
    body: [
      { x: 15, y: 10 },
      { x: 14, y: 10 },
      { x: 13, y: 10 },
    ],
    direction: 'LEFT',
    color: '#3b82f6',
    score: 3,
    alive: true,
  };

  const food1: Food = {
    pos: { x: 10, y: 8 },
    type: 'NORMAL',
  };

  const food2: Food = {
    pos: { x: 3, y: 12 },
    type: 'SPECIAL',
  };

  return {
    id: 'demo-room',
    name: '演示房间',
    game_state: 'PLAYING',
    players: [snake1, snake2],
    foods: [food1, food2],
    map_size: { x: width, y: height },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const EnhancedGameDemo: React.FC<EnhancedGameDemoProps> = ({
  width = 20,
  height = 15,
  cellSize = 1.2,
}) => {
  const [room, setRoom] = useState<Room>(createDemoRoom(width, height));
  const [gameState, setGameState] = useState<SinglePlayerGameState>('playing');
  const [showEffects, setShowEffects] = useState(true);

  // 模拟游戏逻辑
  const simulateGame = useCallback(() => {
    setRoom(prevRoom => {
      const newRoom = { ...prevRoom };
      
      // 移动蛇
      newRoom.players.forEach(snake => {
        if (snake.alive) {
          const head = { ...snake.body[0] };
          switch (snake.direction) {
            case 'UP': head.y -= 1; break;
            case 'DOWN': head.y += 1; break;
            case 'LEFT': head.x -= 1; break;
            case 'RIGHT': head.x += 1; break;
          }
          
          // 检查边界
          if (head.x >= 0 && head.x < width && head.y >= 0 && head.y < height) {
            snake.body = [head, ...snake.body.slice(0, -1)];
          }
        }
      });
      
      // 随机生成新食物
      if (Math.random() < 0.1) {
        const newFood: Food = {
          pos: {
            x: Math.floor(Math.random() * width),
            y: Math.floor(Math.random() * height),
          },
          type: Math.random() > 0.7 ? 'SPECIAL' : 'NORMAL',
        };
        newRoom.foods.push(newFood);
      }
      
      // 限制食物数量
      if (newRoom.foods.length > 5) {
        newRoom.foods.shift();
      }
      
      return newRoom;
    });
  }, [width, height]);

  // 游戏循环
  React.useEffect(() => {
    if (gameState !== 'playing') return;
    
    const gameLoop = setInterval(simulateGame, 500);
    return () => clearInterval(gameLoop);
  }, [gameState, simulateGame]);

  const toggleEffects = () => {
    setShowEffects(!showEffects);
  };

  const resetDemo = () => {
    setRoom(createDemoRoom(width, height));
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-4 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-5 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">3D 效果增强演示</h1>
              <p className="mt-2 text-sm text-slate-400">
                展示粒子效果、蛇身残影、动态光照和3D音效
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleEffects}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
              >
                {showEffects ? '关闭特效' : '开启特效'}
              </button>
              <button
                onClick={resetDemo}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                重置演示
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/70 shadow-2xl shadow-slate-950/40">
            <ThreeJSGameBoardEnhanced
              room={room}
              cellSize={cellSize}
              viewMode="isometric"
              cameraMode="comfort"
              allowOrbitControls={true}
              focusSnakeId="snake1"
              cameraTargetMode="follow"
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
              <h3 className="mb-4 text-xl font-bold text-white">效果说明</h3>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>粒子效果：吃食物时的爆炸效果</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>蛇身残影：移动时的轨迹效果</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  <span>动态光照：根据蛇身长度调整</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <span>3D音效：空间音频定位</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
              <h3 className="mb-4 text-xl font-bold text-white">游戏状态</h3>
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-800 p-3">
                  <p className="text-sm text-slate-300">当前状态</p>
                  <p className="text-lg font-bold text-green-400">{gameState}</p>
                </div>
                <div className="rounded-2xl bg-slate-800 p-3">
                  <p className="text-sm text-slate-300">玩家数量</p>
                  <p className="text-lg font-bold text-white">{room.players.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-800 p-3">
                  <p className="text-sm text-slate-300">食物数量</p>
                  <p className="text-lg font-bold text-white">{room.foods.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30">
              <h3 className="mb-4 text-xl font-bold text-white">操作说明</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• 鼠标拖拽：旋转视角</li>
                <li>• 鼠标滚轮：缩放视图</li>
                <li>• 右侧预览：快速切换视角</li>
                <li>• 特效开关：控制视觉效果</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};