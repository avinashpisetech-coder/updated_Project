-- v064_allow_profile_listing_for_assignment.sql
-- Description: Allows all authenticated users to see profiles of users 
-- with agent/admin roles (super_admin, dept_admin, module_agent) 
-- so they can select them as assignees during ticket creation.

DROP POLICY IF EXISTS "Allow read agent profiles for assignment" ON public.profiles;

CREATE POLICY "Allow read agent profiles for assignment"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    role::text IN ('super_admin', 'dept_admin', 'module_agent')
    AND status::text = 'active'
  );
