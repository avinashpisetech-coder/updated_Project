-- v028_company_project_software_and_role_sync.sql
-- 1) Remove forced-super-admin behavior so role updates persist.
-- 2) Add company/project masters and profile assignment fields.
-- 3) Add software systems master for ERP and IT ticket dropdowns.

-- Stop forcing every profile to super_admin on insert/update.
DROP TRIGGER IF EXISTS trg_force_super_admin_role ON public.profiles;
DROP FUNCTION IF EXISTS public.force_super_admin_role();

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'end_user'::user_role;

-- Companies master
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_status_check CHECK (status IN ('active', 'inactive'))
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read companies" ON public.companies;
CREATE POLICY "Allow public read companies"
ON public.companies
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage companies" ON public.companies;
CREATE POLICY "Allow authenticated manage companies"
ON public.companies
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Projects master
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT projects_company_name_unique UNIQUE (company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read projects" ON public.projects;
CREATE POLICY "Allow public read projects"
ON public.projects
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage projects" ON public.projects;
CREATE POLICY "Allow authenticated manage projects"
ON public.projects
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Profile assignment fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_project_id ON public.profiles(project_id);

-- Software systems master used in ERP and IT ticket forms.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'software_scope'
  ) THEN
    CREATE TYPE public.software_scope AS ENUM ('erp', 'it');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.software_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  scope public.software_scope NOT NULL,
  erp_module_id uuid REFERENCES public.erp_modules(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT software_systems_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT software_systems_scope_name_unique UNIQUE (scope, name)
);

ALTER TABLE public.software_systems
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'software_systems'
      AND column_name = 'is_active'
  ) THEN
    EXECUTE $sql$
      UPDATE public.software_systems
      SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END
      WHERE status IS NULL
    $sql$;
  END IF;
END $$;

UPDATE public.software_systems
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE public.software_systems
  ALTER COLUMN status SET DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'software_systems_status_check'
      AND conrelid = 'public.software_systems'::regclass
  ) THEN
    ALTER TABLE public.software_systems
      ADD CONSTRAINT software_systems_status_check
      CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_software_systems_scope ON public.software_systems(scope);
CREATE INDEX IF NOT EXISTS idx_software_systems_erp_module_id ON public.software_systems(erp_module_id);

ALTER TABLE public.software_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read software systems" ON public.software_systems;
CREATE POLICY "Allow public read software systems"
ON public.software_systems
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage software systems" ON public.software_systems;
CREATE POLICY "Allow authenticated manage software systems"
ON public.software_systems
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Seed a few sensible defaults when the tables are empty.
INSERT INTO public.companies (name, code)
SELECT 'Default Company', 'DEFAULT'
WHERE NOT EXISTS (SELECT 1 FROM public.companies);

INSERT INTO public.projects (company_id, name, code)
SELECT c.id, 'Core Operations', 'CORE'
FROM public.companies c
WHERE c.code = 'DEFAULT'
  AND NOT EXISTS (SELECT 1 FROM public.projects);

INSERT INTO public.software_systems (name, code, scope)
VALUES
  ('Microsoft 365', 'M365', 'it'),
  ('Windows Endpoint', 'WIN-ENDPOINT', 'it'),
  ('SAP S/4HANA', 'SAP-S4', 'erp'),
  ('Oracle Fusion', 'ORACLE-FUSION', 'erp')
ON CONFLICT (scope, name) DO NOTHING;