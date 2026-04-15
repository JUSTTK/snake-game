import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const DebugPanel: React.FC = () => {
  const { room, connected, mySnakeId, error } = useGameStore();

  const testAPI = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      console.log('API Response:', data);
    } catch (err) {
      console.error('API Error:', err);
    }
  };

  return (
    <div className="mb-4 rounded-lg bg-gray-800 p-4">
      <h3 className="mb-2 text-lg font-bold text-white">调试信息</h3>
      <button
        onClick={testAPI}
        className="mb-2 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
      >
        测试 API
      </button>
      <div className="space-y-1 text-sm text-gray-300">
        <p>连接状态: {connected ? '已连接' : '未连接'}</p>
        <p>房间状态: {room ? '已加入房间' : '未加入房间'}</p>
        <p>我的蛇 ID: {mySnakeId || '无'}</p>
        {error && <p className="text-red-400">错误: {error}</p>}
      </div>
    </div>
  );
};
