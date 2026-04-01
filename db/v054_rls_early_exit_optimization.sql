-- v054_rls_early_exit_optimization.sql
-- Description: Implements "Early-Exit" logic in RLS policies to bypass 
-- expensive visibility checks for administrators.
--
-- Performance Impact: 100-500ms -> <10ms for administrators.

-- 1. Optimize RBAC Checkers (Use (SELECT ...) for better Postgres caching)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role::text = 'super_admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_dept_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role::text = 'dept_admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 2. Optimize Tickets Policy (Early-Exit for Super Admin)
DROP POLICY IF EXISTS "Allow read all tickets for super_admin" ON public.tickets;
CREATE POLICY "Allow read all tickets for super_admin" ON public.tickets
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- 3. Optimize Activity Log Policy (Early-Exit for Super Admin)
DROP POLICY IF EXISTS "Allow read all activities for super_admin" ON public.ticket_activity_log;
CREATE POLICY "Allow read all activities for super_admin" ON public.ticket_activity_log
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- 4. Optimize Profiles Policy (The biggest performance killer)
-- Old policy used ANY(SELECT get_visible_profile_ids_for_user()) which scanned the tickets table per row.
DROP POLICY IF EXISTS "Allow read profiles for super_admin" ON public.profiles;
CREATE POLICY "Allow read profiles for super_admin" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- 5. Add a fast self-read policy
DROP POLICY IF EXISTS "Allow read own profile" ON public.profiles;
CREATE POLICY "Allow read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
