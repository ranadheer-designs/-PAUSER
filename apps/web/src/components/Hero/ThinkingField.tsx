'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const DotGrid = ({ count = 40, separation = 2 }) => {
  const mesh = useRef<THREE.Points>(null);
  const { mouse } = useThree();

  // Create grid of points
  const [positions, numPoints] = useMemo(() => {
    const amountX = count;
    const amountY = count;
    const num = amountX * amountY;
    const positions = new Float32Array(num * 3);

    for (let i = 0, ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        positions[i] = ix * separation - (amountX * separation) / 2; // x
        positions[i + 1] = 0; // y (will be animated)
        positions[i + 2] = iy * separation - (amountY * separation) / 2; // z
        i += 3;
      }
    }
    return [positions, num];
  }, [count, separation]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    const posAttribute = mesh.current.geometry.getAttribute('position');

    for (let i = 0; i < numPoints; i++) {
        const x = posAttribute.getX(i);
        const z = posAttribute.getZ(i);
        
        // Dynamic wave based on time and distance from center
        const distance = Math.sqrt(x * x + z * z);
        const wave = Math.sin(distance * 0.2 - t * 0.8) * 0.5;
        
        // Mouse influence
        const mouseX = mouse.x * 20;
        const mouseZ = -mouse.y * 20;
        const distToMouse = Math.sqrt(Math.pow(x - mouseX, 2) + Math.pow(z - mouseZ, 2));
        const mouseEffect = Math.exp(-distToMouse * 0.1) * 2;

        posAttribute.setY(i, wave + mouseEffect);
    }
    posAttribute.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#3B4BD8"
        transparent
        opacity={0.4}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default function ThinkingField({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 20, 25], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={['#0B0D0F', 15, 60]} />
        <DotGrid count={70} separation={1.2} />
      </Canvas>
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'radial-gradient(circle at center, transparent 20%, #0B0D0F 100%)',
        pointerEvents: 'none'
      }} />
    </div>
  );
}
