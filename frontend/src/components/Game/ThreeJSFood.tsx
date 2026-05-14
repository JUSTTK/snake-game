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

    if (food.type !== 'NORMAL') {
      const scale = 1 + Math.sin(time * 4) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
      meshRef.current.rotation.y = time * 2;
    }
  });

  const x = food.pos.x * cellSize + cellSize / 2;
  const z = food.pos.y * cellSize + cellSize / 2;

  return (
    <group position={[x, 0, z]}>
      {food.type === 'NORMAL' && <NormalFood meshRef={meshRef} cellSize={cellSize} />}
      {food.type === 'SPECIAL' && <SpecialFood meshRef={meshRef} cellSize={cellSize} />}
      {food.type === 'SLOW' && <SlowFood meshRef={meshRef} cellSize={cellSize} />}
      {food.type === 'SHIELD' && <ShieldFood meshRef={meshRef} cellSize={cellSize} />}
      {food.type === 'SHRINK' && <ShrinkFood meshRef={meshRef} cellSize={cellSize} />}
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

const SlowFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({
  meshRef,
  cellSize,
}) => {
  return (
    <group ref={meshRef as React.Ref<THREE.Group>}>
      <mesh castShadow>
        <icosahedronGeometry args={[cellSize * 0.32, 0]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#1e3a5f"
          emissiveIntensity={0.5}
          metalness={0.3}
          roughness={0.25}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[cellSize * 0.45, cellSize * 0.03, 8, 32]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#0284c7"
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
        />
      </mesh>
      <pointLight color="#38bdf8" intensity={1.0} distance={4} />
    </group>
  );
};

const ShieldFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({
  meshRef,
  cellSize,
}) => {
  return (
    <group ref={meshRef as React.Ref<THREE.Group>}>
      <mesh castShadow>
        <dodecahedronGeometry args={[cellSize * 0.32, 0]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#92400e"
          emissiveIntensity={0.6}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[cellSize * 0.48, 16, 16]} />
        <meshStandardMaterial
          color="#fde68a"
          emissive="#f59e0b"
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
          wireframe
        />
      </mesh>
      <pointLight color="#fbbf24" intensity={1.2} distance={4.5} />
    </group>
  );
};

const ShrinkFood: React.FC<{ meshRef: React.Ref<THREE.Object3D>; cellSize: number }> = ({
  meshRef,
  cellSize,
}) => {
  return (
    <group ref={meshRef as React.Ref<THREE.Group>}>
      <mesh castShadow>
        <tetrahedronGeometry args={[cellSize * 0.34, 0]} />
        <meshStandardMaterial
          color="#f87171"
          emissive="#7f1d1d"
          emissiveIntensity={0.5}
          metalness={0.15}
          roughness={0.35}
        />
      </mesh>
      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <torusGeometry args={[cellSize * 0.42, cellSize * 0.025, 6, 24]} />
        <meshStandardMaterial
          color="#fca5a5"
          emissive="#dc2626"
          emissiveIntensity={0.35}
        />
      </mesh>
      <pointLight color="#f87171" intensity={1.0} distance={4} />
    </group>
  );
};
