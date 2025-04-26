import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

interface AnimatedButton3DProps {
  text: string;
  position?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  hoverColor?: string;
  textColor?: string;
  onClick?: () => void;
}

export default function AnimatedButton3D({
  text,
  position = [0, 0, 0],
  width = 2,
  height = 0.6,
  depth = 0.2,
  color = '#6366f1',
  hoverColor = '#4f46e5',
  textColor = '#ffffff',
  onClick
}: AnimatedButton3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Animation for hover and click effects
  const { scale, buttonColor, buttonPosition } = useSpring({
    scale: hovered ? 1.1 : 1,
    buttonColor: hovered ? hoverColor : color,
    buttonPosition: clicked ? [0, -0.05, 0] : [0, 0, 0],
    config: { mass: 1, tension: 280, friction: 60 }
  });

  // Handle hover and click events
  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => {
    setHovered(false);
    setClicked(false);
  };
  
  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
    onClick && onClick();
  };

  // Add subtle floating animation
  useFrame((state) => {
    if (!meshRef.current || clicked) return;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 2) * 0.02;
  });

  return (
    <group position={position}>
      <animated.mesh
        ref={meshRef}
        scale={scale}
        position={buttonPosition as any}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        {/* Button body */}
        <RoundedBox args={[width, height, depth]} radius={0.1} smoothness={4}>
          <animated.meshStandardMaterial 
            color={buttonColor} 
            roughness={0.3} 
            metalness={0.2}
          />
        </RoundedBox>
        
        {/* Button text */}
        <Text
          position={[0, 0, depth / 2 + 0.01]}
          fontSize={0.2}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter_bold.json"
        >
          {text}
        </Text>
      </animated.mesh>
    </group>
  );
}
