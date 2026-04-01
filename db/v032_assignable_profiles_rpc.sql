-- v032_assignable_profiles_rpc.sql
-- Adds a secure RPC to fetch assignable users for ticket workflow UI.

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

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND public.normalize_role_key(p.role::text) IN ('super_admin', 'dept_admin', 'module_agent')
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
  WHERE LOWER(COALESCE(p.status::text, '')) = 'active'
    AND public.normalize_role_key(p.role::text) NOT IN ('end_user', 'enduser', 'user')
  ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignable_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignable_profiles() TO authenticated;
