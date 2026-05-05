-- v021_allow_public_read_departments.sql
-- Register page needs department values even before login.
-- Allow public read while keeping write operations restricted by existing authenticated policy.
DROP POLICY IF EXISTS "Allow public read departments" ON public.departments;
CREATE POLICY "Allow public read departments"
ON public.departments
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public read designations" ON public.designations;
CREATE POLICY "Allow public read designations"
ON public.designations
FOR SELECT
USING (true);
