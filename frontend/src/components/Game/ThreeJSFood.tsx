import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Food as FoodType } from '../../types/game';

interface ThreeJSFoodProps {
  food: FoodType;
  cellSize: number;
}

export const ThreeJSFood: React.FC<ThreeJSFoodProps> = ({ food, cellSize }) => {
  const meshRef = useRef<THREE.Object3D>(null);

  useFrame((state) => {
    if (!meshRef.current) {
      return;
    }

    const time = state.clock.elapsedTime;
    const floatY = Math.sin(time * 3) * 0.15;
    meshRef.current.position.y = cellSize / 2 + floatY;

    if (food.type === 'SPECIAL') {
      const scale = 1 + Math.sin(time * 4) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.rotation.y = time * 2;
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

const NormalFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({
  meshRef,
  cellSize,
}) => {
  return (
    <group ref={meshRef as React.Ref<THREE.Group>}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[cellSize * 0.3, 18, 18]} />
        <meshStandardMaterial
          color="#fb7185"
          roughness={0.35}
          emissive="#7f1d1d"
          emissiveIntensity={0.25}
        />
      </mesh>
      <mesh position={[0, cellSize * 0.24, 0]} rotation={[0.35, 0, -0.35]}>
        <coneGeometry args={[cellSize * 0.12, cellSize * 0.22, 10]} />
        <meshStandardMaterial color="#22c55e" roughness={0.55} />
      </mesh>
      <pointLight color="#fb7185" intensity={0.8} distance={3.5} />
    </group>
  );
};

const SpecialFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({
  meshRef,
  cellSize,
}) => {
  return (
    <group ref={meshRef as React.Ref<THREE.Group>}>
      <mesh castShadow>
        <octahedronGeometry args={[cellSize * 0.34, 0]} />
        <meshStandardMaterial
          color="#facc15"
          emissive="#ca8a04"
          emissiveIntensity={0.45}
          metalness={0.25}
          roughness={0.3}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[cellSize * 0.5, cellSize * 0.04, 12, 40]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#f59e0b"
          emissiveIntensity={0.3}
        />
      </mesh>
      <pointLight color="#fbbf24" intensity={1.25} distance={4} />
    </group>
  );
};
