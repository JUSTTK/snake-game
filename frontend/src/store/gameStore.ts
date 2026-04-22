import { create } from 'zustand';
import { Room, GameState, Snake, Direction } from '../types/game';
import { gameAPI } from '../services/api';

interface GameStateStore {
  room: Room | null;
  gameState: GameState | null;
  mySnakeId: string | null;
  connected: boolean;
  error: string | null;
  setRoom: (room: Room) => void;
  setMySnakeId: (snakeId: string) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  moveSnake: (direction: Direction) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  leaveRoom: () => void;
  connect: (roomID: string, playerID: string, playerName: string) => Promise<void>;
  disconnect: () => void;
}

export const useGameStore = create<GameStateStore>((set, get) => ({
  room: null,
  gameState: null,
  mySnakeId: null,
  connected: false,
  error: null,

  setRoom: (room) => set({ room, gameState: room.game_state }),
  setMySnakeId: (snakeId) => set({ mySnakeId: snakeId }),
  setConnected: (connected) => set({ connected }),
  setError: (error) => set({ error }),

  moveSnake: (direction) => {
    const { connected } = get();
    if (connected) {
      gameAPI.sendMessage('MOVE', direction);
    }
  },

  startGame: () => {
    const { connected } = get();
    if (connected) {
      gameAPI.sendMessage('START_GAME');
    }
  },

  pauseGame: () => {
    const { connected, gameState } = get();
    if (connected && gameState === 'PLAYING') {
      set((state) => ({
        gameState: 'PAUSED',
        room: state.room ? { ...state.room, game_state: 'PAUSED' } : null,
      }));
      gameAPI.sendMessage('PAUSE');
    }
  },

  resumeGame: () => {
    const { connected, gameState } = get();
    if (connected && gameState === 'PAUSED') {
      set((state) => ({
        gameState: 'PLAYING',
        room: state.room ? { ...state.room, game_state: 'PLAYING' } : null,
      }));
      gameAPI.sendMessage('RESUME');
    }
  },

  restartGame: () => {
    const { connected } = get();
    if (connected) {
      gameAPI.sendMessage('RESTART_GAME');
    }
  },

  leaveRoom: () => {
    const { connected } = get();
    if (connected) {
      gameAPI.sendMessage('LEAVE');
      get().disconnect();
    }
  },

  connect: async (roomID: string, playerID: string, playerName: string) => {
    console.log('正在加入房间:', roomID, playerID, playerName);

    try {
      gameAPI.onGameState((message) => {
        console.log('收到游戏状态:', message);
        const data = message.data;
        if (data) {
          set({ room: data, gameState: data.game_state });

          if (data.players) {
            const mySnake = data.players.find((p: Snake) => p.player_id === playerID);
            if (mySnake) {
              set({ mySnakeId: mySnake.id });
              console.log('已识别当前玩家的蛇:', mySnake);
            }
          }
        }
      });

      gameAPI.onError((message) => {
        console.error('WebSocket 错误:', message);
        const errorMessage = message.data || '发生未知错误。';
        set({ error: errorMessage });
      });

      gameAPI.onConnectionStateChange((connected) => {
        console.log('连接状态变化:', connected);
        if (connected) {
          set({ connected, error: null });
        } else {
          set({ connected, error: '连接已断开，正在尝试重新连接...' });
        }
      });

      await gameAPI.connect(roomID, playerID, playerName);
      console.log('已连接到服务器');
      set({ connected: true, error: null });
    } catch (error) {
      console.error('连接失败:', error);
      set({
        connected: false,
        error: '连接服务器失败，请检查网络连接后重试。',
      });
    }
  },

  disconnect: () => {
    gameAPI.disconnect();
    set({
      connected: false,
      room: null,
      gameState: null,
      mySnakeId: null,
      error: null,
    });
  },
}));
