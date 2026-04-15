/**
 * v168_matrix_repair_v2.sql
 * REPAIRS: Permission leaks by resetting the matrix and applying precise grants.
 * HARDENS: Separates Administrative nodes from End User view.
 * VERSION: V2 (Corrected for roles table schema - using 'name' column).
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
    -- Identify Role IDs by Name (Matching your established role registry)
    -- Using case-insensitive matches to ensure robust identification
    SELECT id INTO v_super_admin_id FROM public.roles WHERE UPPER(name) = 'SUPER ADMIN' OR name = 'Super Admin' LIMIT 1;
    SELECT id INTO v_dept_admin_id FROM public.roles WHERE UPPER(name) = 'DEPT ADMIN' OR name = 'Dept. Admin' OR name = 'Dept Admin' LIMIT 1;
    SELECT id INTO v_end_user_id FROM public.roles WHERE UPPER(name) = 'END USER' OR name = 'End User' LIMIT 1;

    -- 2. HYDRATE SUPER ADMIN: Grant ALL existing permissions
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, p.id FROM public.permissions p;
    END IF;

    -- 3. HYDRATE DEPT ADMIN: Operational Analytics & Management
    IF v_dept_admin_id IS NOT NULL THEN
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
    END IF;

    -- 4. HYDRATE END USER: Restricted Operational View
    -- Only dashboard Home and Creating tickets.
    IF v_end_user_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_end_user_id, p.id FROM public.permissions p
        WHERE (p.resource = 'module_dashboard' AND p.action = 'read')
           OR (p.resource = 'module_help_desk' AND p.action = 'create');
    END IF;

END $$;

COMMIT;
