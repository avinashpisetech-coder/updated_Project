-- v026_fix_profiles_update_rls_recursion.sql
-- Fixes: "Failed to update user profile" caused by RLS infinite recursion
--        on UPDATE policies for the profiles table.
--
-- Root cause:
--   "Allow update dept admin department profiles" uses a raw subquery:
--     department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
--   This subquery is NOT in a SECURITY DEFINER context, so it triggers RLS on
--   profiles again, which re-evaluates ticket-linked policies → infinite loop.
--
-- Fix: Replace the raw subquery with the SECURITY DEFINER user_department_id()
--      function already defined in v024.

DROP POLICY IF EXISTS "Allow update dept admin department profiles" ON public.profiles;

CREATE POLICY "Allow update dept admin department profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_dept_admin()
    AND department_id = public.user_department_id()
    AND role::text <> 'super_admin'
  );
