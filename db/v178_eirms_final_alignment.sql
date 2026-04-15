-- ============================================================================
-- V178: EIRMS FINAL GOVERNANCE ALIGNMENT
-- ============================================================================
-- Specifically targets the "Empty Box" issue by ensuring all core EIRMS
-- modules have their standardized 4-way protocol (read, create, update, delete).
-- It also captures legacy "view" actions and maps them to "read".

DO $$
BEGIN
    -- 1. HELPER: STANDARDIZED SEEDING (FINAL VERSION)
    CREATE OR REPLACE FUNCTION public.seed_final_alignment(p_resource TEXT, p_name TEXT) 
    RETURNS void AS $inner$
    BEGIN
        -- SYNC VIEW (read)
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'View ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'read' WHERE name = 'View ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE (resource = p_resource OR resource = 'module_' || p_resource) AND action = 'read') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('View ' || p_name, 'Ability to view ' || p_name || ' records', p_resource, 'read');
        END IF;

        -- SYNC CREATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Create ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'create' WHERE name = 'Create ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE (resource = p_resource OR resource = 'module_' || p_resource) AND action = 'create') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Create ' || p_name, 'Ability to initialize new ' || p_name || ' records', p_resource, 'create');
        END IF;

        -- SYNC UPDATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Update ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'update' WHERE name = 'Update ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE (resource = p_resource OR resource = 'module_' || p_resource) AND action = 'update') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Update ' || p_name, 'Ability to modify existing ' || p_name || ' records', p_resource, 'update');
        END IF;

        -- SYNC DELETE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Delete ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'delete' WHERE name = 'Delete ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE (resource = p_resource OR resource = 'module_' || p_resource) AND action = 'delete') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Delete ' || p_name, 'Ability to remove ' || p_name || ' records', p_resource, 'delete');
        END IF;
    END;
    $inner$ LANGUAGE plpgsql;

    -- 2. ALIGN: CORE MASTERS (The "Empty Boxes" in the screenshot)
    PERFORM public.seed_final_alignment('access_control', 'Security & IAM');
    PERFORM public.seed_final_alignment('users_master', 'Users Master');
    PERFORM public.seed_final_alignment('organizations', 'Organization Registry');
    PERFORM public.seed_final_alignment('help_desk_master', 'Help Desk Master');
    
    -- 3. ALIGN: CORE TRANSACTIONS
    PERFORM public.seed_final_alignment('tickets', 'Tickets');
    PERFORM public.seed_final_alignment('help-desk', 'Help Desk');
    PERFORM public.seed_final_alignment('requisitions', 'Requisitions');

    -- 4. HYDRATE ADMINS
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE (r.name = 'Super Admin' OR r.name = 'IT Admin')
    AND p.resource IN ('access_control', 'users_master', 'organizations', 'help_desk_master', 'tickets', 'help-desk', 'requisitions')
    AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );

    DROP FUNCTION IF EXISTS public.seed_final_alignment(TEXT, TEXT);

END $$;
