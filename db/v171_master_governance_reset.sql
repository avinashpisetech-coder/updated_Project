/**
 * v171_master_governance_reset.sql
 * DEFINITIVE RESOLUTION: Reset and Rebuild the entire RBAC matrix.
 * REVISED: Identity-Proof bootstrapping for profiles.role.
 */

BEGIN;

-- 1. CLEAN SLATE
TRUNCATE public.role_permissions, public.permissions, public.user_roles CASCADE;

-- 2. SEED PERMISSIONS (Absolute Literals)
INSERT INTO public.permissions (resource, action, name) VALUES
('module_dashboard', 'read', 'View Dashboard'),
('module_intelligence_hub', 'read', 'View Intelligence'),
('module_reports', 'read', 'View Reports'),
('module_help_desk', 'read', 'View Support Queue'),
('module_help_desk', 'create', 'Create Tickets'),
('module_help_desk', 'update', 'Edit Tickets'),
('module_assets', 'read', 'View Assets'),
('module_users_master', 'manage', 'Manage Users'),
('module_erp_masters', 'manage', 'Manage ERP Masters'),
('module_access_control', 'manage', 'Manage Security'),
('module_mail', 'manage', 'Manage Mail'),
('module_themes', 'read', 'View Settings');

DO $$
DECLARE
    v_super_admin_id uuid;
    v_dept_admin_id uuid;
    v_end_user_id uuid;
BEGIN
    -- 3. RESOLVE ROLES
    SELECT id INTO v_super_admin_id FROM public.roles WHERE UPPER(name) = 'SUPER ADMIN' OR name = 'Super Admin' LIMIT 1;
    SELECT id INTO v_dept_admin_id FROM public.roles WHERE UPPER(name) = 'DEPT ADMIN' OR name = 'Dept. Admin' OR name = 'Dept Admin' LIMIT 1;
    SELECT id INTO v_end_user_id FROM public.roles WHERE UPPER(name) = 'END USER' OR name = 'End User' LIMIT 1;

    -- 4. HYDRATE SUPER ADMIN
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM public.permissions;
    END IF;

    -- 5. HYDRATE DEPT ADMIN
    IF v_dept_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_dept_admin_id, id FROM public.permissions
        WHERE resource NOT IN ('module_access_control', 'module_mail');
    END IF;

    -- 6. HYDRATE END USER
    IF v_end_user_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_end_user_id, id FROM public.permissions
        WHERE (resource = 'module_dashboard' AND action = 'read')
           OR (resource = 'module_help_desk' AND action = 'create');
    END IF;

    -- 7. IDENTITY BOOTSTRAP (Identity-Proof Fuzzy Logic)
    -- This handles 'super_admin', 'Super Admin', 'SUPER ADMIN', etc.
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT p.id, v_super_admin_id 
    FROM public.profiles p 
    WHERE TRIM(UPPER(p.role::text)) IN ('SUPER ADMIN', 'SUPER_ADMIN') AND v_super_admin_id IS NOT NULL;
    
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT p.id, v_dept_admin_id 
    FROM public.profiles p 
    WHERE TRIM(UPPER(p.role::text)) IN ('DEPT ADMIN', 'DEPT_ADMIN', 'DEPT. ADMIN') AND v_dept_admin_id IS NOT NULL;
    
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT p.id, v_end_user_id 
    FROM public.profiles p 
    WHERE TRIM(UPPER(p.role::text)) IN ('END USER', 'END_USER', 'USER') AND v_end_user_id IS NOT NULL;

END $$;

COMMIT;
