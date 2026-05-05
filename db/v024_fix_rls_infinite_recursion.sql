-- v024_fix_rls_infinite_recursion.sql
-- Fixes: "infinite recursion detected in policy for relation 'profiles'"
--
-- Root cause (two cycles):
--
--  Cycle 1:
--    SELECT profiles
--      → policy "Allow read profiles for visible tickets" → SELECT tickets
--      → policy "Allow dept_admin read tickets" → SELECT profiles  …∞
--
--  Cycle 2:
--    SELECT profile_module_access
--      → policy "Allow dept_admin select access" → SELECT profiles
--      → policy "Allow read profiles for visible tickets" → SELECT tickets
--      → policy "Allow dept_admin read tickets" → SELECT profiles  …∞
--
-- Fix: introduce SECURITY DEFINER helper functions that query profiles
-- bypassing RLS, and rewrite every non-SECURITY-DEFINER profiles subquery
-- inside ticket- and profile_module_access-policies to use them.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  SECURITY DEFINER helpers (bypass RLS on profiles)
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns the current user's department_id without triggering RLS.
CREATE OR REPLACE FUNCTION public.user_department_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Returns all profile ids that belong to a given department.
CREATE OR REPLACE FUNCTION public.get_dept_member_ids(dept_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE department_id = dept_id;
$$;

GRANT EXECUTE ON FUNCTION public.user_department_id()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dept_member_ids(uuid)      TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  Fix tickets: "Allow dept_admin read tickets"
--     Old: SELECT id FROM public.profiles WHERE department_id = ...  ← triggers RLS
--     New: public.get_dept_member_ids(public.user_department_id())  ← SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow dept_admin read tickets" ON public.tickets;

CREATE POLICY "Allow dept_admin read tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.is_dept_admin()
    AND (
      requester_id  = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
      OR assigned_to_id = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  Fix profile_module_access: "Allow dept_admin select access"
--     Old: profile_id IN (SELECT id FROM public.profiles WHERE ...)  ← triggers RLS
--     New: profile_id = ANY(get_dept_member_ids(...))                ← SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow dept_admin select access" ON public.profile_module_access;

CREATE POLICY "Allow dept_admin select access" ON public.profile_module_access
  FOR SELECT TO authenticated
  USING (
    public.is_dept_admin()
    AND profile_id = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.  Add a permissive SELECT policy so authenticated users can read their own
--     module access rows (needed by module_agent to load their allowed modules).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read own module access" ON public.profile_module_access;

CREATE POLICY "Allow read own module access" ON public.profile_module_access
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
