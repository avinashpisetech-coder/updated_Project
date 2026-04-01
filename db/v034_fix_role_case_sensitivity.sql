-- v034_fix_role_case_sensitivity.sql
-- Fixes: Role comparison functions doing exact case-sensitive match instead of case-insensitive
-- Root cause: Roles stored as "Super Admin", "Dept Admin", "Module Agent" but functions
--            checked for lowercase "super_admin", "dept_admin", etc.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix is_super_admin() - case-insensitive comparison
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regexp_replace(LOWER(role::text), '[^a-z0-9]+', '_', 'g') = 'super_admin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix is_dept_admin() - case-insensitive comparison
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_dept_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regexp_replace(LOWER(role::text), '[^a-z0-9]+', '_', 'g') = 'dept_admin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backward compatibility - update is_super_admin_access() if it exists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regexp_replace(LOWER(role::text), '[^a-z0-9]+', '_', 'g') = 'super_admin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Backward compatibility - update is_dept_admin_access() if it exists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_dept_admin_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT regexp_replace(LOWER(role::text), '[^a-z0-9]+', '_', 'g') = 'dept_admin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;
