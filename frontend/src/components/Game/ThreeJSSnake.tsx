import React from 'react';
import { RoundedBox, Sphere } from '@react-three/drei';
import { Direction, Point, Snake } from '../../types/game';

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
        const scale = isHead ? 1.08 : Math.max(0.82, 1 - index * 0.035);
        const segmentSize = cellSize * 0.76 * scale;
        const segmentHeight = cellSize * (isHead ? 0.72 : 0.58);

        return (
          <group key={`${snake.id || 'snake'}-${index}`} position={[x, segmentHeight / 2, z]}>
            <RoundedBox
              args={[segmentSize, segmentHeight, segmentSize]}
              radius={cellSize * 0.16}
              smoothness={4}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={snake.color}
                roughness={0.38}
                metalness={0.12}
                emissive={snake.color}
                emissiveIntensity={isHead ? 0.18 : 0.08}
              />
            </RoundedBox>

            <mesh position={[0, segmentHeight * 0.3, 0]} castShadow>
              <boxGeometry args={[segmentSize * 0.6, segmentHeight * 0.16, segmentSize * 0.45]} />
              <meshStandardMaterial color="#ecfeff" transparent opacity={0.16} />
            </mesh>

            {isHead && (
              <Eyes
                direction={snake.direction}
                cellSize={cellSize}
                segmentHeight={segmentHeight}
              />
            )}
          </group>
        );
      })}
    </group>
  );
};

interface EyesProps {
  direction: Direction;
  cellSize: number;
  segmentHeight: number;
}

const Eyes: React.FC<EyesProps> = ({ direction, cellSize, segmentHeight }) => {
  const eyeSize = cellSize * 0.15;
  const eyeOffset = cellSize * 0.2;
  const eyeZOffset = cellSize * 0.3;

  const getEyePositions = (): [number, number, number][] => {
    switch (direction) {
      case 'UP':
        return [
          [eyeOffset, segmentHeight * 0.15, -eyeZOffset],
          [-eyeOffset, segmentHeight * 0.15, -eyeZOffset],
        ];
      case 'DOWN':
        return [
          [eyeOffset, segmentHeight * 0.15, eyeZOffset],
          [-eyeOffset, segmentHeight * 0.15, eyeZOffset],
        ];
      case 'LEFT':
        return [
          [-eyeZOffset, segmentHeight * 0.15, eyeOffset],
          [-eyeZOffset, segmentHeight * 0.15, -eyeOffset],
        ];
      case 'RIGHT':
        return [
          [eyeZOffset, segmentHeight * 0.15, eyeOffset],
          [eyeZOffset, segmentHeight * 0.15, -eyeOffset],
        ];
    }
  };

  const getPupilOffset = (): [number, number, number] => {
    switch (direction) {
      case 'UP':
        return [0, 0, -eyeSize * 0.35];
      case 'DOWN':
        return [0, 0, eyeSize * 0.35];
      case 'LEFT':
        return [-eyeSize * 0.35, 0, 0];
      case 'RIGHT':
        return [eyeSize * 0.35, 0, 0];
    }
  };

  const pupilOffset = getPupilOffset();

  return (
    <>
      {getEyePositions().map((position, index) => (
        <group key={`eye-${index}`} position={position}>
          <Sphere args={[eyeSize, 16, 16]} castShadow>
            <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.05} />
          </Sphere>
          <Sphere args={[eyeSize * 0.38, 12, 12]} position={pupilOffset}>
            <meshStandardMaterial color="#020617" />
          </Sphere>
        </group>
      ))}
    </>
  );
};
