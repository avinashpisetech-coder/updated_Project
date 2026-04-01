-- v013_profiles_admin_update_delete.sql
-- Add RBAC policies for user CRUD (update/delete) aligned with 3.1 user access control.

-- Add helper functions for role evaluation.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role::text INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_dept_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role::text INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'dept_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old profile policies (if any) and add row-level RBAC for updates and deletes.
DROP POLICY IF EXISTS "Allow update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow update admin profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update dept admin same department" ON public.profiles;
DROP POLICY IF EXISTS "Allow delete profiles" ON public.profiles;

CREATE POLICY "Allow update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Allow update super admin profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Allow update dept admin department profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (
    public.is_dept_admin()
    AND department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid())
    AND role <> 'super_admin'
  );

CREATE POLICY "Allow delete super admin profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_super_admin());
