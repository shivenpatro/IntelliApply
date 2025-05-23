import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, useMatcapTexture, Center, Text3D } from '@react-three/drei'; // Added missing imports
// import { useSpring, animated } from '@react-spring/three'; // Commented out due to React 19 incompatibility
import * as THREE from 'three';

interface FloatingLogoProps {
  text?: string;
  position?: [number, number, number];
  scale?: number;
  color?: string;
  hoverColor?: string;
}

export default function FloatingLogo({
  text = 'IntelliApply',
  position = [0, 0, 0],
  scale = 0.5,
  color = '#6366f1',
  hoverColor = '#818cf8'
}: FloatingLogoProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [matcapTexture] = useMatcapTexture('7B5254_E9DCC7_B19986_C8AC91', 256);

  // Animation for hover effect - COMMENTED OUT
  // const { currentColor } = useSpring({
  //   currentColor: hovered ? hoverColor : color,
  //   config: { mass: 5, tension: 350, friction: 40 }
  // });
  // Use static color
  const currentColor = hovered ? hoverColor : color;

  // Floating animation
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle floating motion
    meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    
    // Subtle rotation
    meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
  });

  return (
    <Center position={position}>
      {/* <animated.mesh */}
      <mesh // Use regular mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <Text3D
          font="/fonts/inter_bold.json"
          size={1}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          {text}
          {/* <animated.meshMatcapMaterial */}
          <meshMatcapMaterial // Use regular material
            matcap={matcapTexture}
            color={currentColor}
          />
        </Text3D>
      {/* </animated.mesh> */}
      </mesh>
    </Center>
  );
}
