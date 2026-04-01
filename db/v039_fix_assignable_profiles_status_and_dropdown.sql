-- v039_fix_assignable_profiles_status_and_dropdown.sql
-- Fix get_assignable_profiles() to include profiles with NULL or empty status
-- (treat them as active). Also ensure the caller auth check falls back to
-- role text if the user_roles / system_role_ids tables are empty.

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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Allow if the caller is an agent/admin via role_id lookup OR via profile.role text
  IF NOT (
    public.has_system_role('super_admin')
    OR public.has_system_role('dept_admin')
    OR public.has_system_role('module_agent')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND public.normalize_role_key(p.role::text) IN ('super_admin', 'dept_admin', 'module_agent')
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.full_name), ''), 'Unknown') AS full_name,
    COALESCE(p.email, 'no-email') AS email,
    p.role::text AS role
  FROM public.profiles p
  WHERE
    -- Treat NULL or empty status as active
    LOWER(COALESCE(NULLIF(TRIM(p.status::text), ''), 'active')) IN ('active', '')
    AND public.normalize_role_key(p.role::text) NOT IN ('end_user', 'enduser', 'user')
  ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignable_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignable_profiles() TO authenticated;
