import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

interface Card3DProps {
  title: string;
  subtitle?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  hoverColor?: string;
  onClick?: () => void;
}

export default function Card3D({
  title,
  subtitle,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 3,
  height = 1.5,
  depth = 0.1,
  color = '#ffffff',
  hoverColor = '#f0f0f0',
  onClick
}: Card3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animation for hover effect
  const { scale, cardColor } = useSpring({
    scale: hovered ? 1.05 : 1,
    cardColor: hovered ? hoverColor : color,
    config: { mass: 1, tension: 280, friction: 60 }
  });

  // Handle hover and click events
  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);
  const handleClick = () => onClick && onClick();

  // Add subtle floating animation
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.05;
  });

  return (
    <animated.group
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <animated.mesh ref={meshRef}>
        <RoundedBox args={[width, height, depth]} radius={0.1} smoothness={4}>
          <animated.meshStandardMaterial color={cardColor} roughness={0.3} metalness={0.1} />
        </RoundedBox>
        
        {/* Title */}
        <Text
          position={[0, 0.3, depth / 2 + 0.01]}
          fontSize={0.2}
          color="#333333"
          anchorX="center"
          anchorY="middle"
          maxWidth={width - 0.4}
        >
          {title}
        </Text>
        
        {/* Subtitle */}
        {subtitle && (
          <Text
            position={[0, 0, depth / 2 + 0.01]}
            fontSize={0.15}
            color="#666666"
            anchorX="center"
            anchorY="middle"
            maxWidth={width - 0.4}
          >
            {subtitle}
          </Text>
        )}
      </animated.mesh>
    </animated.group>
  );
}
