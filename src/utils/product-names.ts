const COMMERCIAL_NAMES: Record<string, string> = {
  RAS_BASE:       'Rasante Base',
  RAS_BASE_Q:     'Rasante Base Quarzo',
  RAS_2K:         'Rasante 2K',
  RAS_FONDO_FINO: 'Rasante Fondo',
  PR_SW:          'Primer SW',
  PR_BOND_SW:     'Primer Bond SW',
  PRIMER_BOND_SW_SQ: 'Primer Bond SW SQ',
  RETE_160:       'Rete di vetro 160 g/mq',
  RETE_75:        'Rete di vetro 75 g/mq',
  BARR_VAP_4:     'Barriera Vapore 4.0 Rasante',
  BARR_VAP_4_PR:  'Barriera Vapore 4.0 Primer',
  AUTO_AS:        'Autolivellante AS',
  GUAINA_BASE:    'Guaina Base',
  STUCCO_EPO:     'Stucco Epossidico',
  STUCCO_LAMBDA:  'Stucco Lambda',
  FONDO_BASE:     'Fondo Base',
  MAS_EP:         'Massetto Epossidico',
  NORPHEN_IGRO:   'Norphen Fondo Igro',
  MS_PRO:         'MS Pro Sealer',
  MS_PRO_SEALER_PRIMER: 'MS Pro Sealer Primer',
  ADD_PLUS:       'Additivo Plus',
  SPOLVERO_Q:     'Quarzo da Spolvero',
  QUARZO_0_1_0_3:  'Quarzo 0,1-0,3 mm',
  QUARZO_0_1_0_5:  'Quarzo 0,1-0,5 mm',
  QUARZO_0_3_0_9:  'Quarzo 0,3-0,9 mm',
  QUARZO_0_7_1_2:  'Quarzo 0,7-1,2 mm',
  QUARZO_0_7_1_2_2: 'Quarzo 0,7-1,2 mm',
  QUARZO_DA_SPOLVERO_0_1_0_5_KIT_12_MQ: 'Quarzo da Spolvero',
  PROTEGGO_FIX_H2O:   'PROTEGGO FIX H2O',
  PROTEGGO_FIX_H2O_2: 'PROTEGGO FIX H2O',
  PROTEGGO_OPACO_H20:   'PROTEGGO OPACO H2O',
  PROTEGGO_OPACO_H20_2: 'PROTEGGO OPACO H2O',
  PROTEGGO_LUCIDO_H20:   'PROTEGGO LUCIDO H2O',
  PROTEGGO_LUCIDO_H20_2: 'PROTEGGO LUCIDO H2O',
  PROTEGGO_FIX_S:   'PROTEGGO FIX S',
  PROTEGGO_FIX_S_2: 'PROTEGGO FIX S',
  PROTEGGO_OPACO_S:   'PROTEGGO OPACO S',
  PROTEGGO_OPACO_S_2: 'PROTEGGO OPACO S',
  PROTEGGO_LUCIDO_S:  'PROTEGGO LUCIDO S',
  PROTEGGO_COLOR_OPACO_H20_COLORE_NATURAL:   'PROTEGGO COLOR',
  PROTEGGO_COLOR_OPACO_H20_COLORE_NATURAL_2: 'PROTEGGO COLOR',
  CRYSTEPO_V:  'Seal Wax',
  CRYSTEPO_50: 'Crystepo 50',
  PREMIX_COLORE_OPACO_S_1_88: 'Premix colore Opaco S',
  PREMIX_COLORE_OPACO_S_6:    'Premix colore Opaco S',
};

let _runtimeOverrides: Record<string, string> = {};

export function setCommercialNameOverrides(overrides: Record<string, string>): void {
  _runtimeOverrides = { ...overrides };
}

export function getCommercialName(product_id: string | undefined | null): string | null {
  if (!product_id) return null;
  return _runtimeOverrides[product_id] ?? COMMERCIAL_NAMES[product_id] ?? null;
}

export function getDefaultCommercialName(product_id: string | undefined | null): string | null {
  if (!product_id) return null;
  return COMMERCIAL_NAMES[product_id] ?? null;
}

export { COMMERCIAL_NAMES };
