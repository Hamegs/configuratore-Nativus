import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LightingSetup } from './LightingSetup';
import type { LayerConfig } from './MaterialManager';
import { getLayerColor, TEXTURE_SECTION_COLORS } from './MaterialManager';

interface SingleLayerProps {
  config: LayerConfig;
  positionY: number;
  width: number;
  animDelay: number;
  showTechnical: boolean;
  textureLine?: string;
}

function SingleLayer({ config, positionY, width, animDelay, showTechnical, textureLine }: SingleLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [animY, setAnimY] = useState(positionY - 6);
  const elapsed = useRef(0);
  const settled = useRef(false);

  const color = useMemo(() => {
    if (config.section === 'texture' && textureLine) {
      return TEXTURE_SECTION_COLORS[textureLine] ?? config.color;
    }
    return config.color;
  }, [config.color, config.section, textureLine]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    roughness: config.section === 'texture' ? 0.6 : 0.8,
    metalness: config.section === 'barrier' ? 0.2 : 0.0,
  }), [color, config.section]);

  useFrame((_, delta) => {
    if (settled.current) return;
    elapsed.current += delta;
    if (elapsed.current < animDelay) return;

    setAnimY(prev => {
      const diff = positionY - prev;
      if (Math.abs(diff) < 0.002) {
        settled.current = true;
        return positionY;
      }
      return prev + diff * Math.min(delta * 8, 0.3);
    });
  });

  const scaleFactor = hovered ? 1.04 : 1.0;
  const height = Math.max(config.thickness_mm / 10, 0.08);

  return (
    <group position={[0, animY, 0]}>
      <mesh
        ref={meshRef}
        scale={[scaleFactor, 1, scaleFactor]}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[width, height, 1.2]} />
        <primitive object={material} attach="material" />
      </mesh>
      {hovered && (
        <Html position={[width / 2 + 0.15, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(100,116,139,0.5)',
            borderRadius: '6px',
            padding: '8px 12px',
            minWidth: '160px',
            color: '#f1f5f9',
            fontSize: '11px',
            lineHeight: '1.6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontWeight: 700, color: color, marginBottom: '4px' }}>{config.label}</div>
            <div style={{ color: '#94a3b8' }}>{config.thickness_mm} mm</div>
            {showTechnical && config.consumption && (
              <div style={{ color: '#64748b', marginTop: '2px' }}>{config.consumption}</div>
            )}
            {showTechnical && config.waiting_time && (
              <div style={{ color: '#0ea5e9', marginTop: '2px' }}>Attesa: {config.waiting_time}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

interface LayerStack3DSceneProps {
  layers: LayerConfig[];
  showTechnical: boolean;
  textureLine?: string;
}

function LayerStack3DScene({ layers, showTechnical, textureLine }: LayerStack3DSceneProps) {
  const { gl, size } = useThree();
  const W = 2.8;

  const { positions } = useMemo(() => {
    let y = 0;
    const positions: number[] = [];
    for (const l of layers) {
      const h = Math.max(l.thickness_mm / 10, 0.08);
      positions.push(y + h / 2);
      y += h + 0.02;
    }
    const totalH = y;
    const centerOffset = totalH / 2;
    return { positions: positions.map(p => p - centerOffset) };
  }, [layers]);

  return (
    <>
      <LightingSetup mode="section" />
      {layers.map((layer, i) => (
        <SingleLayer
          key={layer.id}
          config={layer}
          positionY={positions[i]}
          width={W}
          animDelay={i * 0.07}
          showTechnical={showTechnical}
          textureLine={textureLine}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        target={[0, 0, 0]}
      />
    </>
  );
}

interface LayerStack3DProps {
  layers: LayerConfig[];
  showTechnical: boolean;
  textureLine?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export function LayerStack3DScene_Export({ layers, showTechnical, textureLine, canvasRef }: LayerStack3DProps) {
  return <LayerStack3DScene layers={layers} showTechnical={showTechnical} textureLine={textureLine} />;
}

export { LayerStack3DScene as LayerStack3DContent };
