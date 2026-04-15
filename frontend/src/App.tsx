import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { SinglePlayerGame } from './components/SinglePlayerGame';
import { GameUI } from './components/Game/GameUI';
import { useGameStore } from './store/gameStore';

const ModeSelectionPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">贪吃蛇游戏</h1>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/single-player')}
            className="w-full rounded-md bg-snake-green px-4 py-3 font-bold text-white transition-colors hover:bg-snake-dark"
          >
            单人模式
          </button>

          <button
            onClick={() => navigate('/multiplayer')}
            className="w-full rounded-md bg-snake-blue px-4 py-3 font-bold text-white transition-colors hover:bg-snake-blue-dark"
          >
            多人模式
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>选择游戏模式开始游玩</p>
        </div>
      </div>
    </div>
  );
};

const MultiplayerLoginPage = () => {
  const [roomID, setRoomID] = useState('test-room');
  const [playerID, setPlayerID] = useState('player1');
  const [playerName, setPlayerName] = useState('玩家1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { connected, connect } = useGameStore();

  const handleJoin = async () => {
    if (!roomID || !playerID || !playerName) {
      alert('请填写所有字段');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await connect(roomID, playerID, playerName);
      navigate('/game');
    } catch (err) {
      console.error('Connection error:', err);
      setError('连接游戏服务器失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">贪吃蛇游戏 - 多人模式</h1>

        <div className="mb-4 text-center">
          <p className="text-sm text-gray-400">
            连接状态: {connected ? '已连接' : '未连接'}
          </p>
          {error && <p className="mt-1 text-xs text-red-400">错误: {error}</p>}
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-600 p-3 text-white">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-gray-300">房间 ID</label>
            <input
              type="text"
              value={roomID}
              onChange={(e) => setRoomID(e.target.value)}
              className="w-full rounded-md bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-snake-green"
              placeholder="输入房间 ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-gray-300">玩家 ID</label>
            <input
              type="text"
              value={playerID}
              onChange={(e) => setPlayerID(e.target.value)}
              className="w-full rounded-md bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-snake-green"
              placeholder="输入玩家 ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-gray-300">玩家昵称</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-md bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-snake-green"
              placeholder="输入玩家昵称"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full rounded-md bg-snake-green px-4 py-2 font-bold text-white transition-colors hover:bg-snake-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '连接中...' : '进入游戏'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setRoomID('test-room');
              setPlayerID('player1');
              setPlayerName('玩家1');
            }}
            className="text-sm text-snake-green underline hover:text-snake-green-dash"
          >
            使用测试数据
          </button>
        </div>
      </div>
    </div>
  );
};

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ModeSelectionPage />} />
        <Route path="/single-player" element={<SinglePlayerGame />} />
        <Route path="/multiplayer" element={<MultiplayerLoginPage />} />
        <Route path="/game" element={<GameUI />} />
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center bg-gray-900">
              <div className="text-white">404 - 页面未找到</div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
