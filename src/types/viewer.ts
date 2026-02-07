export interface Point {
  x: number;
  y: number;
}

export type MeasurementTool = 'none' | 'linear' | 'polyline' | 'area' | 'count' | 'annotation' | 'calibrate';

export interface MeasurementData {
  id: string;
  project_id: string;
  file_id: string;
  page_number: number;
  user_id: string;
  measurement_type: string;
  coordinates: Point[];
  value: number | null;
  unit: string | null;
  original_value: number | null;
  original_unit: string | null;
  label: string;
  comment: string;
  color: string;
  created_at: string;
}

export interface ScaleData {
  id: string;
  file_id: string;
  page_number: number;
  scale_type: string;
  pixels_per_unit: number;
  unit: string;
  real_distance?: number;
  real_distance_unit?: string;
  standard_scale?: string;
}

export const MEASUREMENT_COLORS: Record<string, string> = {
  linear: '#3B82F6',
  polyline: '#10B981',
  area: '#F59E0B',
  count: '#EF4444',
  annotation: '#8B5CF6',
  calibrate: '#EC4899',
};

export const STANDARD_SCALES_IMPERIAL = [
  { label: '1/8" = 1\'-0"', value: '1/8"=1\'-0"', pixelsPerUnit: 9, unit: 'ft' },
  { label: '3/16" = 1\'-0"', value: '3/16"=1\'-0"', pixelsPerUnit: 13.5, unit: 'ft' },
  { label: '1/4" = 1\'-0"', value: '1/4"=1\'-0"', pixelsPerUnit: 18, unit: 'ft' },
  { label: '3/8" = 1\'-0"', value: '3/8"=1\'-0"', pixelsPerUnit: 27, unit: 'ft' },
  { label: '1/2" = 1\'-0"', value: '1/2"=1\'-0"', pixelsPerUnit: 36, unit: 'ft' },
  { label: '3/4" = 1\'-0"', value: '3/4"=1\'-0"', pixelsPerUnit: 54, unit: 'ft' },
  { label: '1" = 1\'-0"', value: '1"=1\'-0"', pixelsPerUnit: 72, unit: 'ft' },
  { label: '1" = 10\'', value: '1"=10\'', pixelsPerUnit: 7.2, unit: 'ft' },
  { label: '1" = 20\'', value: '1"=20\'', pixelsPerUnit: 3.6, unit: 'ft' },
  { label: '1" = 40\'', value: '1"=40\'', pixelsPerUnit: 1.8, unit: 'ft' },
  { label: '1" = 50\'', value: '1"=50\'', pixelsPerUnit: 1.44, unit: 'ft' },
  { label: '1" = 100\'', value: '1"=100\'', pixelsPerUnit: 0.72, unit: 'ft' },
];

export const STANDARD_SCALES_METRIC = [
  { label: '1:20', value: '1:20', pixelsPerUnit: 141.73, unit: 'm' },
  { label: '1:25', value: '1:25', pixelsPerUnit: 113.39, unit: 'm' },
  { label: '1:50', value: '1:50', pixelsPerUnit: 56.69, unit: 'm' },
  { label: '1:75', value: '1:75', pixelsPerUnit: 37.79, unit: 'm' },
  { label: '1:100', value: '1:100', pixelsPerUnit: 28.35, unit: 'm' },
  { label: '1:200', value: '1:200', pixelsPerUnit: 14.17, unit: 'm' },
  { label: '1:500', value: '1:500', pixelsPerUnit: 5.67, unit: 'm' },
];
