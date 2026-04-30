import React, { useRef, useEffect } from 'react';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export type ViewMode = 'top' | 'isometric' | 'perspective';

interface CameraControllerProps {
  width: number;
  height: number;
  cellSize: number;
  viewMode: ViewMode;
}

const cameraPositions: Record<ViewMode, { position: [number, number, number]; fov: number; target: [number, number, number] }> = {
  top: {
    position: [10, 35, 10],
    fov: 50,
    target: [10, 0, 10],
  },
  isometric: {
    position: [-15, 20, -15],
    fov: 45,
    target: [10, 0, 10],
  },
  perspective: {
    position: [0, 20, 25],
    fov: 60,
    target: [10, 0, 10],
  },
};

export const CameraController: React.FC<CameraControllerProps> = ({ width, height, cellSize, viewMode }) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  const { position, fov, target } = cameraPositions[viewMode];

  const centerX = (width * cellSize) / 2;
  const centerZ = (height * cellSize) / 2;

  const adjustedPosition: [number, number, number] = [
    position[0] + centerX - 10,
    position[1],
    position[2] + centerZ - 10,
  ];

  const adjustedTarget: THREE.Vector3 = new THREE.Vector3(
    target[0] + centerX - 10,
    target[1],
    target[2] + centerZ - 10,
  );

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.lookAt(adjustedTarget);
    }
  }, [adjustedTarget]);

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={adjustedPosition}
      fov={fov}
    />
  );
};
