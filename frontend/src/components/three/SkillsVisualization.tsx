import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface Skill {
  id: number;
  name: string;
  level?: string;
}

interface SkillsVisualizationProps {
  skills: Skill[];
  radius?: number;
  autoRotate?: boolean;
  rotationSpeed?: number;
}

export default function SkillsVisualization({
  skills,
  radius = 2,
  autoRotate = true,
  rotationSpeed = 0.2
}: SkillsVisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Calculate positions on a sphere for each skill
  const skillPositions = useMemo(() => {
    return skills.map((_, index) => {
      // Fibonacci sphere algorithm for even distribution
      const phi = Math.acos(-1 + (2 * index) / skills.length);
      const theta = Math.sqrt(skills.length * Math.PI) * phi;
      
      return {
        position: [
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi)
        ] as [number, number, number],
        // Assign colors based on skill level
        color: getColorForSkillLevel(skills[index].level || 'intermediate')
      };
    });
  }, [skills, radius]);
  
  // Auto-rotate the entire skill sphere
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });
  
  // Helper function to get color based on skill level
  function getColorForSkillLevel(level: string): string {
    switch (level.toLowerCase()) {
      case 'beginner':
        return '#14b8a6'; // secondary-500
      case 'intermediate':
        return '#6366f1'; // primary-500
      case 'advanced':
        return '#d946ef'; // accent-500
      default:
        return '#6366f1'; // primary-500
    }
  }
  
  return (
    <group ref={groupRef}>
      {skills.map((skill, index) => (
        <group key={skill.id} position={skillPositions[index].position}>
          {/* Skill sphere */}
          <Sphere args={[0.1, 16, 16]}>
            <meshStandardMaterial 
              color={skillPositions[index].color} 
              emissive={skillPositions[index].color}
              emissiveIntensity={0.5}
              roughness={0.3}
            />
          </Sphere>
          
          {/* Skill name */}
          <Text
            position={[0, 0.2, 0]}
            fontSize={0.1}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {skill.name}
          </Text>
        </group>
      ))}
    </group>
  );
}
