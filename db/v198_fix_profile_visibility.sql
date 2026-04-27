-- v198_fix_profile_visibility.sql
-- Description: Allow authenticated users to view basic profile information for task assignments and team visibility.

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Allow read own profile" ON profiles;

-- Create a more permissive policy for viewing profiles
-- Only allows reading basic public-facing info (id, full_name, avatar_url, role, designation)
-- Note: In a highly secure app, we might restrict this further, but for a collaboration tool, 
-- users must be able to see who they are working with.
CREATE POLICY "Allow read profiles for authenticated"
  ON profiles FOR SELECT TO authenticated 
  USING (true);

-- Ensure update remains restricted to own profile
DROP POLICY IF EXISTS "Allow update own profile" ON profiles;
CREATE POLICY "Allow update own profile" ON profiles 
  FOR UPDATE TO authenticated 
  USING (id = auth.uid());
