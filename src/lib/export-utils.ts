import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { formatMeasurement } from './measurements';

interface ExportMeasurement {
  id: string;
  measurement_type: string;
  value: number | null;
  unit: string | null;
  label: string;
  comment: string;
  page_number: number;
  file_name?: string;
  created_at: string;
}

interface ExportProject {
  name: string;
  location: string;
  project_type: string;
  unit_system: string;
}

const DISCLAIMER = 'Estimación preliminar. No sustituye planos constructivos ni presupuesto ejecutivo. Verificar en obra y con profesionales responsables.';

export function exportToCSV(measurements: ExportMeasurement[], project: ExportProject) {
  const BOM = '\uFEFF';
  const headers = ['ID', 'Tipo', 'Valor', 'Unidad', 'Etiqueta', 'Comentario', 'Archivo', 'Página', 'Fecha'];
  const rows = measurements.map(m => [
    m.id.slice(0, 8),
    m.measurement_type,
    m.value?.toFixed(2) ?? '',
    m.unit ?? '',
    m.label,
    m.comment,
    m.file_name ?? '',
    m.page_number.toString(),
    new Date(m.created_at).toLocaleDateString(),
  ]);

  const disclaimerRow = [`"${DISCLAIMER}"`];
  const projectRow = [`"Proyecto: ${project.name} | Ubicación: ${project.location} | Tipo: ${project.project_type} | Unidades: ${project.unit_system}"`];
  const emptyRow = [''];

  const csvContent = [
    disclaimerRow.join(','),
    projectRow.join(','),
    emptyRow.join(','),
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(r => r.map(v => `"${v}"`).join(',')),
  ].join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}_mediciones.csv`);
}

export function exportToPDF(measurements: ExportMeasurement[], project: ExportProject) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PlanQuant - Reporte de Mediciones', margin, y);
  y += 10;

  // Project info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proyecto: ${project.name}`, margin, y); y += 5;
  doc.text(`Ubicación: ${project.location}`, margin, y); y += 5;
  doc.text(`Tipo: ${project.project_type} | Unidades: ${project.unit_system}`, margin, y); y += 5;
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, y); y += 8;

  // Disclaimer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const disclaimerLines = doc.splitTextToSize(DISCLAIMER, pageWidth - margin * 2);
  doc.text(disclaimerLines, margin, y); y += disclaimerLines.length * 4 + 5;

  // Separator
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y); y += 8;

  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const cols = [margin, margin + 20, margin + 50, margin + 70, margin + 95, margin + 135];
  doc.text('Tipo', cols[0], y);
  doc.text('Valor', cols[1], y);
  doc.text('Unidad', cols[2], y);
  doc.text('Etiqueta', cols[3], y);
  doc.text('Archivo / Pág.', cols[4], y);
  doc.text('Fecha', cols[5], y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y); y += 5;

  // Rows
  doc.setFont('helvetica', 'normal');
  for (const m of measurements) {
    if (y > 250) {
      doc.addPage();
      y = 25;
    }
    doc.text(m.measurement_type, cols[0], y);
    doc.text(m.value != null ? formatMeasurement(m.value, m.unit ?? '') : '-', cols[1], y);
    doc.text(m.unit ?? '', cols[2], y);
    doc.text((m.label || '-').slice(0, 20), cols[3], y);
    doc.text(`${(m.file_name ?? '').slice(0, 15)} / p${m.page_number}`, cols[4], y);
    doc.text(new Date(m.created_at).toLocaleDateString(), cols[5], y);
    y += 6;
  }

  // Total count
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de mediciones: ${measurements.length}`, margin, y);

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(DISCLAIMER, margin, 270);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 25, 270);
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}_mediciones.pdf`);
}

interface VisualExportMeasurement extends ExportMeasurement {
  coordinates: { x: number; y: number }[];
  color: string;
  item_name?: string;
  quantity?: number;
  unit_cost?: number;
  total_cost?: number;
}

interface VisualExportOptions {
  pdfDoc: any; // PDFDocumentProxy
  measurements: VisualExportMeasurement[];
  project: ExportProject;
}

/**
 * Generate bounding box for measurement coordinates with margin.
 */
function getBoundingBox(coords: { x: number; y: number }[], margin = 0.2) {
  if (coords.length === 0) return { x: 0, y: 0, width: 100, height: 100 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const w = maxX - minX || 50;
  const h = maxY - minY || 50;
  const mx = w * margin;
  const my = h * margin;
  return {
    x: Math.max(0, minX - mx),
    y: Math.max(0, minY - my),
    width: w + mx * 2,
    height: h + my * 2,
  };
}

/**
 * Render a region of a PDF page to a JPEG data URL.
 */
async function renderPageRegion(
  pdfDoc: any,
  pageNumber: number,
  bbox: { x: number; y: number; width: number; height: number }
): Promise<string | null> {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 }); // 150 DPI equivalent

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Crop to bounding box
    const scale = viewport.width / (page.getViewport({ scale: 1 }).width);
    const sx = bbox.x * scale;
    const sy = bbox.y * scale;
    const sw = bbox.width * scale;
    const sh = bbox.height * scale;

    const cropCanvas = document.createElement('canvas');
    const maxW = 300; // max thumbnail width in pixels
    const aspectRatio = sh / sw;
    cropCanvas.width = Math.min(sw, maxW);
    cropCanvas.height = cropCanvas.width * aspectRatio;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);

    return cropCanvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  }
}

/**
 * Export PDF with visual evidence (thumbnails of measurement areas).
 */
export async function exportToVisualPDF(options: VisualExportOptions) {
  const { pdfDoc, measurements, project } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Title page
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PlanQuant - Reporte Visual', margin, y); y += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Proyecto: ${project.name}`, margin, y); y += 5;
  doc.text(`Ubicación: ${project.location}`, margin, y); y += 5;
  doc.text(`Tipo: ${project.project_type} | Unidades: ${project.unit_system}`, margin, y); y += 5;
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, y); y += 5;
  doc.text(`Total mediciones: ${measurements.length}`, margin, y); y += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(DISCLAIMER, margin, y); y += 10;
  doc.line(margin, y, pageWidth - margin, y); y += 10;

  // Group measurements by page
  const byPage = new Map<number, VisualExportMeasurement[]>();
  measurements.forEach(m => {
    const arr = byPage.get(m.page_number) || [];
    arr.push(m);
    byPage.set(m.page_number, arr);
  });

  // Render each page group
  for (const [pageNum, pageMeasurements] of byPage) {
    if (y > 240) { doc.addPage(); y = 20; }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pageNum}`, margin, y); y += 6;

    for (const m of pageMeasurements) {
      if (y > 220) { doc.addPage(); y = 20; }

      const bbox = getBoundingBox(m.coordinates);

      // Try to render thumbnail
      const thumbnail = pdfDoc ? await renderPageRegion(pdfDoc, m.page_number, bbox) : null;

      if (thumbnail) {
        try {
          doc.addImage(thumbnail, 'JPEG', margin, y, 40, 30);
        } catch {
          // Fallback: draw placeholder
          doc.setDrawColor(200);
          doc.rect(margin, y, 40, 30);
          doc.setFontSize(7);
          doc.text('Imagen no disponible', margin + 5, y + 16);
        }
      } else {
        doc.setDrawColor(200);
        doc.rect(margin, y, 40, 30);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.text('Imagen no disponible', margin + 5, y + 16);
      }

      // Measurement data next to thumbnail
      const textX = margin + 45;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(m.label || m.measurement_type, textX, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Valor: ${m.value != null ? formatMeasurement(m.value, m.unit ?? '') : '—'}`, textX, y + 11);
      if (m.item_name) {
        doc.text(`Ítem: ${m.item_name}`, textX, y + 17);
        if (m.quantity != null) doc.text(`Cantidad: ${m.quantity.toFixed(2)}`, textX, y + 23);
        if (m.total_cost != null) doc.text(`Costo: $${m.total_cost.toFixed(2)}`, textX, y + 29);
      }

      y += 35;
    }
  }

  // Summary table
  doc.addPage();
  y = 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen', margin, y); y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const sumCols = [margin, margin + 30, margin + 55, margin + 75, margin + 100, margin + 125, margin + 150];
  doc.text('Medición', sumCols[0], y);
  doc.text('Valor', sumCols[1], y);
  doc.text('Unidad', sumCols[2], y);
  doc.text('Ítem', sumCols[3], y);
  doc.text('Cantidad', sumCols[4], y);
  doc.text('P. Unit.', sumCols[5], y);
  doc.text('Total', sumCols[6], y);
  y += 2;
  doc.line(margin, y, pageWidth - margin, y); y += 4;

  doc.setFont('helvetica', 'normal');
  let grandTotal = 0;
  for (const m of measurements) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.text((m.label || m.measurement_type).slice(0, 18), sumCols[0], y);
    doc.text(m.value?.toFixed(2) ?? '—', sumCols[1], y);
    doc.text(m.unit ?? '', sumCols[2], y);
    doc.text((m.item_name ?? '—').slice(0, 15), sumCols[3], y);
    doc.text(m.quantity?.toFixed(2) ?? '—', sumCols[4], y);
    doc.text(m.unit_cost != null ? `$${m.unit_cost.toFixed(2)}` : '—', sumCols[5], y);
    doc.text(m.total_cost != null ? `$${m.total_cost.toFixed(2)}` : '—', sumCols[6], y);
    if (m.total_cost) grandTotal += m.total_cost;
    y += 5;
  }

  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total estimado: $${grandTotal.toFixed(2)}`, margin, y);

  // Footer
  const totalPdfPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPdfPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(DISCLAIMER, margin, 270);
    doc.text(`Página ${i} de ${totalPdfPages}`, pageWidth - margin - 25, 270);
  }

  doc.save(`${project.name.replace(/\s+/g, '_')}_reporte_visual.pdf`);
}
