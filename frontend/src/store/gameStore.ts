import { create } from 'zustand';
import { Direction, GameState, Room } from '../types/game';
import { gameAPI } from '../services/api';
import { soundManager } from '../services/soundManager';

interface GameStateStore {
  room: Room | null;
  gameState: GameState | null;
  mySnakeId: string | null;
  myPreviousScore: number;
  myWasAlive: boolean;
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

const getMySnake = (room: Room | null, playerID: string, mySnakeId: string | null) =>
  room?.players.find((snake) => snake.player_id === playerID || snake.id === mySnakeId);

export const useGameStore = create<GameStateStore>((set, get) => ({
  room: null,
  gameState: null,
  mySnakeId: null,
  myPreviousScore: 0,
  myWasAlive: true,
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
    soundManager.initialize();

    try {
      gameAPI.onGameState((message) => {
        const data = message.data as Room | undefined;
        if (!data) {
          return;
        }

        const prevState = get();
        const previousRoom = prevState.room;
        const previousGameState = prevState.gameState;

        set({ room: data, gameState: data.game_state });

        const previousSnake = getMySnake(previousRoom, playerID, prevState.mySnakeId);
        const mySnake = getMySnake(data, playerID, prevState.mySnakeId);

        if (mySnake && !prevState.mySnakeId && mySnake.id) {
          set({
            mySnakeId: mySnake.id,
            myPreviousScore: mySnake.score || 0,
            myWasAlive: mySnake.alive ?? true,
          });
        }

        if (mySnake) {
          const myPreviousScore = prevState.myPreviousScore;
          const myWasAlive = prevState.myWasAlive;

          if (mySnake.score !== undefined && mySnake.score > myPreviousScore) {
            soundManager.play(mySnake.score - myPreviousScore >= 5 ? 'eat_special' : 'eat_normal');
            set({ myPreviousScore: mySnake.score });
          }

          const previousHead = previousSnake?.body[0];
          const nextHead = mySnake.body[0];
          const hasMoved =
            previousHead &&
            nextHead &&
            (previousHead.x !== nextHead.x || previousHead.y !== nextHead.y);

          if (hasMoved && (mySnake.score ?? 0) <= myPreviousScore) {
            soundManager.playMoveTick();
          }

          if ((mySnake.alive ?? true) === false && myWasAlive) {
            soundManager.play('game_over');
            set({ myWasAlive: false });
          } else if ((mySnake.alive ?? true) && !myWasAlive) {
            set({ myWasAlive: true });
          }
        }

        if (data.game_state === 'PLAYING' && previousGameState !== 'PLAYING') {
          soundManager.play('game_start');
        }
      });

      gameAPI.onError((message) => {
        const errorMessage = (message.data as string) || '发生未知错误。';
        set({ error: errorMessage });
      });

      gameAPI.onConnectionStateChange((connected) => {
        if (connected) {
          set({ connected, error: null });
        } else {
          soundManager.setBackgroundMusicActive(false);
          set({ connected, error: '连接已断开，正在尝试重新连接...' });
        }
      });

      await gameAPI.connect(roomID, playerID, playerName);
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
    soundManager.setBackgroundMusicActive(false);
    set({
      connected: false,
      room: null,
      gameState: null,
      mySnakeId: null,
      myPreviousScore: 0,
      myWasAlive: true,
      error: null,
    });
  },
}));
