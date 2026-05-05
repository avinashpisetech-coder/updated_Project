-- Fix all SELECT policies on profiles table for Supabase RLS dashboard issues
-- This migration will drop old SELECT policies and add only the correct ones

-- Drop old SELECT policies
DROP POLICY IF EXISTS "Allow read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow read profiles for visible tickets" ON public.profiles;

-- 1. Everyone can read their own profile
CREATE POLICY "Allow read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Admins can read ALL profiles
CREATE POLICY "Allow admin read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 3. Users can read profiles referenced in tickets they can access
CREATE POLICY "Allow read profiles for visible tickets"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE (
        t.requester_id = profiles.id
        OR t.assigned_to_id = profiles.id
      )
      AND (
        t.requester_id = auth.uid()
        OR t.created_by_id = auth.uid()
        OR t.affected_person_id = auth.uid()
        OR t.assigned_to_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profile_module_access pma
          WHERE pma.profile_id = auth.uid() AND pma.can_view = true AND pma.module_id = t.module_id
        )
        OR public.is_admin()
      )
    )
  );
