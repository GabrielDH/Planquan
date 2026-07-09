/**
 * Catalog types for PlanQuan item catalog system.
 */

export interface CatalogCategory {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  user_id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  unit_of_measure: string;
  unit_price: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  // Joined field (optional)
  category_name?: string;
}

export interface MeasurementItemAssignment {
  id: string;
  measurement_id: string;
  catalog_item_id: string;
  conversion_factor: number;
  quantity: number | null;
  estimated_cost: number | null;
  waste_factor: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  catalog_item?: CatalogItem;
}

export interface CatalogItemFormData {
  name: string;
  code?: string;
  category_id?: string;
  unit_of_measure: string;
  unit_price: number;
  description?: string;
}

export interface ImportRow {
  code?: string;
  name: string;
  category?: string;
  unit_of_measure: string;
  unit_price: number;
  description?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export type ConflictResolution = 'overwrite' | 'skip' | 'create_new';

// Default categories for construction catalogs
export const DEFAULT_CATEGORIES = [
  'Materiales',
  'Mano de Obra',
  'Equipos',
  'Subcontratos',
] as const;
