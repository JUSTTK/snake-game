import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../store/gameStore';
import { gameAPI } from '../services/api';
import { Room } from '../types/game';

vi.mock('../services/api', () => ({
  gameAPI: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    sendMessage: vi.fn(),
    onGameState: vi.fn(),
    onError: vi.fn(),
    onConnectionStateChange: vi.fn(),
  },
}));

vi.mock('../services/soundManager', () => ({
  soundManager: {
    initialize: vi.fn(),
    play: vi.fn(),
    playMoveTick: vi.fn(),
    setBackgroundMusicActive: vi.fn(),
  },
}));

describe('useGameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().disconnect();
  });

  it('should have correct initial state', () => {
    const state = useGameStore.getState();
    expect(state.room).toBeNull();
    expect(state.gameState).toBeNull();
    expect(state.mySnakeId).toBeNull();
    expect(state.connected).toBe(false);
    expect(state.error).toBeNull();
    expect(state.myPreviousScore).toBe(0);
    expect(state.myWasAlive).toBe(true);
  });

  it('should set room', () => {
    const room: Room = {
      id: 'room-1',
      name: 'Test Room',
      game_state: 'WAITING',
      players: [],
      foods: [],
      map_size: { x: 20, y: 15 },
      created_at: '',
      updated_at: '',
    };

    useGameStore.getState().setRoom(room);
    expect(useGameStore.getState().room).toEqual(room);
    expect(useGameStore.getState().gameState).toBe('WAITING');
  });

  it('should set connected', () => {
    useGameStore.getState().setConnected(true);
    expect(useGameStore.getState().connected).toBe(true);

    useGameStore.getState().setConnected(false);
    expect(useGameStore.getState().connected).toBe(false);
  });

  it('should set error', () => {
    useGameStore.getState().setError('test error');
    expect(useGameStore.getState().error).toBe('test error');

    useGameStore.getState().setError(null);
    expect(useGameStore.getState().error).toBeNull();
  });

  it('should set mySnakeId', () => {
    useGameStore.getState().setMySnakeId('snake-1');
    expect(useGameStore.getState().mySnakeId).toBe('snake-1');
  });

  it('should send MOVE when connected', () => {
    useGameStore.getState().setConnected(true);
    useGameStore.getState().moveSnake('UP');
    expect(gameAPI.sendMessage).toHaveBeenCalledWith('MOVE', 'UP');
  });

  it('should not send MOVE when disconnected', () => {
    useGameStore.getState().setConnected(false);
    useGameStore.getState().moveSnake('UP');
    expect(gameAPI.sendMessage).not.toHaveBeenCalled();
  });

  it('should send START_GAME when connected', () => {
    useGameStore.getState().setConnected(true);
    useGameStore.getState().startGame();
    expect(gameAPI.sendMessage).toHaveBeenCalledWith('START_GAME');
  });

  it('should send RESTART_GAME when connected', () => {
    useGameStore.getState().setConnected(true);
    useGameStore.getState().restartGame();
    expect(gameAPI.sendMessage).toHaveBeenCalledWith('RESTART_GAME');
  });

  it('should pause game when playing', () => {
    const room: Room = {
      id: 'room-1',
      name: 'Test Room',
      game_state: 'PLAYING',
      players: [],
      foods: [],
      map_size: { x: 20, y: 15 },
      created_at: '',
      updated_at: '',
    };
    useGameStore.getState().setRoom(room);
    useGameStore.getState().setConnected(true);

    useGameStore.getState().pauseGame();

    expect(useGameStore.getState().gameState).toBe('PAUSED');
    expect(gameAPI.sendMessage).toHaveBeenCalledWith('PAUSE');
  });

  it('should not pause when not playing', () => {
    const room: Room = {
      id: 'room-1',
      name: 'Test Room',
      game_state: 'WAITING',
      players: [],
      foods: [],
      map_size: { x: 20, y: 15 },
      created_at: '',
      updated_at: '',
    };
    useGameStore.getState().setRoom(room);
    useGameStore.getState().setConnected(true);

    useGameStore.getState().pauseGame();

    expect(gameAPI.sendMessage).not.toHaveBeenCalled();
  });

  it('should resume game when paused', () => {
    const room: Room = {
      id: 'room-1',
      name: 'Test Room',
      game_state: 'PAUSED',
      players: [],
      foods: [],
      map_size: { x: 20, y: 15 },
      created_at: '',
      updated_at: '',
    };
    useGameStore.getState().setRoom(room);
    useGameStore.getState().setConnected(true);

    useGameStore.getState().resumeGame();

    expect(useGameStore.getState().gameState).toBe('PLAYING');
    expect(gameAPI.sendMessage).toHaveBeenCalledWith('RESUME');
  });

  it('should leave room and disconnect', () => {
    useGameStore.getState().setConnected(true);
    useGameStore.getState().leaveRoom();

    expect(gameAPI.sendMessage).toHaveBeenCalledWith('LEAVE');
    expect(gameAPI.disconnect).toHaveBeenCalled();
    expect(useGameStore.getState().connected).toBe(false);
    expect(useGameStore.getState().room).toBeNull();
  });

  it('should reset state on disconnect', () => {
    const room: Room = {
      id: 'room-1',
      name: 'Test Room',
      game_state: 'PLAYING',
      players: [],
      foods: [],
      map_size: { x: 20, y: 15 },
      created_at: '',
      updated_at: '',
    };
    useGameStore.getState().setRoom(room);
    useGameStore.getState().setConnected(true);
    useGameStore.getState().setMySnakeId('snake-1');
    useGameStore.getState().setError('some error');

    useGameStore.getState().disconnect();

    const state = useGameStore.getState();
    expect(state.connected).toBe(false);
    expect(state.room).toBeNull();
    expect(state.gameState).toBeNull();
    expect(state.mySnakeId).toBeNull();
    expect(state.myPreviousScore).toBe(0);
    expect(state.myWasAlive).toBe(true);
    expect(state.error).toBeNull();
  });
});
