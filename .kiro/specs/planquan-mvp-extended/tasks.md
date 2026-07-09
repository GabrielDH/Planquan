# Implementation Plan: PlanQuan MVP Extended

## Overview

This plan covers the implementation of all 10 requirements for the PlanQuan Extended MVP. Tasks are ordered by dependency: foundational schema and utilities first, then viewer enhancements, then catalog/business features, and finally integration and reports.

## Tasks

- [x] 1. Create database migration `supabase/migrations/002_mvp_extended.sql` with new tables (catalog_categories, catalog_items, measurement_item_assignments, derived_measurements, quality_gate_results), ALTER projects table (add approved_at, approved_by, force_approved), RLS policies for all new tables, and update_updated_at triggers. Update `src/integrations/supabase/types.ts` with new table types.
  - **Requirements:** 1, 2, 4, 5, 6

- [x] 2. Create `src/lib/unit-conversion.ts` with functions: `convertLinear(value, fromUnit, toUnit)` supporting ft/in/m/cm, `convertArea(value, fromUnit, toUnit)` supporting ft2/m2, and `formatWithUnit(value, unit, targetSystem)` for display. Enhance `src/lib/measurements.ts` `formatMeasurement` to accept optional target unit system. Ensure round-trip accuracy within 0.001%.
  - **Requirements:** 9

- [x] 3. Implement cursor-centered zoom in `src/components/viewer/ViewerCanvas.tsx`: add `onWheel` handler on container with factor 1.15x, clamp between 0.1–30, adjust scroll position to keep cursor point stable, add `requestAnimationFrame` throttling, sync zoom state with PlanViewer parent. Verify SVG overlay alignment at all zoom levels.
  - **Requirements:** 10

- [x] 4. Create `src/hooks/useViewerTransform.ts` hook managing zoom/rotation/offset state. Add rotation controls (CW +90°, CCW -90°, Reset) to `MeasurementToolbar`. Apply CSS `transform: rotate()` to canvas+SVG container. Implement `screenToPage`/`pageToScreen` coordinate transforms. Update click/mousemove handlers to inverse-transform coordinates. Show rotation angle in toolbar. Add free rotation slider (0-359°). Preserve rotation on page change. Cancel active drawing on rotation change.
  - **Requirements:** 8

- [x] 5. Create `src/components/viewer/PageThumbnails.tsx`: render each PDF page to offscreen canvas at 150px width, cache as data URLs in Map, show loading skeletons, implement click-to-navigate, highlight active page, show calibration badge, use intersection observer for lazy loading (>20 pages), limit concurrent renders to 3. Integrate as left sidebar in PlanViewer.
  - **Requirements:** 7

- [x] 6. Add unit selector to PlanViewer: create `displayUnitSystem` state ('imperial'|'metric'), add toggle in MeasurementToolbar, pass to ViewerCanvas, update MeasurementShape and ActiveDrawing to format via `formatWithUnit`, update sidebar measurement list, save preference to `profiles.preferred_units` via Supabase, load on mount. Keep DB values unchanged.
  - **Requirements:** 9

- [x] 7. Create `src/types/catalog.ts` with interfaces (CatalogCategory, CatalogItem, MeasurementItemAssignment). Create `src/hooks/useCatalog.ts` with TanStack Query hooks: useCategories, useCatalogItems, useCreateItem, useUpdateItem, useDeleteItem. Implement category and item CRUD operations. Add real-time search/filter. Add deletion check for active assignments.
  - **Requirements:** 1

- [x] 8. Create `src/pages/CatalogManager.tsx` page and add `/catalog` route to App.tsx. Create `src/components/catalog/CatalogCategoryTree.tsx` (hierarchical tree with inline CRUD), `CatalogItemList.tsx` (searchable table), `CatalogItemForm.tsx` (dialog with Zod validation). Add nav link from Dashboard. Implement category filtering and real-time search.
  - **Requirements:** 1

- [x] 9. Install `xlsx` package. Create `src/lib/catalog-utils.ts` with `parseCatalogFile(file)` and `exportCatalogToExcel(items)`. Create `src/components/catalog/ImportExportDialog.tsx` with 4-step wizard: file select/preview, column mapping, conflict resolution (overwrite/skip/new), results summary. Implement Zod row validation. Enforce 10k row limit. Add import/export buttons to CatalogManager.
  - **Requirements:** 5

- [x] 10. Create `src/components/viewer/ItemAssignmentDialog.tsx`: searchable catalog picker, conversion factor input (default 1.0), waste factor input (default 0%), quantity/cost preview calculation. Add "Asignar ítem" button on measurements in sidebar. Save to `measurement_item_assignments`. Show unit incompatibility warning. Create `useItemAssignments` hook. Show assigned items indicator on measurements. Add project-level cost summary in ProjectDetail.
  - **Requirements:** 2

- [x] 11. Create `src/lib/quick-actions.ts` with `lengthToArea(length, height, waste)` and `areaToQuantity(area, pieceW, pieceH, waste)`. Create `src/components/viewer/QuickActionsPanel.tsx`: show actions by type, input fields for parameters, zero-value validation. On execute: create derived measurement + linking record. Show derived measurements with distinct indicator. Implement auto-recalculation when source changes.
  - **Requirements:** 6

- [x] 12. Create `src/types/quality.ts`, `src/lib/quality-gate.ts` with rules engine (all_pages_calibrated, all_measurements_labeled, has_measurements, positive_values). Create `src/hooks/useQualityGate.ts`. Create `src/components/quality/QualityGateDialog.tsx`: display pass/fail per rule with details, block approve when failing, enable when passing, update project status + approved_at/by. Admin force approval with comment. Save results to quality_gate_results. Add "Verificar calidad" button to ProjectDetail.
  - **Requirements:** 4

- [x] 13. Enhance `src/lib/export-utils.ts` with `exportToVisualPDF`: calculate measurement bounding box + 20% margin, render PDF page region to offscreen canvas, draw measurement overlay, convert to JPEG (0.8 quality), embed in jsPDF. Group by page when >50 measurements. Fallback placeholder on render failure. Add summary table (measurement, value, unit, item, quantity, cost). Progressive quality reduction if >50MB. Add "PDF con evidencia visual" option to ExportDialog.
  - **Requirements:** 3

- [x] 14. Integration: update App.tsx routing, verify PlanViewer layout with thumbnails sidebar + rotation + zoom + units. Update ExportDialog for visual reports. Run `npm run build` to verify zero TypeScript errors. Test navigation flow end-to-end.
  - **Requirements:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": "wave1",
      "tasks": [1, 2, 3, 4, 5],
      "description": "Foundation: DB migration, unit conversion util, and independent viewer enhancements (zoom, rotation, thumbnails)"
    },
    {
      "id": "wave2",
      "tasks": [6, 7],
      "description": "Unit selector (depends on 2) and catalog data layer (depends on 1)",
      "dependsOn": ["wave1"]
    },
    {
      "id": "wave3",
      "tasks": [8, 9, 10, 11, 12],
      "description": "Feature UIs: catalog page, Excel import, item assignment, quick actions, quality gate",
      "dependsOn": ["wave2"]
    },
    {
      "id": "wave4",
      "tasks": [13, 14],
      "description": "Visual reports and final integration",
      "dependsOn": ["wave3"]
    }
  ]
}
```

## Notes

- Tasks 3, 4, and 5 are independent viewer enhancements that can be implemented in parallel.
- Task 1 (migration) is the critical path — most business feature tasks depend on it.
- Task 2 is only needed before Task 6 but has no other dependencies.
- The `xlsx` package in Task 9 is the only new dependency required.
