import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PackagedItem, TechnicalGroup } from '../types/services';
import type { PackagingStrategy, ProjectRoom } from '../types/project';
import { formatEur } from '../utils/format';

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function dateLabel(): string {
  return new Date().toLocaleDateString('it-IT');
}

export function exportCommercial(
  items: PackagedItem[],
  strategy: PackagingStrategy,
  format: 'xlsx' | 'pdf',
): void {
  const active = items.filter(i => i.status === 'active');
  if (format === 'xlsx') {
    exportCommercialXlsx(active, strategy);
  } else {
    exportCommercialPdf(active);
  }
}

export function exportTechnical(
  groups: TechnicalGroup[],
  rooms: ProjectRoom[],
  format: 'xlsx' | 'pdf',
): void {
  if (format === 'xlsx') {
    exportTechnicalXlsx(groups, rooms);
  } else {
    exportTechnicalPdf(groups, rooms);
  }
}

function exportCommercialXlsx(items: PackagedItem[], strategy: PackagingStrategy): void {
  const wb = XLSX.utils.book_new();
  const rows = items.map(i => ({
    Prodotto: i.nomeCommerciale,
    Descrizione: i.description,
    Confezioni: i.qty_packs,
    'Pack / conf.': i.pack_size,
    Unità: i.pack_unit,
    'Prezzo (€)': i.prezzo_unitario.toFixed(2),
    'Totale (€)': i.totale.toFixed(2),
    Sezione: i.section,
    Strategia: strategy,
  }));
  const total = items.reduce((s, i) => s + i.totale, 0);
  const totalRow = { Prodotto: 'TOTALE', Descrizione: '', Confezioni: '', 'Pack / conf.': '', Unità: '', 'Prezzo (€)': '', 'Totale (€)': total.toFixed(2), Sezione: '', Strategia: '' };
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...rows, totalRow]), 'Carrello');
  XLSX.writeFile(wb, `nativus_carrello_${dateStamp()}.xlsx`);
}

function exportCommercialPdf(items: PackagedItem[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(41, 37, 36);
  doc.rect(0, 0, pageW, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NATIVUS', 15, 22);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Preventivo Commerciale', 15, 32);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generato il ${dateLabel()}`, 15, 42);
  doc.setTextColor(0, 0, 0);

  const total = items.reduce((s, i) => s + i.totale, 0);

  autoTable(doc, {
    startY: 60,
    head: [['Prodotto', 'Conf.', 'Pack', 'Unità', 'Prezzo', 'Totale €']],
    body: [
      ...items.map(i => [
        i.nomeCommerciale,
        String(i.qty_packs),
        String(i.pack_size),
        i.pack_unit,
        formatEur(i.prezzo_unitario),
        formatEur(i.totale),
      ]),
      ['', '', '', '', 'TOTALE', formatEur(total)],
    ],
    headStyles: { fillColor: [41, 37, 36] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });

  doc.save(`nativus_carrello_${dateStamp()}.pdf`);
}

function exportTechnicalXlsx(groups: TechnicalGroup[], rooms: ProjectRoom[]): void {
  const wb = XLSX.utils.book_new();
  const rows = groups.map(g => ({
    Prodotto: g.nomeCommerciale,
    Descrizione: g.description,
    Sezione: g.section,
    Zona: g.destination ?? '',
    'Consumo lordo': g.qty_raw.toFixed(3),
    Unità: g.unit,
    'Linea texture': g.texture_line ?? '',
    Colore: g.color_label ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Scaletta tecnica');

  const envRows: Record<string, string | number>[] = [];
  for (const room of rooms) {
    const name = room.custom_name || room.room_type;
    envRows.push({ Ambiente: `─── ${name} ───`, Prodotto: '', Consumo: '', Unità: '' });
    for (const line of room.cart_lines) {
      envRows.push({
        Ambiente: '',
        Prodotto: line.descrizione,
        Consumo: line.qty_raw?.toFixed(3) ?? String(line.qty),
        Unità: line.pack_unit ?? 'kg',
      });
    }
    envRows.push({ Ambiente: '' });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(envRows), 'Per ambiente');
  XLSX.writeFile(wb, `nativus_tecnico_${dateStamp()}.xlsx`);
}

function exportTechnicalPdf(groups: TechnicalGroup[], rooms: ProjectRoom[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(41, 37, 36);
  doc.rect(0, 0, pageW, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NATIVUS', 15, 22);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Scaletta Tecnica', 15, 32);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generato il ${dateLabel()} — ${rooms.length} ambiente/i`, 15, 42);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 60,
    head: [['Prodotto', 'Zona', 'Consumo lordo', 'Unità']],
    body: groups.map(g => [
      g.description,
      g.destination ?? '',
      g.qty_raw.toFixed(3),
      g.unit,
    ]),
    headStyles: { fillColor: [41, 37, 36] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });

  doc.save(`nativus_tecnico_${dateStamp()}.pdf`);
}
