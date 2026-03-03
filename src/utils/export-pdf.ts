import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProjectRoom, ProjectCartRow } from '../types/project';

function dateLabel(): string {
  return new Date().toLocaleDateString('it-IT');
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

export function exportProjectPdf(rooms: ProjectRoom[], cart: ProjectCartRow[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Copertina
  doc.setFillColor(41, 37, 36);
  doc.rect(0, 0, pageW, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('NATIVUS', 15, 22);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text('Riepilogo Progetto', 15, 32);
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generato il ${dateLabel()} — ${rooms.length} ambiente/i configurato/i`, 15, 42);
  doc.setTextColor(0, 0, 0);

  let y = 60;

  // Materiali aggregati
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Materiali aggregati', 15, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Prodotto', 'Conf.', 'Prezzo', 'Totale €', 'Ambienti']],
    body: cart.map(r => [
      r.descrizione,
      String(r.qty_packs),
      `${r.prezzo_unitario.toFixed(2)} €`,
      `${r.totale.toFixed(2)} €`,
      (r.from_rooms ?? []).join(', '),
    ]),
    headStyles: { fillColor: [41, 37, 36] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });

  // Per ogni ambiente
  for (const room of rooms) {
    const roomName = room.custom_name || room.room_type;
    doc.addPage();
    y = 20;

    doc.setFillColor(245, 245, 244);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 37, 36);
    doc.text(roomName, 15, 10);
    doc.setTextColor(0, 0, 0);
    y = 22;

    // Info tecniche
    const ws = room.wizard_state;
    if (ws) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const info = [
        ws.supporto_floor ? `Pavimento: ${ws.supporto_floor}` : null,
        ws.supporto_wall ? `Parete: ${ws.supporto_wall}` : null,
        ws.texture_line ? `Texture: ${ws.texture_line}` : null,
        ws.protettivo ? `Protettivo: ${ws.protettivo}` : null,
        ws.presenza_doccia ? 'Doccia: sì' : null,
        ws.mercato_tedesco ? 'DIN 18534' : null,
      ].filter(Boolean).join('  |  ');
      doc.text(info, 15, y);
      y += 8;
    }

    if (room.computation_errors.length > 0) {
      doc.setTextColor(180, 80, 0);
      doc.setFontSize(8);
      room.computation_errors.forEach(e => {
        doc.text(`⚠ ${e.text}`, 15, y);
        y += 5;
      });
      doc.setTextColor(0, 0, 0);
    }

    // Materiali ambiente
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Materiali', 15, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['Prodotto', 'Conf.', 'Consumo kg', 'Sezione']],
      body: room.cart_lines.map(l => [
        l.descrizione,
        String(l.qty),
        l.qty_raw?.toFixed(2) ?? '',
        l.section,
      ]),
      headStyles: { fillColor: [87, 83, 78] },
      styles: { fontSize: 7 },
      margin: { left: 15, right: 15 },
    });

    const afterMat = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    // Lavorazioni
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Sequenza lavorazioni', 15, afterMat);

    autoTable(doc, {
      startY: afterMat + 4,
      head: [['Step', 'Descrizione', 'Prodotto', 'Consumo', 'Note']],
      body: room.step_lavorazioni.map(lav => [
        String(lav.numero_step),
        lav.descrizione_step,
        lav.prodotti_coinvolti,
        lav.consumi_step,
        lav.note_tecniche,
      ]),
      headStyles: { fillColor: [87, 83, 78] },
      styles: { fontSize: 7 },
      columnStyles: { 1: { cellWidth: 55 }, 4: { cellWidth: 45 } },
      margin: { left: 15, right: 15 },
    });
  }

  // Totale finale
  const totalEur = cart.reduce((a, r) => a + r.totale, 0);
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Riepilogo economico', 15, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Totale confezioni attive: ${cart.reduce((a, r) => a + r.qty_packs, 0)}`, 15, 32);
  doc.text(`Totale valore: ${totalEur.toFixed(2)} €`, 15, 40);

  doc.save(`nativus_progetto_${dateStamp()}.pdf`);
}

export function exportRoomPdf(room: ProjectRoom): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const roomName = room.custom_name || room.room_type;

  doc.setFillColor(41, 37, 36);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(roomName, 15, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`NATIVUS — ${dateLabel()}`, 15, 28);
  doc.setTextColor(0, 0, 0);

  let y = 50;

  autoTable(doc, {
    startY: y,
    head: [['Prodotto', 'Conf.', 'Consumo kg', 'Totale €']],
    body: room.cart_lines.map(l => [
      l.descrizione,
      String(l.qty),
      l.qty_raw?.toFixed(2) ?? '',
      l.totale?.toFixed(2) ?? '',
    ]),
    headStyles: { fillColor: [41, 37, 36] },
    styles: { fontSize: 8 },
    margin: { left: 15, right: 15 },
  });

  const afterMat = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Sequenza lavorazioni', 15, afterMat);

  autoTable(doc, {
    startY: afterMat + 4,
    head: [['Step', 'Descrizione', 'Prodotto', 'Consumo', 'Note']],
    body: room.step_lavorazioni.map(lav => [
      String(lav.numero_step),
      lav.descrizione_step,
      lav.prodotti_coinvolti,
      lav.consumi_step,
      lav.note_tecniche,
    ]),
    headStyles: { fillColor: [87, 83, 78] },
    styles: { fontSize: 7 },
    columnStyles: { 1: { cellWidth: 55 }, 4: { cellWidth: 45 } },
    margin: { left: 15, right: 15 },
  });

  doc.save(`nativus_${roomName}_${dateStamp()}.pdf`);
}
