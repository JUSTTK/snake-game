import React, { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { Direction, Room, Snake } from '../../types/game';
import { CameraController, CameraMode } from './CameraController';
import { ThreeJSFloor } from './ThreeJSFloor';
import { ThreeJSFood } from './ThreeJSFood';
import { ThreeJSSnake } from './ThreeJSSnake';

export type CameraTargetMode = 'follow' | 'overview';

interface ThreeJSGameBoardProps {
  room: Room;
  cellSize?: number;
  viewMode?: 'top' | 'isometric' | 'perspective';
  cameraMode?: CameraMode;
  allowOrbitControls?: boolean;
  focusSnakeId?: string;
  cameraTargetMode?: CameraTargetMode;
}

const DIRECTION_VECTORS: Record<Direction, { x: number; z: number }> = {
  UP: { x: 0, z: -1 },
  DOWN: { x: 0, z: 1 },
  LEFT: { x: -1, z: 0 },
  RIGHT: { x: 1, z: 0 },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getTrackedSnake = (players: Snake[], focusSnakeId?: string) => {
  if (focusSnakeId) {
    const matchedSnake = players.find((snake) => snake.id === focusSnakeId);
    if (matchedSnake) {
      return matchedSnake;
    }
  }

  return players.find((snake) => snake.alive !== false) ?? players[0] ?? null;
};

const getCameraFocusState = (
  room: Room,
  cellSize: number,
  cameraMode: CameraMode,
  cameraTargetMode: CameraTargetMode,
  focusSnakeId?: string
): { focusPoint: [number, number, number]; visibleSpan: number } => {
  const boardWidth = room.map_size.x * cellSize;
  const boardHeight = room.map_size.y * cellSize;
  const boardSpan = Math.max(boardWidth, boardHeight);
  const overviewPadding = cellSize * 1.8;

  if (cameraTargetMode === 'overview') {
    return {
      focusPoint: [boardWidth / 2, 0.2, boardHeight / 2],
      visibleSpan: Math.max(boardSpan + overviewPadding, cellSize * 10),
    };
  }

  const baseFocus: [number, number, number] = [boardWidth / 2, 0.2, boardHeight / 2];
  const trackedSnake = getTrackedSnake(room.players ?? [], focusSnakeId);

  if (!trackedSnake || trackedSnake.body.length === 0) {
    return {
      focusPoint: baseFocus,
      visibleSpan: clamp(boardSpan * 0.68, cellSize * 9, boardSpan),
    };
  }

  const head = trackedSnake.body[0];
  const headX = head.x * cellSize + cellSize / 2;
  const headZ = head.y * cellSize + cellSize / 2;
  const directionVector = DIRECTION_VECTORS[trackedSnake.direction] ?? DIRECTION_VECTORS.RIGHT;
  const leadDistance =
    cameraMode === 'tight'
      ? cellSize * clamp(1.2 + trackedSnake.body.length * 0.05, 1.2, 2.4)
      : cellSize * clamp(1.8 + trackedSnake.body.length * 0.08, 1.8, 3.1);

  let focusX = headX + directionVector.x * leadDistance;
  let focusZ = headZ + directionVector.z * leadDistance;

  let nearestFoodDistance = cellSize * 7;
  let nearestFoodX = headX;
  let nearestFoodZ = headZ;

  if (room.foods?.length) {
    for (const food of room.foods) {
      const foodX = food.pos.x * cellSize + cellSize / 2;
      const foodZ = food.pos.y * cellSize + cellSize / 2;
      const distance = Math.hypot(foodX - headX, foodZ - headZ);

      if (distance < nearestFoodDistance) {
        nearestFoodDistance = distance;
        nearestFoodX = foodX;
        nearestFoodZ = foodZ;
      }
    }
  }

  const foodWeight = cameraMode === 'tight' ? 0.06 : 0.12;
  focusX = focusX * (1 - foodWeight) + ((headX + nearestFoodX) / 2) * foodWeight;
  focusZ = focusZ * (1 - foodWeight) + ((headZ + nearestFoodZ) / 2) * foodWeight;

  const margin = cellSize * 2;
  focusX = clamp(focusX, margin, boardWidth - margin);
  focusZ = clamp(focusZ, margin, boardHeight - margin);

  const bodySpan =
    cameraMode === 'tight'
      ? clamp(trackedSnake.body.length * cellSize * 0.75, cellSize * 6.2, cellSize * 9.4)
      : clamp(trackedSnake.body.length * cellSize * 0.9, cellSize * 7, cellSize * 11.4);
  const foodSpan =
    cameraMode === 'tight'
      ? clamp(nearestFoodDistance * 1.05, cellSize * 6.8, boardSpan * 0.54)
      : clamp(nearestFoodDistance * 1.22, cellSize * 7.8, boardSpan * 0.68);

  const visibleSpan = clamp(
    Math.max(bodySpan, foodSpan, cameraMode === 'tight' ? cellSize * 6.9 : cellSize * 7.8),
    cameraMode === 'tight' ? cellSize * 6.9 : cellSize * 7.8,
    boardSpan * (cameraMode === 'tight' ? 0.66 : 0.8)
  );

  return {
    focusPoint: [focusX, 0.2, focusZ],
    visibleSpan,
  };
};

export const ThreeJSGameBoard: React.FC<ThreeJSGameBoardProps> = ({
  room,
  cellSize = 1,
  viewMode = 'isometric',
  cameraMode = 'comfort',
  allowOrbitControls = false,
  focusSnakeId,
  cameraTargetMode = 'follow',
}) => {
  const width = room.map_size.x;
  const height = room.map_size.y;
  const boardSpan = Math.max(width, height) * cellSize;

  const { focusPoint, visibleSpan } = useMemo(
    () => getCameraFocusState(room, cellSize, cameraMode, cameraTargetMode, focusSnakeId),
    [cameraMode, cameraTargetMode, cellSize, focusSnakeId, room]
  );

  return (
    <div className="h-full w-full overflow-hidden bg-slate-950">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 45, position: [10, 20, -15] }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 20, 60]} />

        <CameraController
          width={width}
          height={height}
          cellSize={cellSize}
          viewMode={viewMode}
          cameraMode={cameraMode}
          focusPoint={focusPoint}
          visibleSpan={visibleSpan}
        />

        <ambientLight intensity={0.95} />
        <directionalLight
          position={[focusPoint[0] + 8, 18, focusPoint[2] - 6]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight
          position={[focusPoint[0] - 10, 12, focusPoint[2] + 10]}
          intensity={0.9}
          color="#67e8f9"
        />
        <hemisphereLight args={['#67e8f9', '#0f172a', 0.8]} />

        <ThreeJSFloor width={width} height={height} cellSize={cellSize} />

        {room.foods?.map((food, index) => (
          <ThreeJSFood key={`food-${index}`} food={food} cellSize={cellSize} />
        ))}

        {room.players?.map((snake) => (
          <ThreeJSSnake key={snake.id} snake={snake} cellSize={cellSize} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={cameraMode === 'tight' ? 0.03 : 0.05}
          rotateSpeed={cameraMode === 'tight' ? 0.28 : 0.35}
          minDistance={visibleSpan * (cameraMode === 'tight' ? 0.86 : 0.96)}
          maxDistance={boardSpan * 2.4}
          maxPolarAngle={Math.PI / 2.08}
          target={focusPoint}
          enablePan={false}
          enabled={allowOrbitControls && viewMode === 'perspective'}
        />
      </Canvas>
    </div>
  );
};
