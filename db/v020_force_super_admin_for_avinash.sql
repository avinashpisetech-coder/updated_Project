-- v020_force_super_admin_for_avinash.sql
-- Ensure this specific account is always super_admin.
-- Idempotent: safe to run multiple times.
UPDATE public.profiles p
SET role = 'super_admin'::user_role,
    updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND lower(u.email) = lower('avinashpise.tech@gmail.com')
  AND p.role IS DISTINCT FROM 'super_admin'::user_role;
