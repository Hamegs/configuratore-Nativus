export function formatEur(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatQty(qty: number, unit: string): string {
  if (unit === 'kg' || unit === 'kg/m²' || unit === 'g/m²') {
    return `${qty.toLocaleString('it-IT', { maximumFractionDigits: 2 })} ${unit}`;
  }
  return `${qty} ${unit}`;
}

export function formatMq(mq: number): string {
  return `${mq.toLocaleString('it-IT', { maximumFractionDigits: 1 })} m²`;
}

export function formatStep(order: number): string {
  return `Step ${order / 10}`;
}

export function ambienteLabel(envId: string): string {
  const map: Record<string, string> = {
    ORD: 'Soggiorno / Cucina / Camere',
    BAG: 'Bagno (no doccia)',
    DOC: 'Zona doccia',
    DIN: 'DIN 18534 (mercato tedesco)',
  };
  return map[envId] ?? envId;
}

export function macroLabel(macroId: string): string {
  return macroId === 'FLOOR' ? 'Pavimento' : 'Parete';
}

export function stepTypeIcon(stepTypeId: string): string {
  const map: Record<string, string> = {
    MECH: '⚙',
    PRIM: '🎨',
    REPR: '🔧',
    WPRO: '🛡',
    STRC: '🧱',
    ARMR: '🕸',
    ADDV: '➕',
    WAIT: '⏱',
    GATE: '⚠',
    NOTE: '📋',
  };
  return map[stepTypeId] ?? '•';
}

export function stepTypeLabel(stepTypeId: string): string {
  const map: Record<string, string> = {
    MECH: 'Preparazione meccanica',
    PRIM: 'Primer / Consolidamento',
    REPR: 'Riparazione',
    WPRO: 'Impermeabilizzazione',
    STRC: 'Fondo strutturale',
    ARMR: 'Armatura / Rete',
    ADDV: 'Additivo',
    WAIT: 'Attesa',
    GATE: 'Gateway',
    NOTE: 'Nota operativa',
  };
  return map[stepTypeId] ?? stepTypeId;
}

export function textureLineLabel(lineId: string): string {
  const map: Record<string, string> = {
    NATURAL: 'NATURAL',
    SENSE: 'SENSE (Guayule)',
    DEKORA: 'DEKORA',
    LAMINE: 'LAMINE',
    CORLITE: 'CORLITE',
    MATERIAL: 'MATERIAL',
  };
  return map[lineId] ?? lineId;
}

export function protectionSystemLabel(system: string): string {
  return system === 'H2O' ? 'Base acqua (H₂O)' : 'Solvente (S)';
}

export function finituraLabel(finitura: string): string {
  const map: Record<string, string> = {
    OPACO: 'Opaco',
    LUCIDO: 'Lucido',
    CERA_LUCIDA: 'Cera Lucida',
    PROTEGGO_COLOR_OPACO: 'PROTEGGO Color Opaco (colorato)',
  };
  return map[finitura] ?? finitura;
}

export function roundUp(val: number): number {
  return Math.ceil(val);
}

export function wastePercent(needed: number, provided: number): number {
  if (needed === 0) return 0;
  return Math.round(((provided - needed) / needed) * 100);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
