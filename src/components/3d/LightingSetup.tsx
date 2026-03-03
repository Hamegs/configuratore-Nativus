import React from 'react';

interface LightingSetupProps {
  mode?: 'section' | 'room';
}

export function LightingSetup({ mode = 'section' }: LightingSetupProps) {
  if (mode === 'section') {
    return (
      <>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <directionalLight position={[-3, 3, -3]} intensity={0.4} color="#b0c4de" />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} castShadow={false} />
      <directionalLight position={[-4, 2, -2]} intensity={0.3} color="#c8d8f0" />
      <pointLight position={[0, 3, 0]} intensity={0.4} decay={2} distance={8} />
    </>
  );
}
