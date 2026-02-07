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
