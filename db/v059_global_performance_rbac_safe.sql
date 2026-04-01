-- v059_global_performance_rbac_safe.sql
-- Description: Applies the "Early-Exit" rule to the RBAC (Access Control) system.
-- This ensures that agents and admins can instantly check their permissions.

-- 1. Profile Module Access (The high-count table)
DROP POLICY IF EXISTS "Allow super_admin access" ON public.profile_module_access;
CREATE POLICY "Allow admin manage module access"
ON public.profile_module_access
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

DROP POLICY IF EXISTS "Allow dept_admin select access" ON public.profile_module_access;
CREATE POLICY "Allow dept_admin select access fast"
ON public.profile_module_access
FOR SELECT
TO authenticated
USING (
  -- Check own department access using the safe helper
  EXISTS (
    SELECT 1 FROM public.profiles p_me
    WHERE p_me.id = auth.uid() 
    AND p_me.role = 'dept_admin' 
    AND p_me.department_id = (SELECT department_id FROM public.profiles WHERE id = profile_module_access.profile_id)
  )
);

-- 2. Modules Master
DROP POLICY IF EXISTS "Allow super_admin read all modules" ON public.modules;
CREATE POLICY "Allow fast read all modules" 
ON public.modules
FOR SELECT
TO authenticated
USING (true); 

DROP POLICY IF EXISTS "Allow super_admin manage modules" ON public.modules;
CREATE POLICY "Allow admin manage modules"
ON public.modules
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());
