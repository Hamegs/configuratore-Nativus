import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LightingSetup } from './LightingSetup';
import {
  createPBRMaterial,
  getCachedNormalMap,
  getCachedRoughnessMap,
  FINISH_PBR,
  DEFAULT_FINISH_PBR,
} from './MaterialManager';
import type { FinishType } from './MaterialManager';

type RoomTemplate = 'LIVING' | 'BATHROOM' | 'SHOWER';

// ─── Easing ──────────────────────────────────────────────────────────────────

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(1, t), 3);
}

// ─── Animated PBR material hook ──────────────────────────────────────────────

function usePBRMaterial(
  textureLine: string | undefined,
  colorHex:    string | undefined,
  finish:      FinishType,
) {
  const mat = useMemo(
    () => createPBRMaterial(textureLine, colorHex, finish),
    // Intentionally create once; effects handle subsequent updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Animate roughness/clearcoat when finish changes ──
  const targetR   = useRef(mat.roughness);
  const targetC   = useRef(mat.clearcoat);
  const targetCR  = useRef(mat.clearcoatRoughness);
  const targetEI  = useRef(mat.envMapIntensity);
  const targetNI  = useRef(1.0);
  const animating  = useRef(false);

  useEffect(() => {
    const fc = FINISH_PBR[finish ?? ''] ?? DEFAULT_FINISH_PBR;
    targetR.current  = fc.roughness;
    targetC.current  = fc.clearcoat;
    targetCR.current = fc.clearcoatRoughness;
    targetEI.current = fc.envMapIntensity;
    targetNI.current = fc.normalIntensity;
    animating.current = true;
  }, [finish]);

  // ── Update color + maps when texture/color changes ──
  useEffect(() => {
    const nm = getCachedNormalMap(textureLine ?? 'DEFAULT', finish);
    const rm = getCachedRoughnessMap(textureLine ?? 'DEFAULT', finish);
    nm.repeat.set(4, 4);
    rm.repeat.set(4, 4);
    mat.color.set(colorHex ?? '#CCBBAA');
    mat.normalMap    = nm;
    mat.roughnessMap = rm;
    mat.needsUpdate  = true;
  }, [textureLine, colorHex]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!animating.current) return;
    const SPEED = 5; // ~200 ms

    mat.roughness          = THREE.MathUtils.lerp(mat.roughness,          targetR.current,  delta * SPEED);
    mat.clearcoat          = THREE.MathUtils.lerp(mat.clearcoat,          targetC.current,  delta * SPEED);
    mat.clearcoatRoughness = THREE.MathUtils.lerp(mat.clearcoatRoughness, targetCR.current, delta * SPEED);
    mat.envMapIntensity    = THREE.MathUtils.lerp(mat.envMapIntensity,     targetEI.current, delta * SPEED);
    mat.normalScale.x      = THREE.MathUtils.lerp(mat.normalScale.x,      targetNI.current, delta * SPEED);
    mat.normalScale.y      = mat.normalScale.x;

    const close = (a: number, b: number) => Math.abs(a - b) < 0.004;
    if (close(mat.roughness, targetR.current) && close(mat.clearcoat, targetC.current)) {
      animating.current = false;
    }
  });

  return mat;
}

// ─── Wall material (static, neutral) ─────────────────────────────────────────

function useWallMaterial() {
  return useMemo(() => new THREE.MeshStandardMaterial({
    color:    '#EAE4DA',
    roughness: 0.88,
    metalness: 0.00,
  }), []);
}

// ─── Room geometry components ─────────────────────────────────────────────────

interface RoomGeomProps {
  textureLine: string | undefined;
  colorHex:    string | undefined;
  finish:      FinishType;
  roomType:    RoomTemplate;
}

function LivingRoom({ textureLine, colorHex, finish }: Omit<RoomGeomProps, 'roomType'>) {
  const floorMat = usePBRMaterial(textureLine, colorHex, finish);
  const wallMat  = useWallMaterial();

  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
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
        <meshStandardMaterial color="#F5F5F5" roughness={0.96} />
      </mesh>
    </>
  );
}

function BathroomRoom({ textureLine, colorHex, finish }: Omit<RoomGeomProps, 'roomType'>) {
  const floorMat = usePBRMaterial(textureLine, colorHex, finish);
  const wallMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F0EDEA', roughness: 0.82,
  }), []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      {['back', 'left', 'right', 'front'].map((side, i) => {
        const pos: [number, number, number][] = [
          [0, 1.3, -2], [-2, 1.3, 0], [2, 1.3, 0], [0, 1.3, 2],
        ];
        const rot: [number, number, number][] = [
          [0, 0, 0], [0, Math.PI / 2, 0], [0, -Math.PI / 2, 0], [0, Math.PI, 0],
        ];
        return (
          <mesh key={side} position={pos[i]} rotation={rot[i]}>
            <planeGeometry args={[4, 2.6]} />
            <primitive object={wallMat} attach="material" />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.6, 0]}>
        <planeGeometry args={[4, 4]} />
        <meshStandardMaterial color="#F8F8F8" roughness={0.97} />
      </mesh>
    </>
  );
}

function ShowerRoom({ textureLine, colorHex, finish }: Omit<RoomGeomProps, 'roomType'>) {
  const floorMat = usePBRMaterial(textureLine, colorHex, finish);
  const wallMat  = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E8E2DC', roughness: 0.85,
  }), []);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
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

// ─── Public scene component ───────────────────────────────────────────────────

interface RoomScene3DProps {
  roomType?:   RoomTemplate;
  textureLine?: string;
  colorHex?:   string;
  finish?:     FinishType;
}

export function RoomScene3DContent({
  roomType = 'LIVING',
  textureLine,
  colorHex,
  finish,
}: RoomScene3DProps) {
  const camPos: [number, number, number] =
    roomType === 'SHOWER' ? [2.5, 2.0, 2.5] :
    roomType === 'BATHROOM' ? [3.0, 2.2, 3.0] :
    [3.5, 2.5, 4.0];

  const RoomComp =
    roomType === 'SHOWER'   ? ShowerRoom   :
    roomType === 'BATHROOM' ? BathroomRoom :
    LivingRoom;

  return (
    <>
      <LightingSetup mode="room" />
      <RoomComp textureLine={textureLine} colorHex={colorHex} finish={finish} />
      <OrbitControls
        target={[0, 1, 0]}
        minDistance={1.5}
        maxDistance={7}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI / 2.05}
        enablePan={false}
      />
    </>
  );
}
