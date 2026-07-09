# Design Document

## Overview

This document details the technical design for the PlanQuan Extended MVP features. It covers database schema extensions, new components, modifications to existing components, and utility modules needed to implement the 10 requirements defined in the requirements document.

The design builds upon the existing architecture: React 18 + Vite + TypeScript + shadcn/ui + Tailwind CSS + Supabase (auth, DB, storage) + pdfjs-dist + jsPDF + file-saver.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PlanQuan Frontend                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages                                                           │
│  ├── PlanViewer (enhanced: zoom, rotation, thumbnails, units)    │
│  ├── CatalogManager (new)                                        │
│  └── ProjectDetail (enhanced: quality gate)                      │
├─────────────────────────────────────────────────────────────────┤
│  Components                                                      │
│  ├── viewer/                                                     │
│  │   ├── ViewerCanvas (enhanced: wheel zoom, rotation)           │
│  │   ├── MeasurementToolbar (enhanced: units, rotation)          │
│  │   ├── PageThumbnails (new)                                    │
│  │   ├── QuickActionsPanel (new)                                 │
│  │   └── ItemAssignmentDialog (new)                              │
│  ├── catalog/                                                    │
│  │   ├── CatalogItemForm (new)                                   │
│  │   ├── CatalogList (new)                                       │
│  │   └── ImportExportDialog (new)                                │
│  ├── export/                                                     │
│  │   └── ExportDialog (enhanced: visual reports)                 │
│  └── quality/                                                    │
│      └── QualityGateDialog (new)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Lib / Utils                                                     │
│  ├── measurements.ts (enhanced: unit conversion)                 │
│  ├── export-utils.ts (enhanced: image capture)                   │
│  ├── catalog-utils.ts (new: Excel import/export)                 │
│  ├── quality-gate.ts (new: validation rules engine)              │
│  └── quick-actions.ts (new: computation actions)                 │
├─────────────────────────────────────────────────────────────────┤
│  Hooks                                                           │
│  ├── useCatalog.ts (new)                                         │
│  ├── useQualityGate.ts (new)                                     │
│  └── useViewerTransform.ts (new: zoom + rotation state)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase Backend                              │
├─────────────────────────────────────────────────────────────────┤
│  New Tables                                                      │
│  ├── catalog_items                                               │
│  ├── catalog_categories                                          │
│  ├── measurement_item_assignments                                │
│  ├── derived_measurements                                        │
│  └── quality_gate_results                                        │
├─────────────────────────────────────────────────────────────────┤
│  Modified Tables                                                 │
│  ├── projects (+ approved_at, approved_by, force_approved)       │
│  └── profiles (already has preferred_units — reuse)              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### New Tables

#### catalog_categories
```sql
CREATE TABLE public.catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
RLS: Users can only access their own categories.

#### catalog_items
```sql
CREATE TABLE public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  unit_of_measure TEXT NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);
```
RLS: Users can only access their own items.

#### measurement_item_assignments
```sql
CREATE TABLE public.measurement_item_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  conversion_factor NUMERIC NOT NULL DEFAULT 1.0,
  quantity NUMERIC,
  estimated_cost NUMERIC,
  waste_factor NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
RLS: Through measurement → project → user_id chain.

#### derived_measurements
```sql
CREATE TABLE public.derived_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_measurement_id UUID NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  derived_measurement_id UUID NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'length_to_area' | 'area_to_quantity'
  parameters JSONB NOT NULL DEFAULT '{}', -- { height, piece_width, piece_height, waste_factor }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
RLS: Through measurement → project → user_id chain.

#### quality_gate_results
```sql
CREATE TABLE public.quality_gate_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  executed_by UUID NOT NULL,
  passed BOOLEAN NOT NULL,
  results JSONB NOT NULL DEFAULT '[]',
  force_approved BOOLEAN DEFAULT false,
  force_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
RLS: Through project → user_id chain.

### Modified Tables

#### projects (add columns)
```sql
ALTER TABLE public.projects
  ADD COLUMN approved_at TIMESTAMPTZ,
  ADD COLUMN approved_by UUID,
  ADD COLUMN force_approved BOOLEAN DEFAULT false;
```

## Components and Interfaces

### 1. Catalog Management (Requirements 1, 5)

#### New Page: CatalogManager
- **Route**: `/catalog`
- **Layout**: Full-page with sidebar for categories tree + main area for items list
- **Components**:
  - `CatalogCategoryTree` — Hierarchical tree with CRUD inline editing
  - `CatalogItemList` — Searchable/filterable table with inline editing
  - `CatalogItemForm` — Dialog form for create/edit item
  - `ImportExportDialog` — Multi-step wizard for Excel import

#### Import/Export Flow (Requirement 5)
```
[File Select] → [Parse & Preview] → [Column Mapping] → [Conflict Resolution] → [Execute & Report]
```

- **Library**: `xlsx` (SheetJS) for Excel parsing and generation
- **Column Mapping UI**: Drag-drop or select mapping between file columns and item fields
- **Conflict Resolution**: Dialog showing duplicate codes with options (overwrite/skip/create new)
- **Validation**: Zod schema per row, collect errors without stopping

### 2. Item Assignment to Measurements (Requirement 2)

#### New Component: ItemAssignmentDialog
- **Trigger**: Context menu or button on measurement in sidebar list
- **Content**: Searchable catalog picker + conversion factor input + preview of calculated quantity/cost
- **Auto-recalculation**: TanStack Query mutation invalidates assignment data when measurement value changes

#### Data Flow
```
Measurement.value × Assignment.conversion_factor × (1 + waste_factor) = quantity
quantity × CatalogItem.unit_price = estimated_cost
```

### 3. Visual Reports (Requirement 3)

#### Enhanced ExportDialog
- New option: "PDF con evidencia visual"
- **Thumbnail Generation Process**:
  1. For each measurement, calculate bounding box of coordinates
  2. Add 20% margin around bounding box
  3. Render the PDF page region to an offscreen canvas at 150 DPI
  4. Draw measurement overlay on the canvas
  5. Convert to JPEG (quality 0.8) for size optimization
  6. Embed in jsPDF document

#### Export Structure
```
Page 1: Title + Project Info + Disclaimer
Page 2-N: Measurement table with thumbnails (grouped by page)
Last Page: Summary table (measurement, value, unit, item, quantity, cost)
```

### 4. Quality Gate (Requirement 4)

#### New Component: QualityGateDialog
- **Location**: ProjectDetail page, button next to status badge
- **Validation Rules Engine** (`lib/quality-gate.ts`):

```typescript
interface ValidationRule {
  id: string;
  name: string;
  description: string;
  validate: (context: QualityContext) => ValidationResult;
}

interface ValidationResult {
  passed: boolean;
  failures: { page: number; measurementId?: string; message: string }[];
}

interface QualityContext {
  project: Project;
  files: ProjectFile[];
  scales: PageScale[];
  measurements: Measurement[];
}
```

- **Predefined Rules**:
  1. `all_pages_calibrated` — Every page with measurements has a scale
  2. `all_measurements_labeled` — All measurements have non-empty label
  3. `has_measurements` — Project has at least one measurement
  4. `positive_values` — All linear/area measurements have value > 0

- **Admin Force Approval**: Visible only for role === 'admin', requires comment

### 5. Quick Computation Actions (Requirement 6)

#### New Component: QuickActionsPanel
- **Trigger**: Button on measurement in sidebar or context menu
- **Actions Available** (based on measurement type):
  - Linear → "Longitud × Altura = Área"
  - Area → "Área ÷ Pieza = Cantidad"
- **Each action creates**:
  1. A new `measurement` record (type: 'derived_area' or 'derived_quantity')
  2. A `derived_measurements` record linking source → derived

#### Recalculation Hook
```typescript
// When source measurement is updated, find all derived_measurements
// and recalculate their values based on stored parameters
```

### 6. PDF Thumbnails in Sidebar (Requirement 7)

#### New Component: PageThumbnails
- **Location**: Left sidebar panel in PlanViewer (replaces or augments page controls)
- **Implementation**:
  - Use `pdfDoc.getPage(n)` to render each page at low resolution (150px width)
  - Render to offscreen canvas, convert to data URL
  - Virtualize with `react-window` or manual intersection observer for >20 pages
  - Show calibration badge overlay (green checkmark if scale exists for page)
  - Highlight active page with ring/border

#### Performance Strategy
```
- Render visible thumbnails first (viewport intersection)
- Queue off-screen thumbnails with requestIdleCallback
- Cache rendered data URLs in a Map<pageNumber, dataUrl>
- Limit concurrent renders to 3
```

### 7. View Rotation (Requirement 8)

#### State: `useViewerTransform` hook
```typescript
interface ViewerTransform {
  zoom: number;
  rotation: number; // degrees: 0, 90, 180, 270 or free 0-359
  offsetX: number;
  offsetY: number;
}
```

#### Implementation
- Apply CSS `transform: rotate(${rotation}deg)` on the canvas + SVG container
- For measurement drawing, inverse-transform mouse coordinates before recording points
- Coordinate transformation functions:
```typescript
function screenToPage(screenPt: Point, transform: ViewerTransform, canvasSize: Size): Point
function pageToScreen(pagePt: Point, transform: ViewerTransform, canvasSize: Size): Point
```

#### UI Controls
- Toolbar buttons: Rotate CW (+90°), Rotate CCW (-90°), Reset (0°)
- Status bar: Current angle badge
- Free rotation: Slider (0-359°) in expanded panel

### 8. Unit Selector in Viewport (Requirement 9)

#### Implementation
- Add `displayUnit` state to PlanViewer: 'imperial' | 'metric'
- `formatMeasurement` enhanced to accept target unit system and convert:
  - ft → m (× 0.3048), m → ft (× 3.28084)
  - ft² → m² (× 0.092903), m² → ft² (× 10.7639)
- Display conversion is **visual only** — DB values unchanged
- Toggle button in MeasurementToolbar header area
- Save preference to `profiles.preferred_units` on change

### 9. Cursor-Centered Zoom (Requirement 10)

#### Implementation
Replace current scroll-based zoom with wheel event handler:

```typescript
function handleWheel(e: WheelEvent) {
  e.preventDefault();
  const zoomFactor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
  const newZoom = clamp(zoom * zoomFactor, 0.1, 30);

  // Get cursor position relative to content
  const rect = container.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  // Adjust scroll position to keep point under cursor stable
  const scrollLeft = (container.scrollLeft + cursorX) * (newZoom / zoom) - cursorX;
  const scrollTop = (container.scrollTop + cursorY) * (newZoom / zoom) - cursorY;

  setZoom(newZoom);
  container.scrollLeft = scrollLeft;
  container.scrollTop = scrollTop;
}
```

- Apply `requestAnimationFrame` throttling for smooth rendering
- Maintain SVG viewBox alignment with new zoom level

## New Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `xlsx` | Excel import/export for catalogs | ^0.18.5 |
| `html2canvas` | Capture measurement regions for reports | (already in bundle) |
| `react-window` | Virtualized list for PDF thumbnails | ^1.8.10 |

## File Structure (New Files)

```
src/
├── components/
│   ├── catalog/
│   │   ├── CatalogCategoryTree.tsx
│   │   ├── CatalogItemForm.tsx
│   │   ├── CatalogItemList.tsx
│   │   └── ImportExportDialog.tsx
│   ├── viewer/
│   │   ├── PageThumbnails.tsx
│   │   ├── QuickActionsPanel.tsx
│   │   └── ItemAssignmentDialog.tsx
│   └── quality/
│       └── QualityGateDialog.tsx
├── hooks/
│   ├── useCatalog.ts
│   ├── useQualityGate.ts
│   └── useViewerTransform.ts
├── lib/
│   ├── catalog-utils.ts
│   ├── quality-gate.ts
│   ├── quick-actions.ts
│   └── unit-conversion.ts
├── pages/
│   └── CatalogManager.tsx
└── types/
    ├── catalog.ts
    └── quality.ts
```

## Migration File

A single new migration will be created: `supabase/migrations/002_mvp_extended.sql` containing all new tables, RLS policies, and ALTER statements.

## Key Technical Decisions

1. **Excel library**: `xlsx` (SheetJS) chosen over `exceljs` for smaller bundle and simpler API for read/write operations.
2. **Thumbnail virtualization**: Intersection Observer preferred over `react-window` for simpler integration with the existing sidebar scroll container. Fall back to `react-window` if performance is insufficient with >50 pages.
3. **Rotation approach**: CSS transform on container rather than re-rendering the canvas. This avoids expensive PDF re-renders and keeps the SVG layer in sync automatically.
4. **Zoom approach**: Scroll position manipulation rather than CSS transform origin. This works naturally with the existing overflow:auto container.
5. **Derived measurements**: Stored as regular measurements with a linking table, rather than a separate type. This allows them to appear in exports and reports seamlessly.
6. **Quality gate**: Client-side validation engine rather than database functions. This provides instant feedback and avoids round-trip latency. Results are stored for audit trail.
7. **Unit conversion**: Display-only conversion in the UI layer. All database values remain in their original unit to prevent data loss from floating-point conversions.


## Correctness Properties

### Property 1: Unit Conversion Round-Trip
Converting a value from imperial to metric and back must produce the original value (within floating-point precision of 0.001%).

**Validates: Requirements 9.2, 9.3**

### Property 2: Derived Measurement Consistency
When a source measurement value is updated, all derived measurements linked via `derived_measurements` table must be recalculated before the UI reflects the change.

**Validates: Requirements 6.5**

### Property 3: Quality Gate Determinism
Running the quality gate on the same project state must always produce the same validation results.

**Validates: Requirements 4.1, 4.2**

### Property 4: Zoom Position Stability
After a wheel zoom event, the point under the cursor must remain at the same screen position (within 1px tolerance).

**Validates: Requirements 10.3**

### Property 5: Rotation Measurement Alignment
After rotation, measurement coordinates must inverse-transform correctly so that SVG overlays stay aligned with the canvas content.

**Validates: Requirements 8.2, 8.3**

### Property 6: Catalog Import Round-Trip
Exporting a catalog to Excel and importing it back must produce an identical catalog (same items, categories, prices).

**Validates: Requirements 5.8**

### Property 7: Thumbnail-Page Correspondence
Each thumbnail in the sidebar must correspond exactly to its page number; clicking thumbnail N must navigate to page N.

**Validates: Requirements 7.3**

## Error Handling

| Scenario | Handling Strategy |
|----------|-------------------|
| PDF thumbnail render failure | Show placeholder with page number, log error, don't block other thumbnails |
| Excel import with invalid rows | Collect errors per row, process valid rows, show summary report |
| Catalog item deletion with active assignments | Show confirmation dialog listing affected measurements |
| Quality gate query failure (DB unavailable) | Show error toast, allow retry, don't change project status |
| Report generation exceeds 50MB | Reduce thumbnail quality progressively, warn user, offer text-only fallback |
| Wheel zoom at boundary (min/max) | Clamp value silently, no visual jank |
| Derived measurement source deleted | CASCADE delete derived measurement, remove from UI |
| Excel file too large (>10k rows) | Reject with clear message before parsing |
| Rotation with active drawing in progress | Cancel active drawing, notify user |
| Network timeout during catalog save | Retry with exponential backoff (max 3 attempts), then error toast |

## Testing Strategy

### Unit Tests
- `lib/unit-conversion.ts` — Round-trip conversion accuracy, edge cases (0, negative, very large values)
- `lib/quality-gate.ts` — Each validation rule with passing and failing scenarios
- `lib/quick-actions.ts` — Computation accuracy, waste factor application, zero-value rejection
- `lib/catalog-utils.ts` — Excel parsing, column mapping, conflict detection

### Integration Tests
- Catalog CRUD flow with Supabase (mock client)
- Quality gate execution with various project states
- Measurement item assignment with recalculation

### Visual/Manual Tests
- Zoom centered on cursor across different zoom levels and scroll positions
- Rotation at 90°/180°/270° with measurement drawing
- Thumbnail rendering and navigation for PDFs with 1, 5, 20, 50+ pages
- Excel import with real-world price list files
- Report PDF generation with thumbnails for 10, 50, 100+ measurements
