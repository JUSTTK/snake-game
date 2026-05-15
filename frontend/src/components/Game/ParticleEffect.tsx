import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ParticleEffectProps {
  position: [number, number, number];
  type: 'food' | 'special' | 'turn' | 'death';
  isActive: boolean;
  onComplete?: () => void;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  position,
  type,
  isActive,
  onComplete,
}) => {
  const particlesRef = useRef<THREE.Points>(null);
  const [isComplete, setIsComplete] = useState(false);
  const particlesRef2 = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isActive || isComplete) return;

    const particleCount = type === 'death' ? 50 : type === 'special' ? 40 : 25;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.random() * 2 + 0.5;
      
      const velocity = new THREE.Vector3(
        Math.cos(angle) * radius * 0.02,
        Math.random() * 0.05 + 0.02,
        Math.sin(angle) * radius * 0.02
      );

      const colors = {
        food: new THREE.Color('#fb7185'),
        special: new THREE.Color('#facc15'),
        turn: new THREE.Color('#67e8f9'),
        death: new THREE.Color('#ef4444'),
      };

      particles.push({
        position: new THREE.Vector3(position[0], position[1], position[2]),
        velocity,
        life: 0,
        maxLife: type === 'death' ? 120 : 60,
        size: type === 'death' ? Math.random() * 0.15 + 0.05 : Math.random() * 0.08 + 0.02,
        color: colors[type],
      });
    }

    particlesRef2.current = particles;
    setIsComplete(false);
  }, [isActive, type, position, isComplete]);

  useFrame(() => {
    if (!particlesRef.current || particlesRef2.current.length === 0) return;

    const particles = particlesRef2.current;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const colors = particlesRef.current.geometry.attributes.color.array as Float32Array;

    let activeParticles = 0;

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      
      if (particle.life < particle.maxLife) {
        activeParticles++;
        
        // 更新位置
        particle.position.add(particle.velocity);
        particle.velocity.y -= 0.0008; // 重力
        particle.velocity.multiplyScalar(0.98); // 阻力
        
        particle.life++;
        
        const lifeRatio = particle.life / particle.maxLife;
        const fadeAlpha = 1 - lifeRatio;
        
        // 更新颜色（带透明度渐变）
        const color = particle.color.clone();
        color.multiplyScalar(fadeAlpha);
        
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;

    if (activeParticles === 0 && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  });

  if (!isActive || isComplete) return null;

  const particleCount = particlesRef2.current.length;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  // 初始化位置和颜色
  for (let i = 0; i < particleCount; i++) {
    const particle = particlesRef2.current[i];
    positions[i * 3] = particle.position.x;
    positions[i * 3 + 1] = particle.position.y;
    positions[i * 3 + 2] = particle.position.z;
    
    colors[i * 3] = particle.color.r;
    colors[i * 3 + 1] = particle.color.g;
    colors[i * 3 + 2] = particle.color.b;
  }

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={particleCount}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={colors}
          count={particleCount}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={type === 'death' ? 0.15 : 0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};