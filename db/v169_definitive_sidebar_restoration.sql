/**
 * v169_definitive_sidebar_restoration.sql
 * RESTORES: All missing Administration and System Config nodes for authorized roles.
 * ROBUST: Uses flexible role matching to ensure administrative roles are correctly identified.
 */

BEGIN;

-- 1. Ensure all protocols are present in the registry
DO $$
BEGIN
    PERFORM public.ensure_crud_permissions('module_users_master', 'User Directory');
    PERFORM public.ensure_crud_permissions('module_erp_masters', 'ERP Systems Master');
    PERFORM public.ensure_crud_permissions('module_help_desk_master', 'Help Desk Master');
    PERFORM public.ensure_crud_permissions('module_organizations', 'Organizational Entities');
    PERFORM public.ensure_crud_permissions('module_access_control', 'Security & Access Control');
    PERFORM public.ensure_crud_permissions('module_mail', 'Mail Protocol');
END $$;

-- 2. DYNAMIC HYDRATION: Link protocols to Roles
-- This script finds the Super Admin role more robustly and grants EVERYTHING.
DO $$
DECLARE
    v_target_role_id uuid;
BEGIN
    -- Search for Super Admin using a very flexible match
    SELECT id INTO v_target_role_id 
    FROM public.roles 
    WHERE TRIM(UPPER(name)) IN ('SUPER ADMIN', 'SUPER_ADMIN', 'ADMINISTRATOR', 'ADMIN')
    LIMIT 1;

    IF v_target_role_id IS NOT NULL THEN
        -- Grant ALL permissions to this role
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_target_role_id, p.id FROM public.permissions p
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Hydrated Admin Role ID: %', v_target_role_id;
    END IF;

    -- Also hydrate Dept Admin with master access if needed
    SELECT id INTO v_target_role_id 
    FROM public.roles 
    WHERE TRIM(UPPER(name)) IN ('DEPT ADMIN', 'DEPT. ADMIN', 'DEPARTMENT ADMIN')
    LIMIT 1;

    IF v_target_role_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_target_role_id, p.id 
        FROM public.permissions p
        WHERE p.resource IN ('module_users_master', 'module_erp_masters', 'module_help_desk_master', 'module_organizations', 'module_help_desk', 'module_assets')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

COMMIT;
