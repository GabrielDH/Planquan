export interface ValidationRule {
  id: string;
  name: string;
  description: string;
}

export interface ValidationFailure {
  ruleId: string;
  page?: number;
  measurementId?: string;
  message: string;
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  failures: ValidationFailure[];
}

export interface QualityGateResult {
  passed: boolean;
  results: ValidationResult[];
  executedAt: string;
}
