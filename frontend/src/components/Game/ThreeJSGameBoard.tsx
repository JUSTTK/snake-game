import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Room } from '../../types/game';
import { ThreeJSFloor } from './ThreeJSFloor';
import { ThreeJSSnake } from './ThreeJSSnake';
import { ThreeJSFood } from './ThreeJSFood';
import { CameraController } from './CameraController';

interface ThreeJSGameBoardProps {
  room: Room;
  cellSize?: number;
  viewMode?: 'top' | 'isometric' | 'perspective';
  fixedWidth?: number;
  fixedHeight?: number;
}

export const ThreeJSGameBoard: React.FC<ThreeJSGameBoardProps> = ({
  room,
  cellSize = 1,
  viewMode = 'isometric',
  fixedWidth = 800,
  fixedHeight = 600,
}) => {
  const width = fixedWidth ? fixedWidth / cellSize : room.map_size.x;
  const height = fixedHeight ? fixedHeight / cellSize : room.map_size.y;

  // 使用固定尺寸渲染，而不是基于地图大小
  const canvasWidth = fixedWidth || 800;
  const canvasHeight = fixedHeight || 600;

  return (
    <div className="border-2 border-gray-700 rounded-lg shadow-lg bg-gray-900">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 45, position: [10, 20, -15] }}
        style={{
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <color attach="background" args={['#1a1a2e']} />

        <CameraController
          width={width}
          height={height}
          cellSize={cellSize}
          viewMode={viewMode}
        />

        {/* Lighting */}
        <ambientLight intensity={1} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <hemisphereLight args={['#87CEEB', '#1e293b', 0.5]} />

        {/* Floor */}
        <ThreeJSFloor width={width} height={height} cellSize={cellSize} />

        {/* Foods */}
        {room.foods &&
          room.foods.map((food, index) => (
            <ThreeJSFood key={`food-${index}`} food={food} cellSize={cellSize} />
          ))}

        {/* Snakes */}
        {room.players &&
          room.players.map((snake) => (
            <ThreeJSSnake key={snake.id} snake={snake} cellSize={cellSize} />
          ))}

        {/* OrbitControls for perspective view */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          enabled={viewMode === 'perspective'}
        />
      </Canvas>
    </div>
  );
};
