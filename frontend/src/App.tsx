import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { SinglePlayerGame } from './components/SinglePlayerGame';
import { GameUI } from './components/Game/GameUI';
import { ErrorBoundary } from './components/ErrorBoundary';
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
            单机模式
          </button>

          <button
            onClick={() => navigate('/multiplayer')}
            className="w-full rounded-md bg-snake-blue px-4 py-3 font-bold text-white transition-colors hover:bg-snake-blue-dark"
          >
            多人模式
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>请选择游戏模式后开始游戏。</p>
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
  const [localError, setLocalError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { connected, error: storeError, connect } = useGameStore();

  const handleJoin = async () => {
    if (!roomID || !playerID || !playerName) {
      setLocalError('请填写完整的房间和玩家信息。');
      return;
    }

    setIsLoading(true);
    setLocalError(null);

    try {
      await connect(roomID, playerID, playerName);
      navigate('/game');
    } catch (err) {
      console.error('连接过程发生错误:', err);
      setLocalError('连接游戏服务器失败，请检查网络后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || storeError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-white">
          贪吃蛇游戏 - 多人模式
        </h1>

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-400">
              {connected ? '已连接到服务器' : '尚未连接到服务器'}
            </span>
          </div>

          {displayError && (
            <div className="rounded-md border border-red-800 bg-red-900/30 p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-300">{displayError}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">房间 ID</label>
            <input
              type="text"
              value={roomID}
              onChange={(e) => setRoomID(e.target.value)}
              className="w-full rounded-md bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              placeholder="请输入房间 ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">玩家 ID</label>
            <input
              type="text"
              value={playerID}
              onChange={(e) => setPlayerID(e.target.value)}
              className="w-full rounded-md bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              placeholder="请输入玩家 ID"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">玩家昵称</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-md bg-gray-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              placeholder="请输入玩家昵称"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full rounded-md bg-indigo-600 px-4 py-3 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                正在连接...
              </span>
            ) : (
              '进入游戏'
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setRoomID('test-room');
              setPlayerID('player1');
              setPlayerName('玩家1');
              setLocalError(null);
            }}
            className="text-sm text-indigo-400 underline hover:text-indigo-300"
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
