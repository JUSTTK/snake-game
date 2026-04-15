import React, { useEffect, useRef } from 'react';
import { Room, Snake } from '../../types/game';

interface GameBoardProps {
  room: Room;
  cellSize?: number;
  className?: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({ room, cellSize = 24, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = room.map_size.x;
    const height = room.map_size.y;

    canvas.width = width * cellSize;
    canvas.height = height * cellSize;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }

    if (room.foods) {
      room.foods.forEach((food) => {
        const x = food.pos.x * cellSize + cellSize / 2;
        const y = food.pos.y * cellSize + cellSize / 2;
        const radius = cellSize / 2 - 2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = food.type === 'NORMAL' ? '#ef4444' : '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    const drawSnake = (snake: Snake) => {
      snake.body.forEach((segment, index) => {
        const x = segment.x * cellSize;
        const y = segment.y * cellSize;

        if (index === 0) {
          ctx.fillStyle = snake.color || '#4ade80';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
          ctx.strokeStyle = '#166534';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

          ctx.fillStyle = 'white';
          const eyeSize = 3;
          if (snake.direction === 'RIGHT') {
            ctx.fillRect(x + cellSize - 8, y + 8, eyeSize, eyeSize);
            ctx.fillRect(x + cellSize - 8, y + cellSize - 11, eyeSize, eyeSize);
          } else if (snake.direction === 'LEFT') {
            ctx.fillRect(x + 5, y + 8, eyeSize, eyeSize);
            ctx.fillRect(x + 5, y + cellSize - 11, eyeSize, eyeSize);
          } else if (snake.direction === 'UP') {
            ctx.fillRect(x + 8, y + 5, eyeSize, eyeSize);
            ctx.fillRect(x + cellSize - 11, y + 5, eyeSize, eyeSize);
          } else if (snake.direction === 'DOWN') {
            ctx.fillRect(x + 8, y + cellSize - 8, eyeSize, eyeSize);
            ctx.fillRect(x + cellSize - 11, y + cellSize - 8, eyeSize, eyeSize);
          }
        } else {
          ctx.fillStyle = snake.color || '#4ade80';
          ctx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
          ctx.strokeStyle = '#166534';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
        }
      });
    };

    if (room.players) {
      room.players.forEach((snake) => {
        if (snake && snake.body && snake.body.length > 0) {
          drawSnake(snake);
        }
      });
    }
  }, [room, cellSize]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-700 rounded-lg shadow-lg"
      />
    </div>
  );
};
