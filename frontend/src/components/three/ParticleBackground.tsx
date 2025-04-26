import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { inSphere } from 'maath/random';

interface ParticleBackgroundProps {
  count?: number;
  size?: number;
  color?: string;
  speed?: number;
}

export default function ParticleBackground({ 
  count = 2000, 
  size = 0.02, 
  color = '#6366f1', 
  speed = 0.1 
}: ParticleBackgroundProps) {
  const ref = useRef<THREE.Points>(null);
  
  // Generate random positions for particles
  const particles = useMemo(() => {
    return new Float32Array(count * 3);
  }, [count]);
  
  useEffect(() => {
    // Initialize particles in a sphere
    inSphere(particles, { radius: 1.5 });
  }, [particles]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Rotate the particle system
    ref.current.rotation.x += delta * speed * 0.15;
    ref.current.rotation.y += delta * speed * 0.1;
  });

  return (
    <group>
      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={color}
          size={size}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}
