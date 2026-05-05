-- v037_fix_assignable_rpc_and_role_key_normalization.sql
-- Align assignable-profile authorization with role_id-based checks (v035)
-- and tighten role-key normalization to avoid key mismatches.

-- 1) Normalize role keys robustly (trim + lowercase + collapse separators + strip edges)
CREATE OR REPLACE FUNCTION public.normalize_role_key(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
           regexp_replace(lower(trim(coalesce(input, ''))), '[^a-z0-9]+', '_', 'g'),
           '^_+|_+$',
           '',
           'g'
         );
$$;

GRANT EXECUTE ON FUNCTION public.normalize_role_key(text) TO authenticated;

-- 2) Re-canonicalize existing system role keys after normalization update
UPDATE public.system_role_ids
SET role_key = public.normalize_role_key(role_key),
    updated_at = now();

-- 3) Ensure has_system_role continues to prefer role_id mapping with normalized key
CREATE OR REPLACE FUNCTION public.has_system_role(target_role_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wanted_key text := public.normalize_role_key(target_role_key);
  mapped_role_id uuid;
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    SELECT sri.role_id
      INTO mapped_role_id
    FROM public.system_role_ids sri
    WHERE sri.role_key = wanted_key
    LIMIT 1;

    IF mapped_role_id IS NOT NULL THEN
      RETURN EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role_id = mapped_role_id
      );
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND public.normalize_role_key(p.role::text) = wanted_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_system_role(text) TO authenticated;

-- 4) Recreate assignable profile RPC with role_id-safe auth checks
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

  IF NOT (
    public.has_system_role('super_admin')
    OR public.has_system_role('dept_admin')
    OR public.has_system_role('module_agent')
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
  WHERE LOWER(COALESCE(p.status::text, 'active')) = 'active'
    AND public.normalize_role_key(p.role::text) NOT IN ('end_user', 'enduser', 'user')
  ORDER BY p.full_name NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_assignable_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assignable_profiles() TO authenticated;
