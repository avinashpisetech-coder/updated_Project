/**
 * v170_rbac_identity_sync_v2.sql
 * BOOTSTRAPS: The new RBAC system by syncing profiles.role to user_roles.
 * ACTIVATE: Linkage between Users and the Permission Matrix.
 * VERSION: V2 (Corrected for user_role ENUM type casting).
 */

BEGIN;

-- 1. Ensure User Roles junction table exists with correct schema
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- 2. BOOTSTRAP: Migrate existing profile roles to the Matrix
-- We cast p.role to ::text to handle cases where it is a custom ENUM type.
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON (
    TRIM(UPPER(r.name)) = TRIM(UPPER(p.role::text)) OR
    (p.role::text = 'super_admin' AND r.name = 'Super Admin') OR
    (p.role::text = 'dept_admin' AND r.name = 'Dept. Admin') OR
    (p.role::text = 'end_user' AND r.name = 'End User')
)
ON CONFLICT DO NOTHING;

-- 3. VERIFY & FORCE: Ensure all Administrative roles have full protocols
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, perm.id
FROM public.roles r, public.permissions perm
WHERE r.name IN ('Super Admin', 'Dept. Admin', 'Administrator', 'SUPER ADMIN', 'DEPT ADMIN')
ON CONFLICT DO NOTHING;

COMMIT;
