import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Room } from '../../types/game';

interface DynamicLightingProps {
  room: Room;
  cellSize: number;
  focusSnakeId?: string;
}

export const DynamicLighting: React.FC<DynamicLightingProps> = ({
  room,
  cellSize,
  focusSnakeId,
}) => {
  const snakeLightsRef = useRef<THREE.Group>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);

  // 计算蛇身长度影响的光照参数
  const lightingParams = useMemo(() => {
    const activeSnakes = room.players?.filter(snake => snake.alive) || [];
    const totalSnakeLength = activeSnakes.reduce((sum, snake) => sum + snake.body.length, 0);
    
    // 根据蛇身长度调整光照强度
    const baseIntensity = 0.95;
    const snakeLengthMultiplier = 1 + (totalSnakeLength * 0.02);
    
    // 动态环境光强度
    const ambientIntensity = Math.min(baseIntensity * snakeLengthMultiplier, 1.5);
    
    // 主方向光强度
    const mainLightIntensity = Math.min(1.8 * snakeLengthMultiplier, 2.5);
    
    // 补光强度
    const fillLightIntensity = Math.min(0.9 * snakeLengthMultiplier, 1.2);
    
    return {
      ambientIntensity,
      mainLightIntensity,
      fillLightIntensity,
      totalSnakeLength,
    };
  }, [room.players]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // 更新环境光强度（呼吸效果）
    if (ambientLightRef.current) {
      const breathingEffect = 1 + Math.sin(time * 0.5) * 0.05;
      ambientLightRef.current.intensity = lightingParams.ambientIntensity * breathingEffect;
    }
    
    // 更新主方向光位置（跟随焦点蛇）
    if (directionalLightRef.current) {
      const focusSnake = room.players?.find(snake => snake.id === focusSnakeId);
      let targetPosition: [number, number, number] = [10, 18, -15];
      
      if (focusSnake && focusSnake.alive && focusSnake.body.length > 0) {
        const head = focusSnake.body[0];
        const headX = head.x * cellSize + cellSize / 2;
        const headZ = head.y * cellSize + cellSize / 2;
        
        // 预判蛇的移动方向
        const directionVector = getDirectionVector(focusSnake.direction);
        const leadDistance = cellSize * (1.5 + focusSnake.body.length * 0.1);
        
        targetPosition = [
          headX + directionVector.x * leadDistance,
          18,
          headZ + directionVector.z * leadDistance
        ];
      }
      
      // 平滑过渡到新位置
      directionalLightRef.current.position.lerp(
        new THREE.Vector3(...targetPosition),
        0.05
      );
    }
    
    // 更新补光位置（环绕效果）
    if (fillLightRef.current) {
      const center = getBoardCenter(room, cellSize);
      const radius = cellSize * 8;
      const angle = time * 0.3;
      
      fillLightRef.current.position.set(
        center.x + Math.cos(angle) * radius,
        12,
        center.z + Math.sin(angle) * radius
      );
      
      // 动态调整补光强度
      const intensityVariation = 1 + Math.sin(time * 0.7) * 0.1;
      fillLightRef.current.intensity = lightingParams.fillLightIntensity * intensityVariation;
    }
    
    // 更新蛇身上的点光源
    if (snakeLightsRef.current) {
      updateSnakeLights(snakeLightsRef.current, room, cellSize);
    }
  });

  return (
    <group>
      <ambientLight ref={ambientLightRef} intensity={lightingParams.ambientIntensity} />
      <directionalLight
        ref={directionalLightRef}
        position={[10, 18, -15]}
        intensity={lightingParams.mainLightIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight
        ref={fillLightRef}
        position={[10, 12, 10]}
        intensity={lightingParams.fillLightIntensity}
        color="#67e8f9"
      />
      <hemisphereLight args={['#67e8f9', '#0f172a', 0.8]} />
      
      <group ref={snakeLightsRef} />
    </group>
  );
};

// 获取方向向量
const getDirectionVector = (direction: string): { x: number; z: number } => {
  switch (direction) {
    case 'UP': return { x: 0, z: -1 };
    case 'DOWN': return { x: 0, z: 1 };
    case 'LEFT': return { x: -1, z: 0 };
    case 'RIGHT': return { x: 1, z: 0 };
    default: return { x: 1, z: 0 };
  }
};

// 获取棋盘中心
const getBoardCenter = (room: Room, cellSize: number): { x: number; z: number } => {
  const boardWidth = room.map_size.x * cellSize;
  const boardHeight = room.map_size.y * cellSize;
  return {
    x: boardWidth / 2,
    z: boardHeight / 2
  };
};

// 更新蛇身上的点光源
const updateSnakeLights = (
  snakeLightsGroup: THREE.Group,
  room: Room,
  cellSize: number
) => {
  // 清理旧的蛇身光源
  snakeLightsGroup.children = [];
  
  room.players?.forEach(snake => {
    if (!snake.alive || snake.body.length === 0) return;
    
    // 为蛇头添加更强的光源
    const head = snake.body[0];
    const headX = head.x * cellSize + cellSize / 2;
    const headZ = head.y * cellSize + cellSize / 2;
    
    const headLight = new THREE.PointLight(
      snake.color,
      0.3 + (snake.body.length * 0.02),
      cellSize * 3
    );
    headLight.position.set(headX, 1, headZ);
    snakeLightsGroup.add(headLight);
    
    // 为蛇身添加较弱的光源
    snake.body.slice(1, Math.min(5, snake.body.length)).forEach((segment, index) => {
      const segmentX = segment.x * cellSize + cellSize / 2;
      const segmentZ = segment.y * cellSize + cellSize / 2;
      
      const segmentLight = new THREE.PointLight(
        snake.color,
        0.1 + (snake.body.length * 0.01),
        cellSize * 2
      );
      segmentLight.position.set(segmentX, 0.5, segmentZ);
      segmentLight.intensity *= (1 - index * 0.2); // 越往后强度越低
      snakeLightsGroup.add(segmentLight);
    });
  });
};