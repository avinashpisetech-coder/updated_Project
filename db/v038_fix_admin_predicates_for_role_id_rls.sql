-- v038_fix_admin_predicates_for_role_id_rls.sql
-- Ensure all admin helper predicates are compatible with role_id-based auth (v035).
-- This removes dependency on legacy role text checks in RLS paths.

-- Canonical admin helper used by older policies (e.g., profiles/tickets RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_system_role('super_admin')
    OR public.has_system_role('dept_admin')
    OR public.has_system_role('module_agent');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Keep explicit helpers aligned with role_id-aware checks
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

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dept_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dept_admin_access() TO authenticated;
