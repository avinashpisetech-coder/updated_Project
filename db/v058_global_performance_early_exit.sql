-- v058_global_performance_early_exit.sql
-- Description: Applies the "Early-Exit" performance rule to all Master Data tables.
-- 
-- Performance Rule: Administrators MUST bypass Row Level Security scans for 
-- instant, sub-second responses across the entire application.

-- 1. Software Systems
DROP POLICY IF EXISTS "Allow authenticated manage software systems" ON public.software_systems;
CREATE POLICY "Allow admin manage software systems"
ON public.software_systems
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

DROP POLICY IF EXISTS "Allow public read software systems" ON public.software_systems;
CREATE POLICY "Allow fast read software systems"
ON public.software_systems
FOR SELECT
TO authenticated
USING (true); -- Master data is readable by all authenticated users for dropdowns

-- 2. ERP Modules
DROP POLICY IF EXISTS "Allow manage erp_modules" ON public.erp_modules;
CREATE POLICY "Allow admin manage erp_modules" 
ON public.erp_modules
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

-- 3. Companies & Projects (Already has public read, but adding admin manage bypass)
DROP POLICY IF EXISTS "Allow authenticated manage companies" ON public.companies;
CREATE POLICY "Allow admin manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

DROP POLICY IF EXISTS "Allow authenticated manage projects" ON public.projects;
CREATE POLICY "Allow admin manage projects"
ON public.projects
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

-- 4. Departments
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.departments;
CREATE POLICY "Allow admin manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.is_super_admin_safe())
WITH CHECK (public.is_super_admin_safe());

CREATE POLICY "Allow fast read departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);
