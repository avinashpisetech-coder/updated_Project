-- v010_profiles_rls_fix.sql
-- Fix SELECT and INSERT policies for the profiles table so admins can see all users
-- and create new user profiles, while regular users only see their own.

-- Create a secure function to check if the current user is an admin bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role::text INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role IN ('super_admin', 'dept_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the restrictive policies if they exist from previous versions
DROP POLICY IF EXISTS "Allow read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;

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

-- 3. Users can insert their own profile (e.g. at signup if they bypass admin)
CREATE POLICY "Allow insert own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (id = auth.uid());

-- 4. Admins can insert ANY profile
CREATE POLICY "Allow admin insert profiles" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (public.is_admin());
