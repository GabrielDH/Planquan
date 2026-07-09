/**
 * Unit conversion utilities for PlanQuan.
 * Display-only conversions — DB values remain unchanged.
 */

// Linear conversion factors to meters (base unit)
const LINEAR_TO_METERS: Record<string, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
  yd: 0.9144,
};

// Area conversion factors to m² (base unit)
const AREA_TO_M2: Record<string, number> = {
  m2: 1,
  cm2: 0.0001,
  ft2: 0.09290304,
  in2: 0.00064516,
  yd2: 0.83612736,
};

export type UnitSystem = 'imperial' | 'metric';

/**
 * Convert a linear measurement from one unit to another.
 */
export function convertLinear(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  const fromFactor = LINEAR_TO_METERS[fromUnit];
  const toFactor = LINEAR_TO_METERS[toUnit];
  if (!fromFactor || !toFactor) return value;
  return (value * fromFactor) / toFactor;
}

/**
 * Convert an area measurement from one unit to another.
 */
export function convertArea(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  const fromFactor = AREA_TO_M2[fromUnit];
  const toFactor = AREA_TO_M2[toUnit];
  if (!fromFactor || !toFactor) return value;
  return (value * fromFactor) / toFactor;
}

/**
 * Get the target linear unit for a given unit system.
 */
export function getLinearUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'ft' : 'm';
}

/**
 * Get the target area unit for a given unit system.
 */
export function getAreaUnitForSystem(system: UnitSystem): string {
  return system === 'imperial' ? 'ft2' : 'm2';
}

/**
 * Determine if a unit is a linear unit.
 */
export function isLinearUnit(unit: string): boolean {
  return unit in LINEAR_TO_METERS;
}

/**
 * Determine if a unit is an area unit.
 */
export function isAreaUnit(unit: string): boolean {
  return unit in AREA_TO_M2;
}

/**
 * Convert a measurement value to the target unit system for display.
 * Returns { value, unit } in the target system.
 */
export function convertToSystem(
  value: number,
  unit: string,
  targetSystem: UnitSystem
): { value: number; unit: string } {
  if (isAreaUnit(unit)) {
    const targetUnit = getAreaUnitForSystem(targetSystem);
    return { value: convertArea(value, unit, targetUnit), unit: targetUnit };
  }
  if (isLinearUnit(unit)) {
    const targetUnit = getLinearUnit(targetSystem);
    return { value: convertLinear(value, unit, targetUnit), unit: targetUnit };
  }
  // For non-convertible units (e.g., 'units' for count), return as-is
  return { value, unit };
}

/**
 * Format a value with unit conversion applied for display.
 * Uses the formatMeasurement function signature compatibility.
 */
export function formatWithUnit(
  value: number,
  unit: string,
  targetSystem?: UnitSystem
): string {
  if (!targetSystem) {
    return formatValueAndUnit(value, unit);
  }
  const converted = convertToSystem(value, unit, targetSystem);
  return formatValueAndUnit(converted.value, converted.unit);
}

/**
 * Format a numeric value with its unit string.
 */
function formatValueAndUnit(value: number, unit: string): string {
  if (unit === 'ft') {
    if (value < 1) return `${(value * 12).toFixed(1)} in`;
    const feet = Math.floor(value);
    const inches = (value - feet) * 12;
    if (inches < 0.1) return `${feet}'-0"`;
    return `${feet}'-${inches.toFixed(1)}"`;
  }
  if (unit === 'm') {
    if (value < 1) return `${(value * 100).toFixed(1)} cm`;
    return `${value.toFixed(2)} m`;
  }
  if (unit === 'ft2') return `${value.toFixed(1)} ft²`;
  if (unit === 'm2') return `${value.toFixed(2)} m²`;
  if (unit === 'in') return `${value.toFixed(1)} in`;
  if (unit === 'cm') return `${value.toFixed(1)} cm`;
  if (unit === 'units') return `${Math.round(value)}`;
  return `${value.toFixed(2)} ${unit}`;
}
