export interface Point {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type FoodType = 'NORMAL' | 'SPECIAL' | 'SLOW' | 'SHIELD' | 'SHRINK';

export interface Snake {
  id?: string;
  player_id?: string;
  name?: string;
  body: Point[];
  direction: Direction;
  alive?: boolean;
  color: string;
  score?: number;
  shielded?: boolean;
  shieldTimer?: number;
  slowed?: boolean;
  slowTimer?: number;
}

export interface Food {
  id?: string;
  pos: Point;
  type: FoodType;
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
  data?: unknown;
}

export const FOOD_CONFIG: Record<FoodType, { color: string; emissive: string; score: number; label: string }> = {
  NORMAL:  { color: '#fb7185', emissive: '#7f1d1d', score: 1,  label: '普通食物' },
  SPECIAL: { color: '#facc15', emissive: '#ca8a04', score: 5,  label: '特殊食物' },
  SLOW:    { color: '#38bdf8', emissive: '#1e3a5f', score: 2,  label: '减速食物' },
  SHIELD:  { color: '#fbbf24', emissive: '#92400e', score: 3,  label: '护盾食物' },
  SHRINK:  { color: '#f87171', emissive: '#7f1d1d', score: 2,  label: '缩短食物' },
};