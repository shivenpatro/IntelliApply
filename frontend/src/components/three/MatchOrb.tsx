import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Editorial wireframe orb — forest green, gently rotates, responds subtly to scroll. */
const WireframeOrb = () => {
  const mesh = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.3, 1), []);
  const innerGeo = useMemo(() => new THREE.IcosahedronGeometry(0.7, 0), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.18;
      mesh.current.rotation.x = Math.sin(t * 0.25) * 0.18;
      const s = 1 + Math.sin(t * 0.8) * 0.02;
      mesh.current.scale.setScalar(s);
    }
    if (inner.current) {
      inner.current.rotation.y = -t * 0.3;
      inner.current.rotation.z = t * 0.12;
    }
  });

  return (
    <group position={[0.9, 0.2, 0]}>
      <mesh ref={mesh} geometry={geometry}>
        <meshBasicMaterial color="#1B5E42" wireframe transparent opacity={0.35} />
      </mesh>
      <mesh ref={inner} geometry={innerGeo}>
        <meshBasicMaterial color="#1B5E42" wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

/** Canvas wrapper — fixed to hero, pointer-events none so content stays interactive. */
const MatchOrb = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <WireframeOrb />
    </Canvas>
  </div>
);

export default MatchOrb;
