import React from 'react';

interface Layer {
  label: string;
  sublabel?: string;
  color: string;
  height?: number;
}

interface LayerStackProps {
  support?: string;
  hasBarrier?: boolean;
  rasante?: string;
  hasPrimer?: boolean;
  texture?: string;
  color?: string;
  protective?: string;
}

const SUPPORT_LABELS: Record<string, string> = {
  calcestruzzo: 'Calcestruzzo',
  massetto: 'Massetto',
  piastrelle: 'Piastrelle',
  parquet: 'Parquet',
  pannello: 'Pannello',
  gres: 'Gres',
  muratura: 'Muratura',
};

const TEXTURE_COLORS: Record<string, string> = {
  NATURAL: 'bg-amber-400',
  SENSE: 'bg-violet-400',
  DEKORA: 'bg-rose-400',
  LAMINE: 'bg-slate-400',
  MATERIAL: 'bg-teal-400',
  CORLITE: 'bg-orange-400',
};

export function LayerStack({ support, hasBarrier, rasante, hasPrimer, texture, color, protective }: LayerStackProps) {
  const layers: Layer[] = [];

  if (support) {
    layers.push({
      label: SUPPORT_LABELS[support.toLowerCase()] ?? support,
      color: 'bg-gray-500',
      height: 24,
    });
  }

  if (hasBarrier) {
    layers.push({ label: 'Barriera vapore', color: 'bg-blue-400', height: 6 });
  }

  if (rasante) {
    layers.push({ label: rasante.replace(/_/g, ' '), sublabel: '0.8 – 1.5 kg/m²', color: 'bg-yellow-300', height: 14 });
  }

  if (hasPrimer) {
    layers.push({ label: 'Primer SW', sublabel: '0.15 kg/m²', color: 'bg-sky-300', height: 6 });
  }

  if (texture) {
    const txColor = TEXTURE_COLORS[texture] ?? 'bg-brand-400';
    layers.push({
      label: texture,
      sublabel: color ?? undefined,
      color: txColor,
      height: 18,
    });
  }

  if (protective) {
    layers.push({ label: `Proteggo ${protective}`, sublabel: '0.3 – 0.5 kg/m²', color: 'bg-emerald-400', height: 8 });
  }

  if (layers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Nessuna configurazione
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-0.5 px-4 py-3">
      {layers.map((layer, i) => (
        <div
          key={i}
          className={`flex items-center justify-between rounded px-3 text-xs font-medium text-white ${layer.color}`}
          style={{ height: `${layer.height ?? 16}px`, minHeight: `${layer.height ?? 16}px` }}
          title={layer.sublabel}
        >
          <span className="truncate">{layer.label}</span>
          {layer.sublabel && (
            <span className="ml-2 shrink-0 opacity-75">{layer.sublabel}</span>
          )}
        </div>
      ))}
    </div>
  );
}
