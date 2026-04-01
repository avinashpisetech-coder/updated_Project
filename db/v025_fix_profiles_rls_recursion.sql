-- v025_fix_profiles_rls_recursion.sql
-- Eliminates "infinite recursion detected in policy for relation 'profiles'"
-- and the symptoms it causes (only 1 user visible in masters, ticket page errors).
--
-- Root cause:
--   The policy "Allow read profiles for visible tickets" queries public.tickets.
--   Tickets policies then query back into public.profiles, creating an infinite loop.
--   PostgreSQL does NOT short-circuit OR-combined permissive policies, so this
--   fires even when is_admin() would already return TRUE for the row.
--
-- Fix strategy:
--   1. Drop the recursive policy entirely.
--   2. Add a safe replacement that does NOT query tickets (uses a SECURITY DEFINER
--      helper so RLS is bypassed on the inner profiles scan).
--   3. Mark role-checker functions as STABLE so Postgres evaluates them once per
--      query instead of per row, preventing any residual recursion.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.  Make role-checker functions STABLE
--     (Postgres can then hoist them out of per-row evaluation)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text IN ('super_admin', 'dept_admin')
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text = 'super_admin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_dept_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text = 'dept_admin'
  FROM public.profiles
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dept_admin()  TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.  Drop the recursive profiles policy
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow read profiles for visible tickets" ON public.profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.  Replace with a safe policy that lets users see profiles of people on
--     tickets they are directly involved with – without querying the tickets
--     table (which would re-trigger profiles RLS).
--     Strategy: expose a SECURITY DEFINER function that returns accessible
--     profile IDs for the current user by querying tickets with RLS bypassed.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_visible_profile_ids_for_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return profile IDs reachable via tickets the current user is part of.
  SELECT DISTINCT unnest(ARRAY[
    requester_id,
    created_by_id,
    assigned_to_id,
    affected_person_id
  ])
  FROM public.tickets
  WHERE
    requester_id       = auth.uid()
    OR created_by_id   = auth.uid()
    OR assigned_to_id  = auth.uid()
    OR affected_person_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_visible_profile_ids_for_user() TO authenticated;

-- Drop & recreate to ensure clean state
DROP POLICY IF EXISTS "Allow read profiles for visible tickets" ON public.profiles;

CREATE POLICY "Allow read profiles for visible tickets"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = ANY(SELECT public.get_visible_profile_ids_for_user())
  );
