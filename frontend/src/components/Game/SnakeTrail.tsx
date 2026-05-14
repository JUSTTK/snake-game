import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Point, Snake } from '../../types/game';

interface SnakeTrailProps {
  snake: Snake;
  cellSize: number;
  maxTrailLength?: number;
}

export const SnakeTrail: React.FC<SnakeTrailProps> = ({
  snake,
  cellSize,
  maxTrailLength = 8,
}) => {
  const trailRef = useRef<THREE.Group>(null);
  const [lastPositions, setLastPositions] = useState<Point[]>([]);

  useEffect(() => {
    if (!snake.body || snake.body.length === 0) return;

    const head = snake.body[0];
    const newLastPositions = [...lastPositions, head];
    
    // 保持最近的几个位置
    if (newLastPositions.length > maxTrailLength) {
      newLastPositions.shift();
    }
    
    setLastPositions(newLastPositions);
  }, [snake.body, lastPositions, maxTrailLength]);

  useFrame(() => {
    if (!trailRef.current || !lastPositions.length) return;

    const trailGroup = trailRef.current;
    const currentTime = Date.now();
    
    // 清理过期的残影
    trailGroup.children = trailGroup.children.filter((child) => {
      const age = currentTime - (child.userData.createdAt || 0);
      return age < 1000; // 1秒后消失
    });

    // 添加新的残影
    if (lastPositions.length > 0) {
      const head = lastPositions[lastPositions.length - 1];
      const x = head.x * cellSize + cellSize / 2;
      const z = head.y * cellSize + cellSize / 2;
      
      // 检查是否已有这个位置的残影
      const existingTrail = trailGroup.children.find(
        (child) => Math.abs(child.position.x - x) < 0.1 && Math.abs(child.position.z - z) < 0.1
      );
      
      if (!existingTrail) {
        const trailMesh = createTrailSegment(x, z, snake.color, currentTime);
        trailGroup.add(trailMesh);
      }
    }
  });

  return <group ref={trailRef} />;
};

const createTrailSegment = (x: number, z: number, color: string, createdAt: number): THREE.Mesh => {
  const geometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: 0.3,
    roughness: 0.8,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0.05, z);
  mesh.userData.createdAt = createdAt;
  
  return mesh;
};

interface SnakeGlowTrailProps {
  snake: Snake;
  cellSize: number;
  intensity?: number;
}

export const SnakeGlowTrail: React.FC<SnakeGlowTrailProps> = ({
  snake,
  cellSize,
  intensity = 0.15,
}) => {
  const glowRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!glowRef.current || !snake.body || snake.body.length === 0) return;

    const glowGroup = glowRef.current;
    const time = state.clock.elapsedTime;
    
    // 清理旧的发光效果
    glowGroup.children = glowGroup.children.slice(-snake.body.length);

    // 为蛇的每个身体部分添加发光效果
    snake.body.forEach((segment, index) => {
      const x = segment.x * cellSize + cellSize / 2;
      const z = segment.y * cellSize + cellSize / 2;
      const segmentHeight = cellSize * 0.3;
      const delay = index * 0.1;
      
      // 检查是否已有这个位置的发光
      const existingGlow = glowGroup.children.find(
        (child) => Math.abs(child.position.x - x) < 0.1 && Math.abs(child.position.z - z) < 0.1
      );
      
      if (!existingGlow) {
        const glowMesh = createGlowSegment(x, z, segmentHeight, snake.color, time, delay, intensity);
        glowGroup.add(glowMesh);
      }
    });
  });

  return <group ref={glowRef} />;
};

const createGlowSegment = (
  x: number,
  z: number,
  height: number,
  color: string,
  time: number,
  delay: number,
  intensity: number
): THREE.Mesh => {
  const geometry = new THREE.CylinderGeometry(0.6, 0.6, height, 16);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    transparent: true,
    opacity: intensity * (1 + Math.sin(time * 3 - delay) * 0.3),
    emissive: color,
    emissiveIntensity: intensity * 0.5,
    roughness: 0.2,
    metalness: 0.8,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, height / 2, z);
  mesh.rotation.x = Math.PI / 2;
  
  return mesh;
};