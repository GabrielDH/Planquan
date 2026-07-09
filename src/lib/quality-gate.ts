import { ValidationResult, ValidationFailure } from '@/types/quality';

interface QualityContext {
  files: { id: string; total_pages: number | null }[];
  scales: { file_id: string; page_number: number }[];
  measurements: {
    id: string;
    file_id: string;
    page_number: number;
    measurement_type: string;
    value: number | null;
    label: string | null;
  }[];
}

/**
 * Run all quality gate validation rules.
 */
export function runQualityGate(context: QualityContext): ValidationResult[] {
  return [
    validateAllPagesCalibrated(context),
    validateAllMeasurementsLabeled(context),
    validateHasMeasurements(context),
    validatePositiveValues(context),
  ];
}

/**
 * Rule: All pages that have measurements must have scale calibration.
 */
function validateAllPagesCalibrated(ctx: QualityContext): ValidationResult {
  const failures: ValidationFailure[] = [];
  const scaleSet = new Set(ctx.scales.map(s => `${s.file_id}:${s.page_number}`));

  // Find unique file+page combos that have measurements
  const measuredPages = new Set(ctx.measurements.map(m => `${m.file_id}:${m.page_number}`));

  measuredPages.forEach(key => {
    if (!scaleSet.has(key)) {
      const [fileId, pageStr] = key.split(':');
      failures.push({
        ruleId: 'all_pages_calibrated',
        page: parseInt(pageStr),
        message: `Página ${pageStr} sin calibración de escala`,
      });
    }
  });

  return {
    ruleId: 'all_pages_calibrated',
    ruleName: 'Todas las páginas calibradas',
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Rule: All measurements must have a non-empty label.
 */
function validateAllMeasurementsLabeled(ctx: QualityContext): ValidationResult {
  const failures: ValidationFailure[] = [];

  ctx.measurements.forEach(m => {
    if (!m.label || m.label.trim() === '') {
      failures.push({
        ruleId: 'all_measurements_labeled',
        page: m.page_number,
        measurementId: m.id,
        message: `Medición ${m.id.slice(0, 8)} (pág. ${m.page_number}) sin etiqueta`,
      });
    }
  });

  return {
    ruleId: 'all_measurements_labeled',
    ruleName: 'Todas las mediciones etiquetadas',
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Rule: Project must have at least one measurement.
 */
function validateHasMeasurements(ctx: QualityContext): ValidationResult {
  const passed = ctx.measurements.length > 0;
  return {
    ruleId: 'has_measurements',
    ruleName: 'Existe al menos una medición',
    passed,
    failures: passed ? [] : [{
      ruleId: 'has_measurements',
      message: 'El proyecto no tiene mediciones',
    }],
  };
}

/**
 * Rule: All linear and area measurements must have value > 0.
 */
function validatePositiveValues(ctx: QualityContext): ValidationResult {
  const failures: ValidationFailure[] = [];
  const relevantTypes = ['linear', 'polyline', 'area'];

  ctx.measurements
    .filter(m => relevantTypes.includes(m.measurement_type))
    .forEach(m => {
      if (m.value == null || m.value <= 0) {
        failures.push({
          ruleId: 'positive_values',
          page: m.page_number,
          measurementId: m.id,
          message: `Medición ${m.id.slice(0, 8)} (pág. ${m.page_number}) con valor ≤ 0`,
        });
      }
    });

  return {
    ruleId: 'positive_values',
    ruleName: 'Valores positivos en mediciones',
    passed: failures.length === 0,
    failures,
  };
}
