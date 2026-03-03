import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LightingSetup } from './LightingSetup';
import { getFloorMaterialConfig } from './MaterialManager';
import type { MaterialConfig } from './MaterialManager';

type RoomTemplate = 'LIVING' | 'BATHROOM' | 'SHOWER';

interface RoomScene3DProps {
  roomType?: RoomTemplate;
  textureLine?: string;
  colorHex?: string;
  finish?: 'OPACO' | 'LUCIDO' | 'CERA_LUCIDA' | 'PROTEGGO_COLOR_OPACO';
}

function useAnimatedMaterial(config: MaterialConfig, prevConfig: React.MutableRefObject<MaterialConfig>) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: config.roughness,
    metalness: config.metalness,
    envMapIntensity: config.envMapIntensity,
  }), []);

  const progress = useRef(1);
  const targetConfig = useRef(config);

  if (targetConfig.current !== config) {
    targetConfig.current = config;
    progress.current = 0;
  }

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    progress.current = Math.min(progress.current + delta * 2, 1);
    const t = progress.current;
    const prev = prevConfig.current;
    const tgt = targetConfig.current;

    const prevColor = new THREE.Color(prev.color);
    const tgtColor  = new THREE.Color(tgt.color);
    mat.color.lerpColors(prevColor, tgtColor, t);
    mat.roughness = THREE.MathUtils.lerp(prev.roughness, tgt.roughness, t);
    mat.metalness = THREE.MathUtils.lerp(prev.metalness, tgt.metalness, t);
    mat.needsUpdate = true;

    if (progress.current >= 1) prevConfig.current = tgt;
  });

  return mat;
}

function RoomMeshes({ roomType, textureLine, colorHex, finish }: RoomScene3DProps) {
  const config = useMemo(
    () => getFloorMaterialConfig(textureLine, colorHex, finish),
    [textureLine, colorHex, finish],
  );

  const prevConfig = useRef<MaterialConfig>(config);
  const floorMat   = useAnimatedMaterial(config, prevConfig);

  const wallConfig = useMemo<MaterialConfig>(() => ({
    color: '#E8E0D8',
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.1,
  }), []);
  const wallPrevConfig = useRef<MaterialConfig>(wallConfig);
  const wallMat = useAnimatedMaterial(wallConfig, wallPrevConfig);

  if (roomType === 'SHOWER') {
    return (
      <>
        {/* Shower floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[2.5, 2.5]} />
          <primitive object={floorMat} attach="material" />
        </mesh>
        {/* 3 walls */}
        <mesh position={[0, 1.5, -1.25]}>
          <planeGeometry args={[2.5, 3]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
        <mesh position={[-1.25, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.5, 3]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
        <mesh position={[1.25, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[2.5, 3]} />
          <primitive object={wallMat} attach="material" />
        </mesh>
      </>
    );
  }

  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 1.5, -2.5]}>
        <planeGeometry args={[5, 3]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      {/* Left wall */}
      <mesh position={[-2.5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[5, 3]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      {/* Right wall */}
      <mesh position={[2.5, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[5, 3]} />
        <primitive object={wallMat} attach="material" />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#F5F5F5" roughness={0.95} />
      </mesh>
    </>
  );
}

export function RoomScene3DContent({ roomType = 'LIVING', textureLine, colorHex, finish }: RoomScene3DProps) {
  const camPos: [number, number, number] =
    roomType === 'SHOWER' ? [2.5, 2.0, 2.5] : [3.5, 2.5, 4.0];

  return (
    <>
      <LightingSetup mode="room" />
      <RoomMeshes
        roomType={roomType}
        textureLine={textureLine}
        colorHex={colorHex}
        finish={finish}
      />
      <OrbitControls
        target={[0, 1, 0]}
        minDistance={2}
        maxDistance={8}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
        enablePan={false}
      />
      <perspectiveCamera position={camPos} fov={55} />
    </>
  );
}
