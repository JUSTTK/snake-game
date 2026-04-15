export interface Point {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Snake {
  id?: string;
  player_id?: string;
  name?: string;
  body: Point[];
  direction: Direction;
  alive?: boolean;
  color: string;
  score?: number;
}

export interface Food {
  id?: string;
  pos: Point;
  type: 'NORMAL' | 'SPECIAL';
}

export interface Room {
  id: string;
  name: string;
  game_state: 'WAITING' | 'PLAYING' | 'PAUSED' | 'FINISHED';
  players: Snake[];
  foods: Food[];
  map_size: Point;
  created_at: string;
  updated_at: string;
}

export type GameState = 'WAITING' | 'PLAYING' | 'PAUSED' | 'FINISHED';

export interface WebSocketMessage {
  type: string;
  data?: any;
}