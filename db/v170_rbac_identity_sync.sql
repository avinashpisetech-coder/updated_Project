/**
 * v170_rbac_identity_sync.sql
 * BOOTSTRAPS: The new RBAC system by syncing profiles.role to user_roles.
 * ACTIVATE: Linkage between Users and the Permission Matrix.
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
-- This takes the legacy 'role' string and matches it to the dynamic 'roles' table.
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON (
    TRIM(UPPER(r.name)) = TRIM(UPPER(p.role)) OR
    (p.role = 'super_admin' AND r.name = 'Super Admin') OR
    (p.role = 'dept_admin' AND r.name = 'Dept. Admin') OR
    (p.role = 'end_user' AND r.name = 'End User')
)
ON CONFLICT DO NOTHING;

-- 3. VERIFY & FORCE: Ensure all Administrative roles have full protocols
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, perm.id
FROM public.roles r, public.permissions perm
WHERE r.name IN ('Super Admin', 'Dept. Admin', 'Administrator', 'SUPER ADMIN', 'DEPT ADMIN')
ON CONFLICT DO NOTHING;

COMMIT;
