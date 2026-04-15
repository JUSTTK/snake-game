import { create } from 'zustand';
import { Room, GameState, Snake, Direction } from '../types/game';
import { gameAPI } from '../services/api';

interface GameStateStore {
  // State
  room: Room | null;
  gameState: GameState | null;
  mySnakeId: string | null;
  connected: boolean;
  error: string | null;

  // Actions
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
  // Initial state
  room: null,
  gameState: null,
  mySnakeId: null,
  connected: false,
  error: null,

  // Actions
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
        room: state.room
          ? { ...state.room, game_state: 'PAUSED' }
          : null,
      }));
      gameAPI.sendMessage('PAUSE');
    }
  },

  resumeGame: () => {
    const { connected, gameState } = get();
    if (connected && gameState === 'PAUSED') {
      set((state) => ({
        gameState: 'PLAYING',
        room: state.room
          ? { ...state.room, game_state: 'PLAYING' }
          : null,
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
    console.log('Game store connecting to room:', roomID, playerID, playerName);
    try {
      // Subscribe before connecting so the first GAME_STATE isn't missed
      gameAPI.onGameState((message) => {
        console.log('Game state received:', message);
        const data = message.data;
        if (data) {
          console.log('Room data:', data);
          set({ room: data, gameState: data.game_state });

          // Find and store my snake ID
          if (data.players) {
            const mySnake = data.players.find((p: Snake) =>
              p.player_id === playerID
            );
            if (mySnake) {
              set({ mySnakeId: mySnake.id });
              console.log('Found my snake:', mySnake);
            }
          }
        }
      });

      // Handle errors
      gameAPI.onError((message) => {
        console.error('WebSocket error:', message);
        set({ error: message.data });
      });

      await gameAPI.connect(roomID, playerID, playerName);
      console.log('Connected to server');
      set({ connected: true, error: null });
    } catch (error) {
      console.error('Connection failed:', error);
      set({ error: 'Failed to connect to game server' });
    }
  },

  disconnect: () => {
    gameAPI.disconnect();
    set({
      connected: false,
      room: null,
      gameState: null,
      mySnakeId: null,
      error: null
    });
  },
}));
