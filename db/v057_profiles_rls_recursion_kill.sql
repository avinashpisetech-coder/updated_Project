-- v057_profiles_rls_recursion_kill.sql
-- Description: Completely purges all conflicting RLS policies on profiles 
-- and replaces them with a single, non-recursive, high-performance policy.
--
-- This fixes the "infinite recursion detected" error.

-- 1. Optimized Non-Recursive Admin Check (Uses security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Query the table without triggering RLS recursively because of SECURITY DEFINER
  SELECT COALESCE(
    (SELECT role::text = 'super_admin' FROM public.profiles WHERE id = auth.uid()), 
    false
  );
$$;

-- 2. Drop EVERY known policy name for profiles to ensure a clean state
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow super_admin access" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles for visible tickets" ON public.profiles;
DROP POLICY IF EXISTS "Allow read own profile 2026" ON public.profiles;
DROP POLICY IF EXISTS "Allow super_admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles for authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON public.profiles;

-- 3. Create the SINGLE, UNIFIED, NON-RECURSIVE policy for profiles
-- Fast-path: Self (id = auth.uid()) OR Admin (using the safe function)
CREATE POLICY "Allow read profiles unified"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR public.is_super_admin_safe()
    OR EXISTS (
      -- Minimal check for ticket involvement
      SELECT 1 FROM public.tickets t
      WHERE (t.requester_id = profiles.id OR t.assigned_to_id = profiles.id)
      AND (t.requester_id = auth.uid() OR t.assigned_to_id = auth.uid())
      LIMIT 1
    )
  );

-- 4. Apply same logic to update/insert for consistency
DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;
CREATE POLICY "Allow update own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid() OR public.is_super_admin_safe())
  WITH CHECK (id = auth.uid() OR public.is_super_admin_safe());

-- 5. Fix Tickets Table to use the safe admin check
DROP POLICY IF EXISTS "Allow super_admin read all tickets" ON public.tickets;
CREATE POLICY "Allow super_admin read all tickets" ON public.tickets
  FOR SELECT TO authenticated USING (public.is_super_admin_safe());
