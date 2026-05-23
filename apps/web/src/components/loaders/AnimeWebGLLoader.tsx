"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function FloatingParticles() {
  const ref = useRef<THREE.Points>(null!);

  const sphere = useMemo(() => {
    const positions = new Float32Array(5000 * 3);

    for (let i = 0; i < 5000; i++) {
      const radius = 8 * Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    ref.current.rotation.x = t * 0.05;
    ref.current.rotation.y = t * 0.08;

    ref.current.position.y = Math.sin(t * 0.5) * 0.2;
  });

  return (
    <Points
      ref={ref}
      positions={sphere}
      stride={3}
      frustumCulled
    >
      <PointMaterial
        transparent
        color="#00ffff"
        size={0.035}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  );
}

function EnergyRing() {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    mesh.current.rotation.z = t * 0.5;
    mesh.current.scale.x = 1 + Math.sin(t * 2) * 0.05;
    mesh.current.scale.y = 1 + Math.sin(t * 2) * 0.05;
  });

  return (
    <mesh ref={mesh}>
      <torusGeometry args={[2.5, 0.05, 16, 100]} />
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function CoreOrb() {
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    mesh.current.rotation.y = t * 0.8;
    mesh.current.rotation.x = t * 0.3;

    mesh.current.scale.x = 1 + Math.sin(t * 3) * 0.05;
    mesh.current.scale.y = 1 + Math.sin(t * 3) * 0.05;
    mesh.current.scale.z = 1 + Math.sin(t * 3) * 0.05;
  });

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#00ffff"
        emissiveIntensity={2}
        wireframe
      />
    </mesh>
  );
}

export default function AnimeWebGLLoader() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* WebGL */}
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <color attach="background" args={["#020617"]} />

        <fog attach="fog" args={["#020617", 8, 25]} />

        <ambientLight intensity={0.4} />

        <pointLight
          position={[0, 0, 5]}
          intensity={30}
          color="#00ffff"
        />

        <pointLight
          position={[0, 0, -5]}
          intensity={10}
          color="#a855f7"
        />

        <FloatingParticles />
        <EnergyRing />
        <CoreOrb />
      </Canvas>

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="rounded-3xl border border-cyan-400/20 bg-black/20 px-10 py-6 backdrop-blur-xl">
          <h1 className="text-center text-6xl font-black tracking-[0.4em] text-white">
            AI
          </h1>

          <p className="mt-4 text-center text-sm tracking-[0.6em] text-cyan-300">
            INITIALIZING SYSTEM
          </p>

          <div className="mt-6 h-2 w-[320px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full animate-pulse rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          </div>
        </div>
      </div>

      {/* Background Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.12),transparent_60%)]" />
    </div>
  );
}
