
-- ============================
-- PlanQuant MVP Database Schema
-- ============================

-- Profiles table (linked to auth users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'analyst',
  preferred_units TEXT NOT NULL DEFAULT 'imperial',
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  number_format TEXT NOT NULL DEFAULT 'us',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  project_type TEXT NOT NULL DEFAULT 'residential',
  regional_template TEXT NOT NULL DEFAULT 'florida_residential',
  unit_system TEXT NOT NULL DEFAULT 'imperial',
  levels INTEGER DEFAULT 1,
  typical_height NUMERIC,
  typical_height_unit TEXT DEFAULT 'ft',
  total_area NUMERIC,
  total_area_unit TEXT DEFAULT 'ft2',
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'USD',
  number_format TEXT NOT NULL DEFAULT 'us',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Project Files table
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  derived_storage_path TEXT,
  folder TEXT DEFAULT 'Architectural',
  sheet_label TEXT DEFAULT '',
  total_pages INTEGER DEFAULT 1,
  current_revision TEXT DEFAULT 'A',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files in own projects" ON public.project_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_files.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can upload files to own projects" ON public.project_files FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_files.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update files in own projects" ON public.project_files FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_files.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete files in own projects" ON public.project_files FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_files.project_id AND user_id = auth.uid())
);

-- Page Scales (calibration per page)
CREATE TABLE public.page_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  scale_type TEXT NOT NULL,
  point1_x NUMERIC,
  point1_y NUMERIC,
  point2_x NUMERIC,
  point2_y NUMERIC,
  real_distance NUMERIC,
  real_distance_unit TEXT,
  standard_scale TEXT,
  pixels_per_unit NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ft',
  calibrated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.page_scales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scales in own project files" ON public.page_scales FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.project_files pf
    JOIN public.projects p ON p.id = pf.project_id
    WHERE pf.id = page_scales.file_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create scales" ON public.page_scales FOR INSERT WITH CHECK (
  auth.uid() = calibrated_by AND EXISTS (
    SELECT 1 FROM public.project_files pf
    JOIN public.projects p ON p.id = pf.project_id
    WHERE pf.id = page_scales.file_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update scales in own project files" ON public.page_scales FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.project_files pf
    JOIN public.projects p ON p.id = pf.project_id
    WHERE pf.id = page_scales.file_id AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete scales in own project files" ON public.page_scales FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.project_files pf
    JOIN public.projects p ON p.id = pf.project_id
    WHERE pf.id = page_scales.file_id AND p.user_id = auth.uid()
  )
);

-- Measurements table (full traceability)
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  user_id UUID NOT NULL,
  measurement_type TEXT NOT NULL,
  coordinates JSONB NOT NULL DEFAULT '[]',
  value NUMERIC,
  unit TEXT,
  original_value NUMERIC,
  original_unit TEXT,
  label TEXT DEFAULT '',
  comment TEXT DEFAULT '',
  color TEXT DEFAULT '#FF0000',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view measurements in own projects" ON public.measurements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = measurements.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create measurements in own projects" ON public.measurements FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects WHERE id = measurements.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update measurements in own projects" ON public.measurements FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = measurements.project_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete measurements in own projects" ON public.measurements FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = measurements.project_id AND user_id = auth.uid())
);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE ON public.project_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_page_scales_updated_at BEFORE UPDATE ON public.page_scales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON public.measurements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for project files (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Storage policies
CREATE POLICY "Users can upload project files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view own project files" ON storage.objects FOR SELECT USING (
  bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update own project files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own project files" ON storage.objects FOR DELETE USING (
  bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]
);
