import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CatalogItem, ImportRow, ImportResult, ConflictResolution } from '@/types/catalog';

const MAX_IMPORT_ROWS = 10000;

/**
 * Parse an Excel or CSV file into raw row objects.
 */
export async function parseCatalogFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

        if (jsonData.length > MAX_IMPORT_ROWS) {
          reject(new Error(`El archivo excede el límite de ${MAX_IMPORT_ROWS.toLocaleString()} filas.`));
          return;
        }

        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
        resolve({ headers, rows: jsonData });
      } catch (err) {
        reject(new Error('Error al leer el archivo. Verifica que sea un .xlsx o .csv válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Error de lectura del archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Map raw rows using column mapping configuration.
 */
export function mapRows(
  rows: Record<string, any>[],
  mapping: Record<string, string> // { fieldName: columnHeader }
): { valid: ImportRow[]; errors: { row: number; message: string }[] } {
  const valid: ImportRow[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const mapped: Partial<ImportRow> = {};

    if (mapping.name) mapped.name = String(row[mapping.name] || '').trim();
    if (mapping.code) mapped.code = String(row[mapping.code] || '').trim();
    if (mapping.category) mapped.category = String(row[mapping.category] || '').trim();
    if (mapping.unit_of_measure) mapped.unit_of_measure = String(row[mapping.unit_of_measure] || '').trim();
    if (mapping.unit_price) {
      const priceStr = String(row[mapping.unit_price] || '').replace(/[,$]/g, '');
      mapped.unit_price = parseFloat(priceStr);
    }
    if (mapping.description) mapped.description = String(row[mapping.description] || '').trim();

    // Validate required fields
    if (!mapped.name) {
      errors.push({ row: index + 2, message: 'Nombre vacío' });
      return;
    }
    if (!mapped.unit_of_measure) {
      errors.push({ row: index + 2, message: 'Unidad de medida vacía' });
      return;
    }
    if (isNaN(mapped.unit_price!) || mapped.unit_price! < 0) {
      errors.push({ row: index + 2, message: 'Precio unitario inválido' });
      return;
    }

    valid.push(mapped as ImportRow);
  });

  return { valid, errors };
}

/**
 * Export catalog items to an Excel file.
 */
export function exportCatalogToExcel(items: CatalogItem[], categoryMap?: Map<string, string>) {
  const rows = items.map(item => ({
    'Código': item.code || '',
    'Nombre': item.name,
    'Categoría': item.category_name || (item.category_id && categoryMap?.get(item.category_id)) || '',
    'Unidad': item.unit_of_measure,
    'Precio Unitario': item.unit_price,
    'Descripción': item.description || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catálogo');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 12 }, // Código
    { wch: 35 }, // Nombre
    { wch: 18 }, // Categoría
    { wch: 10 }, // Unidad
    { wch: 14 }, // Precio
    { wch: 40 }, // Descripción
  ];

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `catalogo_planquan_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Detect conflicts between import rows and existing catalog items.
 */
export function detectConflicts(
  importRows: ImportRow[],
  existingItems: CatalogItem[]
): { withConflict: { row: ImportRow; existing: CatalogItem }[]; withoutConflict: ImportRow[] } {
  const codeMap = new Map<string, CatalogItem>();
  existingItems.forEach(item => {
    if (item.code) codeMap.set(item.code.toLowerCase(), item);
  });

  const withConflict: { row: ImportRow; existing: CatalogItem }[] = [];
  const withoutConflict: ImportRow[] = [];

  importRows.forEach(row => {
    if (row.code && codeMap.has(row.code.toLowerCase())) {
      withConflict.push({ row, existing: codeMap.get(row.code.toLowerCase())! });
    } else {
      withoutConflict.push(row);
    }
  });

  return { withConflict, withoutConflict };
}
