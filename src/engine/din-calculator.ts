import type { DataStore } from '../utils/data-loader';
import type { DinInputValues } from '../types/din';
import type { CartLine } from '../types/cart';
import type { WizardState } from '../types/wizard-state';

export function buildDinInputsFromWizard(state: WizardState): DinInputValues {
  if (state.mercato_tedesco && state.presenza_doccia) {
    return {
      DIN_DOCCE_PZ: 1,
      DIN_BBCORNER_IN_PZ: state.doccia_bbcorner_in ?? 0,
      DIN_BBCORNER_OUT_PZ: state.doccia_bbcorner_out ?? 0,
      DIN_BBPASS_PZ: state.doccia_raccordi_standard ?? 0,
      DIN_BBDRAIN_PZ: state.doccia_raccordi_grandi ?? 0,
      DIN_BBTAPE_ML: state.doccia_bbtape_ml ?? 0,
      DIN_NORPHEN_ML: state.doccia_norphen_ml ?? 0,
    };
  }
  const nRaccordi = state.doccia_n_raccordi ?? 0;
  const norphen_ml = nRaccordi * 0.30;
  return {
    DIN_DOCCE_PZ: state.presenza_doccia ? 1 : 0,
    DIN_BBCORNER_IN_PZ: 0,
    DIN_BBCORNER_OUT_PZ: 0,
    DIN_BBPASS_PZ: 0,
    DIN_BBDRAIN_PZ: 0,
    DIN_BBTAPE_ML: 0,
    DIN_NORPHEN_ML: norphen_ml,
  };
}


export interface DinCartResult {
  cart_lines: CartLine[];
  hard_alerts: string[];
}

function priceOf(store: DataStore, sku_id: string): number {
  return store.listino.find(l => l.sku_id === sku_id)?.prezzo_listino ?? 0;
}

function descOf(store: DataStore, sku_id: string): string {
  return store.packagingSku.find(p => p.sku_id === sku_id)?.descrizione_sku ?? sku_id;
}

export function computeDinCart(
  store: DataStore,
  inputs: DinInputValues,
): DinCartResult {
  const lines: CartLine[] = [];
  const alerts: string[] = [];

  function addLine(sku_id: string, qty: number, note?: string) {
    if (qty <= 0) return;
    const prezzo = priceOf(store, sku_id);
    lines.push({
      sku_id,
      descrizione: note ? `${descOf(store, sku_id)} — ${note}` : descOf(store, sku_id),
      qty,
      prezzo_unitario: prezzo,
      totale: qty * prezzo,
      section: 'din',
    });
  }

  // 1 cartuccia MS Pro Sealer per doccia
  if (inputs.DIN_DOCCE_PZ > 0) {
    addLine('MS_PRO_SEALER_IN_CARTUCCIA_1CART', inputs.DIN_DOCCE_PZ, '1 cartuccia/doccia');
  }

  // BB Corner IN
  if (inputs.DIN_BBCORNER_IN_PZ > 0) {
    addLine('BBCORNER_IN_1PZ', inputs.DIN_BBCORNER_IN_PZ);
  }

  // BB Corner OUT
  if (inputs.DIN_BBCORNER_OUT_PZ > 0) {
    addLine('BBCORNER_OUT_1PZ', inputs.DIN_BBCORNER_OUT_PZ);
  }

  // BB Pass
  if (inputs.DIN_BBPASS_PZ > 0) {
    addLine('BBPASS_120X120_1PZ', inputs.DIN_BBPASS_PZ, 'dopo MS Pro Sealer');
  }

  // BB Drain
  if (inputs.DIN_BBDRAIN_PZ > 0) {
    addLine('BB_DRAIN_PZ', inputs.DIN_BBDRAIN_PZ);
  }

  // BB Tape: ceil(ml / 50) rotoli da 50ml
  if (inputs.DIN_BBTAPE_ML > 0) {
    const rolls = Math.ceil(inputs.DIN_BBTAPE_ML / 50);
    addLine('BBTAPE_50M', rolls, `${inputs.DIN_BBTAPE_ML} ml → ${rolls} rotolo/i`);
  }

  // Norphen Fondo Igro: standard 5 g/ml (fascia 5 cm)
  // kg = (ml * 5) / 1000; packs = ceil(kg / 0.5)
  if (inputs.DIN_NORPHEN_ML > 0) {
    const kgNorphen = (inputs.DIN_NORPHEN_ML * 5) / 1000;
    const packsNorphen = Math.ceil(kgNorphen / 0.5);
    addLine('MS_PRO_SEALER_NORPHEN_FONDO_IGRO_0_5KG', packsNorphen, `${inputs.DIN_NORPHEN_ML} ml sigillature @ 5 g/ml`);
  }

  if (lines.length > 0) {
    alerts.push('DIN 18534: verificare la posa di tutte le bandelle perimetrali e raccordi prima della guaina base.');
  }

  return { cart_lines: lines, hard_alerts: alerts };
}

export function validateDinInputs(inputs: DinInputValues): string[] {
  const errors: string[] = [];
  if (inputs.DIN_DOCCE_PZ < 1) errors.push('Numero docce deve essere ≥ 1 per il modulo DIN 18534.');
  if (inputs.DIN_BBTAPE_ML <= 0) errors.push('Metri lineari BBtape obbligatori.');
  if (inputs.DIN_NORPHEN_ML <= 0) errors.push('Metri lineari sigillature Norphen obbligatori.');
  return errors;
}
