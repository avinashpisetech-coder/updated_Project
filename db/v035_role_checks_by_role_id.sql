-- v035_role_checks_by_role_id.sql
-- Uses role IDs (user_roles.role_id) for admin checks, with fallback to profiles.role for legacy data.
-- This decouples authorization from editable role names.

-- 1) Utility: normalize role-like text into a stable key
CREATE OR REPLACE FUNCTION public.normalize_role_key(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9]+', '_', 'g');
$$;

-- 2) Mapping table from stable role key -> role UUID
CREATE TABLE IF NOT EXISTS public.system_role_ids (
  role_key text PRIMARY KEY,
  role_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure normalized keys are canonical when inserting/updating
CREATE OR REPLACE FUNCTION public.system_role_ids_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.role_key := public.normalize_role_key(NEW.role_key);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_role_ids_touch_updated_at ON public.system_role_ids;
CREATE TRIGGER trg_system_role_ids_touch_updated_at
BEFORE INSERT OR UPDATE ON public.system_role_ids
FOR EACH ROW
EXECUTE FUNCTION public.system_role_ids_touch_updated_at();

-- 3) Seed mapping from roles table (if RBAC roles exist).
-- NOTE: If role names were already edited, you can update system_role_ids manually.
DO $$
BEGIN
  IF to_regclass('public.roles') IS NOT NULL THEN
    INSERT INTO public.system_role_ids (role_key, role_id)
    SELECT 'super_admin', id
    FROM public.roles
    WHERE public.normalize_role_key(name) IN ('super_admin', 'superadmin')
    ORDER BY is_system_role DESC, created_at ASC
    LIMIT 1
    ON CONFLICT (role_key) DO NOTHING;

    INSERT INTO public.system_role_ids (role_key, role_id)
    SELECT 'dept_admin', id
    FROM public.roles
    WHERE public.normalize_role_key(name) IN ('dept_admin', 'department_admin')
    ORDER BY is_system_role DESC, created_at ASC
    LIMIT 1
    ON CONFLICT (role_key) DO NOTHING;

    INSERT INTO public.system_role_ids (role_key, role_id)
    SELECT 'module_agent', id
    FROM public.roles
    WHERE public.normalize_role_key(name) IN ('module_agent', 'agent')
    ORDER BY is_system_role DESC, created_at ASC
    LIMIT 1
    ON CONFLICT (role_key) DO NOTHING;

    INSERT INTO public.system_role_ids (role_key, role_id)
    SELECT 'end_user', id
    FROM public.roles
    WHERE public.normalize_role_key(name) IN ('end_user', 'user')
    ORDER BY is_system_role DESC, created_at ASC
    LIMIT 1
    ON CONFLICT (role_key) DO NOTHING;
  END IF;
END $$;

-- 4) Role checker by role key using role_id mapping first.
CREATE OR REPLACE FUNCTION public.has_system_role(target_role_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wanted_key text := public.normalize_role_key(target_role_key);
  mapped_role_id uuid;
BEGIN
  -- Preferred path: RBAC by role_id
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    SELECT sri.role_id
      INTO mapped_role_id
    FROM public.system_role_ids sri
    WHERE sri.role_key = wanted_key
    LIMIT 1;

    IF mapped_role_id IS NOT NULL THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role_id = mapped_role_id
      );
    END IF;
  END IF;

  -- Legacy fallback: profiles.role enum/text
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND public.normalize_role_key(p.role::text) = wanted_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_role_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_system_role(text) TO authenticated;

-- 5) Rewire helper predicates to use ID-based role checking
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_system_role('super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_dept_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_system_role('dept_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_system_role('super_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_dept_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_system_role('dept_admin');
$$;
