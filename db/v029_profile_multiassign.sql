-- v029_profile_multiassign.sql
-- Add junction tables so each profile can be assigned to multiple companies/projects.
-- Keeps existing company_id/project_id FK columns as "primary" assignment for backward compat.

CREATE TABLE IF NOT EXISTS public.profile_companies (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_companies_profile_id ON public.profile_companies(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_companies_company_id ON public.profile_companies(company_id);

ALTER TABLE public.profile_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read profile_companies" ON public.profile_companies;
CREATE POLICY "Allow public read profile_companies"
  ON public.profile_companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage profile_companies" ON public.profile_companies;
CREATE POLICY "Allow authenticated manage profile_companies"
  ON public.profile_companies FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.profile_projects (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_projects_profile_id ON public.profile_projects(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_projects_project_id ON public.profile_projects(project_id);

ALTER TABLE public.profile_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read profile_projects" ON public.profile_projects;
CREATE POLICY "Allow public read profile_projects"
  ON public.profile_projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage profile_projects" ON public.profile_projects;
CREATE POLICY "Allow authenticated manage profile_projects"
  ON public.profile_projects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Seed junction tables from existing single-FK assignments so no data is lost.
INSERT INTO public.profile_companies (profile_id, company_id)
  SELECT id, company_id FROM public.profiles WHERE company_id IS NOT NULL
  ON CONFLICT DO NOTHING;

INSERT INTO public.profile_projects (profile_id, project_id)
  SELECT id, project_id FROM public.profiles WHERE project_id IS NOT NULL
  ON CONFLICT DO NOTHING;
