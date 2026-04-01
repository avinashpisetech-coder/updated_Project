-- v054_global_rls_early_exit.sql
-- Description: Implements "Early-Exit" logic across all critical tables.
-- Super Admins bypass complex row-visibility scans for instant performance.

-- 1. Optimized RBAC Checkers (Centralized and Cached)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Using a nested select for better Postgres plan caching
  SELECT COALESCE((SELECT role::text = 'super_admin' FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- 2. Apply Super Admin Fast-Path to all tables
-- This ensures that administrative queries return in milliseconds, not seconds.

-- Tickets Table
DROP POLICY IF EXISTS "Allow super_admin read tickets" ON public.tickets;
CREATE POLICY "Allow super_admin read all tickets" ON public.tickets
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Profiles Table
DROP POLICY IF EXISTS "Allow super_admin read all profiles" ON public.profiles;
CREATE POLICY "Allow super_admin read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_super_admin());

-- Activity Log
DROP POLICY IF EXISTS "Allow super_admin read activities" ON public.ticket_activity_log;
CREATE POLICY "Allow super_admin read all activities" ON public.ticket_activity_log
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Departments
DROP POLICY IF EXISTS "Allow super_admin read departments" ON public.departments;
CREATE POLICY "Allow super_admin read all departments" ON public.departments
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Companies
DROP POLICY IF EXISTS "Allow super_admin read companies" ON public.companies;
CREATE POLICY "Allow super_admin read all companies" ON public.companies
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- 3. Self-Read Fast-Path (Global)
-- Ensures every user can access their own data with zero overhead.
DROP POLICY IF EXISTS "Allow read own profile 2026" ON public.profiles;
CREATE POLICY "Allow read own profile 2026" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
