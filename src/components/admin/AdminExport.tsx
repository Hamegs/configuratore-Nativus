import React from 'react';
import * as XLSX from 'xlsx';
import decisionTable from '../../data/static/decision-table.json';
import stepLibrary from '../../data/static/step-library.json';
import stepMap from '../../data/static/step-map.json';
import supporti from '../../data/static/supporti.json';
import listino from '../../data/static/listino.json';
import packagingSku from '../../data/static/packaging-sku.json';
import textureLinesData from '../../data/static/texture-lines.json';
import textureStylesData from '../../data/static/texture-styles.json';
import textureOrderRules from '../../data/static/texture-order-rules.json';
import protettiviH2o from '../../data/static/protettivi-h2o.json';
import protettiviS from '../../data/static/protettivi-s.json';
import dinInputs from '../../data/static/din-inputs.json';
import dinOrderRules from '../../data/static/din-order-rules.json';
import ambienti from '../../data/static/ambienti.json';

interface ExportDataset {
  id: string;
  label: string;
  description: string;
  getData: () => object[];
}

const DATASETS: ExportDataset[] = [
  {
    id: 'decision_table',
    label: 'Decision Table',
    description: 'Regole di matching supporto/ambiente → stratigrafia',
    getData: () => decisionTable as object[],
  },
  {
    id: 'step_library',
    label: 'Step Library',
    description: 'Catalogo di tutti gli step procedurali con consumi e tempi',
    getData: () => stepLibrary as object[],
  },
  {
    id: 'step_map',
    label: 'Step Map',
    description: 'Mappatura rule_id → sequenza step_id',
    getData: () => stepMap as object[],
  },
  {
    id: 'supporti',
    label: 'Supporti',
    description: 'Elenco supporti (pavimento e parete) con etichette e metadati',
    getData: () => supporti as object[],
  },
  {
    id: 'packaging_sku',
    label: 'Packaging SKU',
    description: 'Tutte le pezzature disponibili per ogni product_id',
    getData: () => packagingSku as object[],
  },
  {
    id: 'listino',
    label: 'Listino prezzi',
    description: 'Prezzi di listino per ogni SKU',
    getData: () => listino as object[],
  },
  {
    id: 'texture_lines',
    label: 'Linee texture',
    description: 'Elenco linee texture con regole di compatibilità',
    getData: () => textureLinesData as object[],
  },
  {
    id: 'texture_styles',
    label: 'Stili texture',
    description: 'Stili per ogni linea texture (CHROMO, ALIZEÈ, ecc.)',
    getData: () => textureStylesData as object[],
  },
  {
    id: 'texture_order_rules',
    label: 'Regole ordine texture',
    description: 'Logiche di calcolo quantità e packaging texture',
    getData: () => textureOrderRules as object[],
  },
  {
    id: 'protettivi_h2o',
    label: 'Protettivi H2O',
    description: 'Regole protettivi base acqua con consumi e step',
    getData: () => [protettiviH2o as unknown as object],
  },
  {
    id: 'protettivi_s',
    label: 'Protettivi S',
    description: 'Regole protettivi a solvente con consumi e step',
    getData: () => [protettiviS as unknown as object],
  },
  {
    id: 'din_inputs',
    label: 'DIN Inputs',
    description: 'Parametri di input per modulo DIN 18534',
    getData: () => dinInputs as object[],
  },
  {
    id: 'din_order_rules',
    label: 'DIN Order Rules',
    description: 'Regole di calcolo accessori DIN (BBtape, BBcorner, Norphen, ecc.)',
    getData: () => dinOrderRules as object[],
  },
  {
    id: 'ambienti',
    label: 'Ambienti',
    description: 'Elenco ambienti configurabili',
    getData: () => ambienti as object[],
  },
];

function downloadSingleSheet(dataset: ExportDataset) {
  const data = dataset.getData();
  if (data.length === 0) {
    alert(`Nessun dato in "${dataset.label}"`);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, dataset.id.substring(0, 31));
  XLSX.writeFile(wb, `nativus_${dataset.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function downloadAllSheets() {
  const wb = XLSX.utils.book_new();
  for (const ds of DATASETS) {
    const data = ds.getData();
    if (data.length === 0) continue;
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, ds.id.substring(0, 31));
  }
  XLSX.writeFile(wb, `nativus_export_completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function AdminExport() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Export dati</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Scarica tutti i dataset della configurazione in formato Excel (.xlsx).
          </p>
        </div>
        <button
          type="button"
          className="btn-primary text-sm px-5"
          onClick={downloadAllSheets}
        >
          Scarica tutto (1 file)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DATASETS.map(ds => (
          <div key={ds.id} className="card p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-sm text-gray-800">{ds.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ds.description}</p>
              <p className="text-xs text-gray-400 font-mono mt-1">{ds.getData().length} righe</p>
            </div>
            <button
              type="button"
              className="btn-secondary text-xs whitespace-nowrap shrink-0"
              onClick={() => downloadSingleSheet(ds)}
            >
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
