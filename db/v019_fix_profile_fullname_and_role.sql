-- v019_fix_profile_fullname_and_role.sql
-- 1) Back-fill full_name for profiles where it is empty or generic
--    Uses the auth user's email (prefix before @) as a fallback.
UPDATE public.profiles p
SET full_name = COALESCE(
    NULLIF(TRIM(p.full_name), ''),
    SPLIT_PART((SELECT email FROM auth.users WHERE id = p.id), '@', 1),
    p.employee_id,
    'User'
  ),
  updated_at = now()
WHERE TRIM(p.full_name) = '' OR p.full_name IS NULL;

-- 2) Ensure all existing profiles have role = super_admin
--    (idempotent complement to v018 — safe to re-run)
UPDATE public.profiles
SET role = 'super_admin'::user_role,
    updated_at = now()
WHERE role IS DISTINCT FROM 'super_admin'::user_role;
