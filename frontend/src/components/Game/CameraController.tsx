import React, { useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ViewMode = 'top' | 'isometric' | 'perspective';
export type CameraMode = 'tight' | 'comfort';

export const VIEW_MODES: ViewMode[] = ['isometric', 'top', 'perspective'];

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  top: '俯视图',
  isometric: '等轴视角',
  perspective: '透视跟随',
};

export const CAMERA_MODE_LABELS: Record<CameraMode, string> = {
  tight: '紧跟模式',
  comfort: '舒适模式',
};

interface CameraControllerProps {
  width: number;
  height: number;
  cellSize: number;
  viewMode: ViewMode;
  cameraMode: CameraMode;
  focusPoint: [number, number, number];
  visibleSpan: number;
}

const FOLLOW_DAMPING: Record<CameraMode, Record<ViewMode, number>> = {
  tight: {
    top: 20,
    isometric: 17,
    perspective: 15,
  },
  comfort: {
    top: 10,
    isometric: 8,
    perspective: 7,
  },
};

const getDesiredCameraState = (
  viewMode: ViewMode,
  cameraMode: CameraMode,
  focusPoint: [number, number, number],
  visibleSpan: number
) => {
  const [x, , z] = focusPoint;
  const span = Math.max(visibleSpan, 6);
  const comfortScale = cameraMode === 'comfort' ? 1.08 : 0.96;

  switch (viewMode) {
    case 'top':
      return {
        position: new THREE.Vector3(x, span * (cameraMode === 'comfort' ? 1.56 : 1.36), z + 0.18),
        target: new THREE.Vector3(x, 0, z),
        up: new THREE.Vector3(0, 0, -1),
        fov: cameraMode === 'comfort' ? 31 : 29,
      };
    case 'isometric':
      return {
        position: new THREE.Vector3(
          x - span * 0.82 * comfortScale,
          span * (cameraMode === 'comfort' ? 1.12 : 1.04),
          z - span * 0.74 * comfortScale
        ),
        target: new THREE.Vector3(x, 0.14, z),
        up: new THREE.Vector3(0, 1, 0),
        fov: cameraMode === 'comfort' ? 40 : 37,
      };
    case 'perspective':
      return {
        position: new THREE.Vector3(
          x,
          span * (cameraMode === 'comfort' ? 0.98 : 0.84),
          z + span * (cameraMode === 'comfort' ? 1.22 : 1.02)
        ),
        target: new THREE.Vector3(x, 0.22, z),
        up: new THREE.Vector3(0, 1, 0),
        fov: cameraMode === 'comfort' ? 47 : 43,
      };
  }
};

export const CameraController: React.FC<CameraControllerProps> = ({
  width,
  height,
  cellSize,
  viewMode,
  cameraMode,
  focusPoint,
  visibleSpan,
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const lookTargetRef = useRef(new THREE.Vector3());
  const lastViewModeRef = useRef<ViewMode | null>(null);
  const desiredState = useMemo(
    () => getDesiredCameraState(viewMode, cameraMode, focusPoint, visibleSpan),
    [cameraMode, focusPoint, viewMode, visibleSpan]
  );

  const boardWidth = width * cellSize;
  const boardHeight = height * cellSize;
  const longestEdge = Math.max(boardWidth, boardHeight);

  useEffect(() => {
    if (!cameraRef.current) {
      return;
    }

    const hasViewModeChanged = lastViewModeRef.current !== viewMode;
    if (!lastViewModeRef.current || hasViewModeChanged) {
      cameraRef.current.position.copy(desiredState.position);
      cameraRef.current.up.copy(desiredState.up);
      cameraRef.current.fov = desiredState.fov;
      lookTargetRef.current.copy(desiredState.target);
      cameraRef.current.lookAt(lookTargetRef.current);
      cameraRef.current.updateProjectionMatrix();
    }

    lastViewModeRef.current = viewMode;
  }, [desiredState, viewMode]);

  useFrame((_, delta) => {
    if (!cameraRef.current) {
      return;
    }

    const damping = FOLLOW_DAMPING[cameraMode][viewMode];
    const smoothing = 1 - Math.exp(-Math.min(delta, 0.05) * damping);

    cameraRef.current.position.lerp(desiredState.position, smoothing);
    cameraRef.current.up.lerp(desiredState.up, smoothing).normalize();
    lookTargetRef.current.lerp(desiredState.target, smoothing);
    cameraRef.current.fov = THREE.MathUtils.lerp(
      cameraRef.current.fov,
      desiredState.fov,
      smoothing
    );
    cameraRef.current.lookAt(lookTargetRef.current);
    cameraRef.current.updateProjectionMatrix();
  });

  return (
    <PerspectiveCamera
      ref={cameraRef}
      makeDefault
      position={desiredState.position}
      fov={desiredState.fov}
      near={0.1}
      far={Math.max(500, longestEdge * 8)}
    />
  );
};
