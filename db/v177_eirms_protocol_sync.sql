-- ============================================================================
-- V177: EIRMS PROTOCOL SYNC (TICKETING RESTORATION)
-- ============================================================================
-- This script synchronizes all EIRMS (Ticketing) modules with the 
-- standardized governance model (read, create, update, delete).
-- It ensures that the Governance Matrix is fully populated with checkboxes.

DO $$
BEGIN
    -- 1. HELPER: STANDARDIZED SEEDING (SAFE VERSION)
    CREATE OR REPLACE FUNCTION public.seed_eirms_protocol(p_resource TEXT, p_name TEXT) 
    RETURNS void AS $inner$
    BEGIN
        -- Insert/Update READ
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'View ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'read' WHERE name = 'View ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'read') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('View ' || p_name, 'Ability to view ' || p_name || ' records', p_resource, 'read');
        END IF;

        -- Insert/Update CREATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Create ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'create' WHERE name = 'Create ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'create') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Create ' || p_name, 'Ability to initialize new ' || p_name || ' records', p_resource, 'create');
        END IF;

        -- Insert/Update UPDATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Update ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'update' WHERE name = 'Update ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'update') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Update ' || p_name, 'Ability to modify existing ' || p_name || ' records', p_resource, 'update');
        END IF;

        -- Insert/Update DELETE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Delete ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'delete' WHERE name = 'Delete ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'delete') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Delete ' || p_name, 'Ability to remove ' || p_name || ' records', p_resource, 'delete');
        END IF;

        -- Insert/Update MANAGE
        IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'manage') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Manage ' || p_name, 'Full administrative control over ' || p_name, p_resource, 'manage');
        END IF;
    END;
    $inner$ LANGUAGE plpgsql;

    -- 2. SYNC: EIRMS CORE SUPPORT
    PERFORM public.seed_eirms_protocol('module_help_desk', 'Help Desk');
    PERFORM public.seed_eirms_protocol('module_tickets', 'Tickets');
    PERFORM public.seed_eirms_protocol('module_requisitions', 'Requisitions');

    -- 3. SYNC: EIRMS MASTERS
    PERFORM public.seed_eirms_protocol('module_users_master', 'Users Master');
    PERFORM public.seed_eirms_protocol('module_help_desk_master', 'Help Desk Master');
    PERFORM public.seed_eirms_protocol('module_access_control', 'Security & IAM');
    PERFORM public.seed_eirms_protocol('module_organizations', 'Organization Registry');

    -- 4. SYNC: SYSTEM NODES
    PERFORM public.seed_eirms_protocol('module_dashboard', 'Executive Dashboard');
    PERFORM public.seed_eirms_protocol('module_intelligence_hub', 'Intelligence Hub');
    PERFORM public.seed_eirms_protocol('module_reports', 'Analytical Reports');
    PERFORM public.seed_eirms_protocol('module_mail', 'Mail Infrastructure');
    PERFORM public.seed_eirms_protocol('module_themes', 'Settings & Themes');

    -- 5. RE-HYDRATE ADMIN ROLES
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE (r.name = 'Super Admin' OR r.name = 'IT Admin')
    AND p.resource LIKE 'module_%'
    AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );

    -- Cleanup
    DROP FUNCTION IF EXISTS public.seed_eirms_protocol(TEXT, TEXT);

END $$;
