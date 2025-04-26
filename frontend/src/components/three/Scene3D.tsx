import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import ParticleBackground from './ParticleBackground';
import FloatingLogo from './FloatingLogo';

interface Scene3DProps {
  showLogo?: boolean;
  showParticles?: boolean;
  cameraPosition?: [number, number, number];
  height?: string;
  className?: string;
}

export default function Scene3D({
  showLogo = true,
  showParticles = true,
  cameraPosition = [0, 0, 5],
  height = '100%',
  className = ''
}: Scene3DProps) {
  return (
    <div className={`relative ${className}`} style={{ height }}>
      <Canvas dpr={[1, 2]} className="bg-gradient-to-b from-primary-900/30 to-primary-950/30">
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          
          {showParticles && <ParticleBackground />}
          {showLogo && <FloatingLogo position={[0, 0, 0]} />}
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={true}
            rotateSpeed={0.5}
            autoRotate
            autoRotateSpeed={0.5}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
