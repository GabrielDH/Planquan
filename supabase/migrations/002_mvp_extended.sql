-- ============================
-- PlanQuan MVP Extended Schema
-- ============================

-- Catalog Categories (hierarchical)
CREATE TABLE public.catalog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.catalog_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catalog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON public.catalog_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own categories" ON public.catalog_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.catalog_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.catalog_categories FOR DELETE USING (auth.uid() = user_id);

-- Catalog Items
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

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items" ON public.catalog_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own items" ON public.catalog_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.catalog_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON public.catalog_items FOR DELETE USING (auth.uid() = user_id);

-- Measurement Item Assignments
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

ALTER TABLE public.measurement_item_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.measurement_item_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = measurement_item_assignments.measurement_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create own assignments" ON public.measurement_item_assignments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = measurement_item_assignments.measurement_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own assignments" ON public.measurement_item_assignments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = measurement_item_assignments.measurement_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own assignments" ON public.measurement_item_assignments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = measurement_item_assignments.measurement_id AND p.user_id = auth.uid()
  )
);

-- Derived Measurements (links source → derived)
CREATE TABLE public.derived_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_measurement_id UUID NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  derived_measurement_id UUID NOT NULL REFERENCES public.measurements(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.derived_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own derived" ON public.derived_measurements FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = derived_measurements.source_measurement_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create own derived" ON public.derived_measurements FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = derived_measurements.source_measurement_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own derived" ON public.derived_measurements FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.measurements m
    JOIN public.projects p ON p.id = m.project_id
    WHERE m.id = derived_measurements.source_measurement_id AND p.user_id = auth.uid()
  )
);

-- Quality Gate Results
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

ALTER TABLE public.quality_gate_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gate results" ON public.quality_gate_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = quality_gate_results.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create own gate results" ON public.quality_gate_results FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = quality_gate_results.project_id AND user_id = auth.uid())
);

-- Modify projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS force_approved BOOLEAN DEFAULT false;

-- Triggers for updated_at
CREATE TRIGGER update_catalog_categories_updated_at BEFORE UPDATE ON public.catalog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON public.catalog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_measurement_item_assignments_updated_at BEFORE UPDATE ON public.measurement_item_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
