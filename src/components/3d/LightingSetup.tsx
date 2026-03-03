import React from 'react';
import { Environment } from '@react-three/drei';

interface LightingSetupProps {
  mode?: 'section' | 'room';
}

export function LightingSetup({ mode = 'section' }: LightingSetupProps) {
  if (mode === 'section') {
    return (
      <>
        {/* Studio-style HDRI for IBL — drives PBR reflections on layer materials */}
        <Environment preset="studio" background={false} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 7, 5]}  intensity={1.0} color="#ffffff" />
        <directionalLight position={[-3, 2, -3]} intensity={0.25} color="#b8c8e0" />
      </>
    );
  }

  return (
    <>
      {/* Apartment HDRI — warm, realistic interior IBL */}
      <Environment preset="apartment" background={false} />
      <ambientLight intensity={0.25} />
      {/* Key light — upper right, warm */}
      <directionalLight position={[3, 6, 4]}  intensity={0.9} color="#fff5e4" />
      {/* Fill light — left, cool/neutral */}
      <directionalLight position={[-4, 2, -2]} intensity={0.20} color="#c8d8f0" />
      {/* Ceiling bounce */}
      <pointLight position={[0, 3.5, 0]} intensity={0.3} decay={2} distance={7} color="#fffbf0" />
    </>
  );
}
