import React from 'react';

interface ThreeJSFloorProps {
  width: number;
  height: number;
  cellSize: number;
}

export const ThreeJSFloor: React.FC<ThreeJSFloorProps> = ({ width, height, cellSize }) => {
  const boardWidth = width * cellSize;
  const boardHeight = height * cellSize;
  const centerX = boardWidth / 2;
  const centerZ = boardHeight / 2;

  return (
    <>
      <mesh position={[centerX, -cellSize * 0.28, centerZ]} receiveShadow>
        <boxGeometry
          args={[boardWidth + cellSize * 1.8, cellSize * 0.5, boardHeight + cellSize * 1.8]}
        />
        <meshStandardMaterial color="#0f172a" roughness={0.82} />
      </mesh>

      {Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) => {
          const isEven = (x + y) % 2 === 0;
          const tileColor = isEven ? '#1d4ed8' : '#0f766e';
          return (
            <mesh
              key={`${x}-${y}`}
              position={[
                x * cellSize + cellSize / 2,
                -cellSize * 0.05 + (isEven ? 0 : cellSize * 0.015),
                y * cellSize + cellSize / 2,
              ]}
              receiveShadow
            >
              <boxGeometry args={[cellSize * 0.96, cellSize * 0.12, cellSize * 0.96]} />
              <meshStandardMaterial color={tileColor} roughness={0.55} metalness={0.08} />
            </mesh>
          );
        })
      )}

      <mesh position={[-cellSize * 0.25, cellSize * 0.36, centerZ]} castShadow receiveShadow>
        <boxGeometry args={[cellSize * 0.32, cellSize * 0.68, boardHeight + cellSize * 0.8]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0c4a6e"
          emissiveIntensity={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh
        position={[boardWidth + cellSize * 0.25, cellSize * 0.36, centerZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[cellSize * 0.32, cellSize * 0.68, boardHeight + cellSize * 0.8]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0c4a6e"
          emissiveIntensity={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh position={[centerX, cellSize * 0.36, -cellSize * 0.25]} castShadow receiveShadow>
        <boxGeometry args={[boardWidth + cellSize * 0.8, cellSize * 0.68, cellSize * 0.32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0c4a6e"
          emissiveIntensity={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh
        position={[centerX, cellSize * 0.36, boardHeight + cellSize * 0.25]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[boardWidth + cellSize * 0.8, cellSize * 0.68, cellSize * 0.32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0c4a6e"
          emissiveIntensity={0.2}
          transparent
          opacity={0.75}
        />
      </mesh>
    </>
  );
};
