import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { LightingSetup } from './LightingSetup';
import type { LayerConfig } from './MaterialManager';
import { getLayerColor, TEXTURE_SECTION_COLORS, FINISH_PBR } from './MaterialManager';

// ─── Per-layer material (MeshPhysical, clearcoat for protective/texture) ─────

function makeLayerMaterial(section: string, color: string, textureLine?: string): THREE.MeshPhysicalMaterial {
  const c = section === 'texture' && textureLine
    ? TEXTURE_SECTION_COLORS[textureLine] ?? color
    : color;

  const isGlossy   = section === 'protective';
  const isMetallic = section === 'barrier';

  return new THREE.MeshPhysicalMaterial({
    color:              c,
    roughness:          isGlossy   ? 0.25  : isMetallic ? 0.30 : 0.75,
    metalness:          isMetallic ? 0.30  : 0.00,
    clearcoat:          isGlossy   ? 0.60  : section === 'texture' ? 0.10 : 0.00,
    clearcoatRoughness: isGlossy   ? 0.25  : 0.80,
    envMapIntensity:    isGlossy   ? 0.90  : isMetallic ? 0.60 : 0.20,
  });
}

// ─── Single layer box ─────────────────────────────────────────────────────────

interface SingleLayerProps {
  config: LayerConfig;
  positionY: number;
  width: number;
  animDelay: number;
  showTechnical: boolean;
  textureLine?: string;
}

function SingleLayer({ config, positionY, width, animDelay, showTechnical, textureLine }: SingleLayerProps) {
  const [hovered, setHovered] = useState(false);
  const animY   = useRef(positionY - 7);
  const elapsed = useRef(0);
  const settled = useRef(false);
  const hoverAnim = useRef(1.0);

  const material = useMemo(
    () => makeLayerMaterial(config.section, config.color, textureLine),
    [config.section, config.color, textureLine],
  );

  useFrame((_, delta) => {
    // Entry animation
    if (!settled.current) {
      elapsed.current += delta;
      if (elapsed.current >= animDelay) {
        const diff = positionY - animY.current;
        if (Math.abs(diff) < 0.002) {
          animY.current = positionY;
          settled.current = true;
        } else {
          animY.current += diff * Math.min(delta * 9, 0.4);
        }
      }
    }

    // Hover scale
    const targetScale = hovered ? 1.05 : 1.0;
    hoverAnim.current = THREE.MathUtils.lerp(hoverAnim.current, targetScale, delta * 12);
  });

  const height = Math.max(config.thickness_mm / 10, 0.06);

  return (
    <group position={[0, animY.current, 0]}>
      <mesh
        scale={[hoverAnim.current, 1, hoverAnim.current]}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <boxGeometry args={[width, height, 1.2]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Edge line for definition */}
      <lineSegments position={[0, height / 2 + 0.001, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(width, 0.001, 1.2)]} />
        <lineBasicMaterial color="#1e293b" transparent opacity={0.4} />
      </lineSegments>

      {hovered && (
        <Html position={[width / 2 + 0.18, 0, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(10,15,30,0.97)',
            border: `1px solid ${config.color}55`,
            borderLeft: `3px solid ${config.color}`,
            borderRadius: '6px',
            padding: '8px 12px',
            minWidth: '170px',
            color: '#f1f5f9',
            fontSize: '11px',
            lineHeight: '1.7',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{ fontWeight: 700, color: config.color, marginBottom: '4px', fontSize: '12px' }}>
              {config.label}
            </div>
            <div style={{ color: '#94a3b8' }}>
              {config.thickness_mm >= 1
                ? `${config.thickness_mm} mm`
                : `${(config.thickness_mm * 10).toFixed(1)} mm`}
            </div>
            {showTechnical && config.consumption && (
              <div style={{ color: '#64748b', marginTop: '3px' }}>{config.consumption}</div>
            )}
            {showTechnical && config.waiting_time && (
              <div style={{ color: '#38bdf8', marginTop: '3px' }}>⏱ {config.waiting_time}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Full scene ───────────────────────────────────────────────────────────────

interface LayerStack3DSceneProps {
  layers: LayerConfig[];
  showTechnical: boolean;
  textureLine?: string;
}

export function LayerStack3DContent({ layers, showTechnical, textureLine }: LayerStack3DSceneProps) {
  const { positions } = useMemo(() => {
    let y = 0;
    const positions: number[] = [];
    for (const l of layers) {
      const h = Math.max(l.thickness_mm / 10, 0.06);
      positions.push(y + h / 2);
      y += h + 0.025; // small gap between layers
    }
    const center = y / 2;
    return { positions: positions.map(p => p - center) };
  }, [layers]);

  if (layers.length === 0) return null;

  return (
    <>
      <LightingSetup mode="section" />
      {layers.map((layer, i) => (
        <SingleLayer
          key={layer.id}
          config={layer}
          positionY={positions[i]}
          width={2.8}
          animDelay={i * 0.06}
          showTechnical={showTechnical}
          textureLine={textureLine}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={12}
        target={[0, 0, 0]}
      />
    </>
  );
}
