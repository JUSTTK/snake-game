import React from 'react';

interface ThreeJSFloorProps {
  width: number;
  height: number;
  cellSize: number;
}

export const ThreeJSFloor: React.FC<ThreeJSFloorProps> = ({ width, height, cellSize }) => {
  return (
    <>
      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2 * cellSize, -0.01, height / 2 * cellSize]}>
        <planeGeometry args={[width * cellSize, height * cellSize]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Colorful checkered floor */}
      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const isEven = (x + y) % 2 === 0;
          return (
            <mesh
              key={`${x}-${y}`}
              position={[
                x * cellSize + cellSize / 2,
                0,
                y * cellSize + cellSize / 2
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[cellSize - 0.02, cellSize - 0.02]} />
              <meshStandardMaterial color={isEven ? '#3b82f6' : '#10b981'} />
            </mesh>
          );
        })
      )}

      {/* Walls */}
      <mesh position={[-0.5, cellSize / 2, height / 2 * cellSize]}>
        <boxGeometry args={[1, cellSize, height * cellSize]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
      <mesh position={[width * cellSize + 0.5, cellSize / 2, height / 2 * cellSize]}>
        <boxGeometry args={[1, cellSize, height * cellSize]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
      <mesh position={[width / 2 * cellSize, cellSize / 2, -0.5]}>
        <boxGeometry args={[width * cellSize, cellSize, 1]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
      <mesh position={[width / 2 * cellSize, cellSize / 2, height * cellSize + 0.5]}>
        <boxGeometry args={[width * cellSize, cellSize, 1]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
    </>
  );
};
