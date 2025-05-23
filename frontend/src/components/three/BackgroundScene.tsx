import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'; // Commented out due to build issues
import * as THREE from 'three';

// Animated gradient background
function GradientBackground() {
  const { viewport } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create shader material for animated gradient
  const material = useRef(
    new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2() },
        u_color1: { value: new THREE.Color('#1e1b4b') }, // primary-950
        u_color2: { value: new THREE.Color('#312e81') }, // primary-900
        u_color3: { value: new THREE.Color('#042f2e') }, // secondary-950
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec3 u_color1;
        uniform vec3 u_color2;
        uniform vec3 u_color3;
        varying vec2 vUv;
        
        // Simplex noise function
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        void main() {
          vec2 st = vUv;
          float noise = snoise(st * 3.0 + u_time * 0.1) * 0.5 + 0.5;
          
          // Create moving gradient
          float gradient = sin(st.x * 3.14159 + u_time * 0.2) * 0.5 + 0.5;
          gradient *= sin(st.y * 3.14159 + u_time * 0.1) * 0.5 + 0.5;
          
          // Mix colors based on noise and gradient
          vec3 color = mix(u_color1, u_color2, noise);
          color = mix(color, u_color3, gradient * 0.5);
          
          // Add subtle noise pattern
          float pattern = snoise(st * 10.0 + u_time * 0.05) * 0.1 + 0.9;
          color *= pattern;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    })
  );
  
  // Update shader uniforms on each frame
  useFrame((state) => {
    if (material.current) {
      material.current.uniforms.u_time.value = state.clock.elapsedTime;
      material.current.uniforms.u_resolution.value.set(
        viewport.width, 
        viewport.height
      );
    }
  });
  
  return (
    <mesh ref={meshRef} position={[0, 0, -5]}>
      <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
      <primitive object={material.current} attach="material" />
    </mesh>
  );
}

// Floating particles
function FloatingParticles({ count = 100 }) {
  const points = useRef<THREE.Points>(null);
  
  // Create random particles
  const particlesPosition = new Float32Array(count * 3);
  const particlesSizes = new Float32Array(count);
  
  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      particlesPosition[i3] = (Math.random() - 0.5) * 10;
      particlesPosition[i3 + 1] = (Math.random() - 0.5) * 10;
      particlesPosition[i3 + 2] = (Math.random() - 0.5) * 10;
      particlesSizes[i] = Math.random() * 0.1 + 0.05;
    }
  }, [count]);
  
  // Animate particles
  useFrame((state) => {
    if (!points.current) return;
    
    const positions = points.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += Math.sin(time * 0.2 + i * 0.1) * 0.002;
      positions[i3] += Math.cos(time * 0.2 + i * 0.1) * 0.002;
    }
    
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.rotation.y = time * 0.05;
  });
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.setAttribute('position', new THREE.BufferAttribute(particlesPosition, 3));
      geometryRef.current.setAttribute('size', new THREE.BufferAttribute(particlesSizes, 1));
    }
  }, [count, particlesPosition, particlesSizes]); // Add dependencies

  // Animate particles
  useFrame((state) => {
    if (!points.current || !geometryRef.current) return; // Check geometryRef too

    const positions = geometryRef.current.attributes.position.array as Float32Array; // Get from geometryRef
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3 + 1] += Math.sin(time * 0.2 + i * 0.1) * 0.002;
      positions[i3] += Math.cos(time * 0.2 + i * 0.1) * 0.002;
    }

    geometryRef.current.attributes.position.needsUpdate = true; // Update geometryRef attribute
    points.current.rotation.y = time * 0.05;
  });

  return (
    <points ref={points}>
      <bufferGeometry ref={geometryRef}>
        {/* Attributes are now set imperatively via useEffect */}
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#a5b4fc"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

interface BackgroundSceneProps {
  className?: string;
}

export default function BackgroundScene({ className = '' }: BackgroundSceneProps) {
  return (
    <div className={`fixed top-0 left-0 w-full h-full -z-10 ${className}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <GradientBackground />
        <FloatingParticles />
        {/* <EffectComposer>
          <Bloom luminanceThreshold={0.2} intensity={0.5} />
          <Vignette darkness={0.5} offset={0.5} />
        </EffectComposer> */}
      </Canvas>
    </div>
  );
}
