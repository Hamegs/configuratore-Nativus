import * as XLSX from 'xlsx';
import type { ProjectRoom, ProjectCartRow, PackagingStrategy } from '../types/project';

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export function exportProjectXlsx(
  rooms: ProjectRoom[],
  cart: ProjectCartRow[],
  strategy: PackagingStrategy,
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Materiali aggregati
  const materialiData = cart.map(r => ({
    Prodotto: r.descrizione,
    Confezioni: r.qty_packs,
    'Pack / conf.': r.pack_size,
    Unità: r.pack_unit,
    'Prezzo unitario (€)': r.prezzo_unitario.toFixed(2),
    'Totale (€)': r.totale.toFixed(2),
    Sezione: r.section,
    Ambienti: (r.from_rooms ?? []).join(', '),
    Stato: r.status,
    Strategia: strategy,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materialiData), 'Materiali');

  // Sheet 2 — Per ambiente
  const perAmbienteRows: Record<string, string | number>[] = [];
  for (const room of rooms) {
    const roomName = room.custom_name || room.room_type;
    perAmbienteRows.push({ '': `─── ${roomName.toUpperCase()} ───`, Prodotto: '', Confezioni: '', 'Totale (€)': '' });
    for (const line of room.cart_lines) {
      perAmbienteRows.push({
        '': '',
        Prodotto: line.descrizione,
        Confezioni: line.qty,
        'Consumo (kg)': line.qty_raw?.toFixed(3) ?? '',
        'Pack size': line.pack_size ?? '',
        Unità: line.pack_unit ?? '',
        'Prezzo unitario (€)': line.prezzo_unitario?.toFixed(2) ?? '',
        'Totale (€)': line.totale?.toFixed(2) ?? '',
        Sezione: line.section,
      });
    }
    perAmbienteRows.push({ '': '' });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perAmbienteRows), 'Per ambiente');

  // Sheet 3 — Lavorazioni
  const lavData: Record<string, string | number>[] = [];
  for (const room of rooms) {
    const roomName = room.custom_name || room.room_type;
    lavData.push({ Ambiente: `─── ${roomName} ───`, Step: '', Descrizione: '', Prodotto: '', Consumo: '', Note: '' });
    for (const lav of room.step_lavorazioni) {
      lavData.push({
        Ambiente: roomName,
        Step: lav.numero_step,
        Descrizione: lav.descrizione_step,
        Prodotto: lav.prodotti_coinvolti,
        Consumo: lav.consumi_step,
        Note: lav.note_tecniche,
      });
    }
    lavData.push({ Ambiente: '' });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lavData), 'Lavorazioni');

  XLSX.writeFile(wb, `nativus_progetto_${dateStamp()}.xlsx`);
}

export function exportRoomXlsx(room: ProjectRoom): void {
  const wb = XLSX.utils.book_new();
  const roomName = room.custom_name || room.room_type;

  const materialiData = room.cart_lines.map(l => ({
    Prodotto: l.descrizione,
    Confezioni: l.qty,
    'Consumo (kg)': l.qty_raw?.toFixed(3) ?? '',
    'Pack size': l.pack_size ?? '',
    Unità: l.pack_unit ?? '',
    'Prezzo unitario (€)': l.prezzo_unitario?.toFixed(2) ?? '',
    'Totale (€)': l.totale?.toFixed(2) ?? '',
    Sezione: l.section,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materialiData), 'Materiali ambiente');

  const lavData = room.step_lavorazioni.map(lav => ({
    Step: lav.numero_step,
    Descrizione: lav.descrizione_step,
    Prodotto: lav.prodotti_coinvolti,
    Consumo: lav.consumi_step,
    Note: lav.note_tecniche,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lavData), 'Lavorazioni');

  XLSX.writeFile(wb, `nativus_${roomName}_${dateStamp()}.xlsx`);
}
