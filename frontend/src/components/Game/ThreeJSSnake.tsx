import React from 'react';
import { Box, Sphere } from '@react-three/drei';
import { Point, Direction, Snake } from '../../types/game';

interface ThreeJSSnakeProps {
  snake: Snake;
  cellSize: number;
}

export const ThreeJSSnake: React.FC<ThreeJSSnakeProps> = ({ snake, cellSize }) => {
  return (
    <group>
      {snake.body.map((segment: Point, index: number) => {
        const x = segment.x * cellSize + cellSize / 2;
        const z = segment.y * cellSize + cellSize / 2;
        const isHead = index === 0;

        return (
          <group key={`${snake.id || 'snake'}-${index}`} position={[x, cellSize / 2, z]}>
            {/* Snake body segment */}
            <Box args={[cellSize - 0.04, cellSize - 0.04, cellSize - 0.04]}>
              <meshStandardMaterial color={snake.color} />
            </Box>

            {/* Eyes on the head */}
            {isHead && <Eyes direction={snake.direction} cellSize={cellSize} />}
          </group>
        );
      })}
    </group>
  );
};

interface EyesProps {
  direction: Direction;
  cellSize: number;
}

const Eyes: React.FC<EyesProps> = ({ direction, cellSize }) => {
  const eyeSize = cellSize * 0.15;
  const eyeOffset = cellSize * 0.2;
  const eyeZOffset = cellSize * 0.35;

  const getEyePositions = (): [number, number, number][] => {
    switch (direction) {
      case 'UP':
        return [
          [eyeOffset, cellSize * 0.15, eyeZOffset],
          [-eyeOffset, cellSize * 0.15, eyeZOffset],
        ];
      case 'DOWN':
        return [
          [eyeOffset, cellSize * 0.15, -eyeZOffset],
          [-eyeOffset, cellSize * 0.15, -eyeZOffset],
        ];
      case 'LEFT':
        return [
          [-eyeZOffset, cellSize * 0.15, eyeOffset],
          [-eyeZOffset, cellSize * 0.15, -eyeOffset],
        ];
      case 'RIGHT':
        return [
          [eyeZOffset, cellSize * 0.15, eyeOffset],
          [eyeZOffset, cellSize * 0.15, -eyeOffset],
        ];
    }
  };

  return (
    <>
      {getEyePositions().map((position, index) => (
        <Sphere key={`eye-${index}`} args={[eyeSize, 16, 16]} position={position}>
          <meshStandardMaterial color="white" />
        </Sphere>
      ))}
    </>
  );
};
