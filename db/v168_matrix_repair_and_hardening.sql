/**
 * v168_matrix_repair_and_hardening.sql
 * REPAIRS: Permission leaks by resetting the matrix and applying precise grants.
 * HARDENS: Separates Administrative nodes from End User view.
 */

BEGIN;

-- 1. MATRIX RESET: Clear current role-permission links to remove leaked protocols
TRUNCATE public.role_permissions RESTART IDENTITY;

DO $$
DECLARE
    v_super_admin_id uuid;
    v_dept_admin_id uuid;
    v_end_user_id uuid;
BEGIN
    -- Resolve exact Role IDs
    SELECT id INTO v_super_admin_id FROM public.roles WHERE slug = 'super_admin';
    SELECT id INTO v_dept_admin_id FROM public.roles WHERE slug = 'dept_admin';
    SELECT id INTO v_end_user_id FROM public.roles WHERE slug = 'end_user';

    -- 2. HYDRATE SUPER ADMIN: Grant ALL existing permissions
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_super_admin_id, p.id FROM public.permissions p;

    -- 3. HYDRATE DEPT ADMIN: Operational Analytics & Management
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_dept_admin_id, p.id FROM public.permissions p
    WHERE p.resource IN (
        'module_dashboard', 
        'module_intelligence_hub', 
        'module_reports', 
        'module_help_desk', 
        'module_assets',
        'module_themes'
    );

    -- 4. HYDRATE END USER: Restricted Operational View
    -- They can see the dashboard Home and Create tickets, but NOT the full queue or assets.
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_end_user_id, p.id FROM public.permissions p
    WHERE (p.resource = 'module_dashboard' AND p.action = 'read')
       OR (p.resource = 'module_help_desk' AND p.action = 'create');

END $$;

COMMIT;
