/**
 * Quick computation actions for PlanQuan measurements.
 */

export interface QuickActionParams {
  height?: number;
  pieceWidth?: number;
  pieceHeight?: number;
  wasteFactor?: number; // percentage 0-100
}

/**
 * Convert linear measurement (length) to area by multiplying by height.
 * length × height × (1 + waste%) = area
 */
export function lengthToArea(length: number, height: number, wasteFactor = 0): number {
  if (height <= 0) throw new Error('La altura debe ser mayor a cero');
  if (length <= 0) throw new Error('La longitud debe ser mayor a cero');
  const area = length * height;
  return area * (1 + wasteFactor / 100);
}

/**
 * Convert area to quantity of pieces.
 * area ÷ (pieceWidth × pieceHeight) × (1 + waste%) = quantity
 */
export function areaToQuantity(
  area: number,
  pieceWidth: number,
  pieceHeight: number,
  wasteFactor = 0
): number {
  if (pieceWidth <= 0 || pieceHeight <= 0) throw new Error('Las dimensiones de la pieza deben ser mayores a cero');
  if (area <= 0) throw new Error('El área debe ser mayor a cero');
  const pieceArea = pieceWidth * pieceHeight;
  const rawQuantity = area / pieceArea;
  return Math.ceil(rawQuantity * (1 + wasteFactor / 100));
}

/**
 * Get the result unit for a quick action.
 */
export function getResultUnit(actionType: string, sourceUnit: string): string {
  if (actionType === 'length_to_area') {
    if (sourceUnit === 'ft') return 'ft2';
    if (sourceUnit === 'm') return 'm2';
    return sourceUnit + '2';
  }
  if (actionType === 'area_to_quantity') {
    return 'units';
  }
  return sourceUnit;
}

/**
 * Get the derived measurement type label.
 */
export function getDerivedTypeLabel(actionType: string): string {
  if (actionType === 'length_to_area') return 'Área derivada';
  if (actionType === 'area_to_quantity') return 'Cantidad derivada';
  return 'Derivada';
}
