import React from 'react';
import { useConfiguratorMode } from '../../context/ConfiguratorModeContext';

export type ViewMode3D = 'SECTION' | 'ROOM';

interface Preview3DSwitchProps {
  value: ViewMode3D;
  onChange: (v: ViewMode3D) => void;
}

export function defaultViewModeForRole(mode: string): ViewMode3D {
  if (mode === 'SALES') return 'ROOM';
  return 'SECTION';
}

export function Preview3DSwitch({ value, onChange }: Preview3DSwitchProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-700/60 p-1">
      <button
        type="button"
        onClick={() => onChange('SECTION')}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          value === 'SECTION'
            ? 'bg-slate-900 text-cyan-300 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <rect x="1" y="11" width="14" height="3" rx="0.5" />
          <rect x="1" y="7"  width="14" height="3" rx="0.5" opacity="0.7" />
          <rect x="1" y="3"  width="14" height="3" rx="0.5" opacity="0.4" />
        </svg>
        Sezione
      </button>
      <button
        type="button"
        onClick={() => onChange('ROOM')}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
          value === 'ROOM'
            ? 'bg-slate-900 text-cyan-300 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
          <path d="M1 13 L8 4 L15 13 Z" opacity="0.6" />
          <rect x="3" y="13" width="4" height="2" />
          <rect x="9" y="10" width="5" height="5" />
        </svg>
        Stanza
      </button>
    </div>
  );
}
