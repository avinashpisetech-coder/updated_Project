-- v008_departments_rls.sql
-- Fix RLS policy for departments table to allow insert/update operations

-- Drop the old select-only policy (optional, but cleaner)
DROP POLICY IF EXISTS "Allow read departments for authenticated" ON public.departments;

-- Create comprehensive policy for authenticated users
CREATE POLICY "Allow all access to authenticated users" 
ON public.departments 
FOR ALL 
USING (auth.role() = 'authenticated');
