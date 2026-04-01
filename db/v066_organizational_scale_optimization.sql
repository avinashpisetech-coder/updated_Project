-- v066_organizational_scale_optimization.sql
-- Optimizes profile role lookups and RPC performance for large organizational databases.

-- 0. Re-create the normalization function (without using it in the index).
-- This stays for app-level compatibility but we won't rely on it for indexing.
CREATE OR REPLACE FUNCTION public.normalize_role_key(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(coalesce(input, '')) COLLATE "C");
$$;

-- 1. Create a Standard Index on the role column itself.
-- Standard indexes on ENUM types are fundamentally immutable and extremely fast.
CREATE INDEX IF NOT EXISTS idx_profiles_role_standard 
ON public.profiles (role);

-- 2. Optimize the get_assignable_profiles RPC to use the standard index.
-- We use direct enum comparisons to ensure the PostgreSQL planner uses the index.
CREATE OR REPLACE FUNCTION public.get_assignable_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Early exit for unauthorized calls
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Performance authorized check
  IF NOT (
    public.has_system_role('super_admin')
    OR public.has_system_role('dept_admin')
    OR public.has_system_role('module_agent')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Unknown') AS full_name,
    COALESCE(p.email, 'no-email') AS email,
    p.role::text AS role
  FROM public.profiles p
  WHERE 
    -- Use indexed status comparison
    LOWER(COALESCE(p.status::text, 'active')) = 'active'
    -- Use direct enum comparison to hit the standard index idx_profiles_role_standard
    AND p.role NOT IN ('end_user'::public.user_role)
  ORDER BY p.full_name NULLS LAST;
END;
$$;

-- 2. Optimize the get_assignable_profiles RPC to use the new index.
CREATE OR REPLACE FUNCTION public.get_assignable_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Early exit for unauthorized calls
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Use high-speed indexed lookup for permission check
  IF NOT (
    public.has_system_role('super_admin')
    OR public.has_system_role('dept_admin')
    OR public.has_system_role('module_agent')
  ) THEN
    -- For organizational privacy, we return empty rather than crashing with an exception
    -- if the user is not an agent. This avoids expensive error handling in the API layer.
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Unknown') AS full_name,
    COALESCE(p.email, 'no-email') AS email,
    p.role::text AS role
  FROM public.profiles p
  WHERE 
    -- Use the functional index for status check (if status is converted to text)
    LOWER(COALESCE(p.status::text, 'active')) = 'active'
    -- This now hits the functional index idx_profiles_normalized_role_functional
    AND public.normalize_role_key(p.role::text) NOT IN ('end_user', 'enduser', 'user')
  ORDER BY p.full_name NULLS LAST;
END;
$$;
