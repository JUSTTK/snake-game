import type { Direction } from '../types/game';

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export const keyToDirection = (key: string): Direction | null => {
  switch (key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      return 'UP';
    case 'arrowdown':
    case 's':
      return 'DOWN';
    case 'arrowleft':
    case 'a':
      return 'LEFT';
    case 'arrowright':
    case 'd':
      return 'RIGHT';
    default:
      return null;
  }
};

export const isReverseDirection = (current: Direction, next: Direction) =>
  OPPOSITE_DIRECTION[current] === next;

export const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  );
};
