import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Food as FoodType } from '../../types/game';

interface ThreeJSFoodProps {
  food: FoodType;
  cellSize: number;
}

export const ThreeJSFood: React.FC<ThreeJSFoodProps> = ({ food, cellSize }) => {
  const meshRef = useRef<THREE.Object3D>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      const floatY = Math.sin(time * 3) * 0.15;
      meshRef.current.position.y = cellSize / 2 + floatY;

      if (food.type === 'SPECIAL') {
        const scale = 1 + Math.sin(time * 4) * 0.15;
        meshRef.current.scale.set(scale, scale, scale);
        meshRef.current.rotation.y = time * 2;
      }
    }
  });

  const x = food.pos.x * cellSize + cellSize / 2;
  const z = food.pos.y * cellSize + cellSize / 2;

  return (
    <group position={[x, 0, z]}>
      {food.type === 'SPECIAL' ? (
        <SpecialFood meshRef={meshRef} cellSize={cellSize} />
      ) : (
        <NormalFood meshRef={meshRef} cellSize={cellSize} />
      )}
    </group>
  );
};

const NormalFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({ meshRef, cellSize }) => {
  return (
    <Sphere ref={meshRef as React.Ref<THREE.Mesh>} args={[cellSize * 0.35, 16, 16]}>
      <meshToonMaterial color="#ef4444" />
      <pointLight color="#ef4444" intensity={0.5} distance={2} />
    </Sphere>
  );
};

const SpecialFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({ meshRef, cellSize }) => {
  return (
    <group ref={meshRef as React.Ref<THREE.Group>}>
      <Sphere args={[cellSize * 0.4, 16, 16]}>
        <meshToonMaterial color="#fbbf24" />
      </Sphere>
      <pointLight color="#fbbf24" intensity={1} distance={3} />
    </group>
  );
};
