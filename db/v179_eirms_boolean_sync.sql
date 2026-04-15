-- ============================================================================
-- V179: EIRMS BOOLEAN GOVERNANCE SYNC (REVISION 5.1 - BULLETPROOF)
-- ============================================================================
-- This script ensures all whitelisted EIRMS modules have the full 4-way protocol set.
-- Updated with "Legacy Capture" logic to prevent duplicate name constraint errors.

DO $$
BEGIN
    -- 1. HELPER: STANDARDIZED SEEDING (UPSERT BY NAME)
    CREATE OR REPLACE FUNCTION public.seed_boolean_protocol(p_resource TEXT, p_name TEXT) 
    RETURNS void AS $inner$
    BEGIN
        -- SYNC READ
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'View ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'read' WHERE name = 'View ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'read') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('View ' || p_name, 'Ability to view ' || p_name || ' records', p_resource, 'read');
        END IF;

        -- SYNC CREATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Create ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'create' WHERE name = 'Create ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'create') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Create ' || p_name, 'Ability to initialize new ' || p_name || ' records', p_resource, 'create');
        END IF;

        -- SYNC UPDATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Update ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'update' WHERE name = 'Update ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'update') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Update ' || p_name, 'Ability to modify existing ' || p_name || ' records', p_resource, 'update');
        END IF;

        -- SYNC DELETE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Delete ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'delete' WHERE name = 'Delete ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'delete') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Delete ' || p_name, 'Ability to remove ' || p_name || ' records', p_resource, 'delete');
        END IF;
    END;
    $inner$ LANGUAGE plpgsql;

    -- 2. ALIGN: CORE EIRMS VERTICAL
    PERFORM public.seed_boolean_protocol('tickets', 'Tickets');
    PERFORM public.seed_boolean_protocol('help-desk', 'Help Desk');
    PERFORM public.seed_boolean_protocol('requisitions', 'Requisitions');
    PERFORM public.seed_boolean_protocol('service-desk', 'Service Desk');
    PERFORM public.seed_boolean_protocol('support-queue', 'Support Queue');

    -- 3. ALIGN: STRUCTURAL MASTERS
    PERFORM public.seed_boolean_protocol('users_master', 'Users Master');
    PERFORM public.seed_boolean_protocol('help_desk_master', 'Help Desk Master');
    PERFORM public.seed_boolean_protocol('access_control', 'Security & IAM');
    PERFORM public.seed_boolean_protocol('organizations', 'Organization Registry');

    -- 4. ALIGN: SYSTEM NODES
    PERFORM public.seed_boolean_protocol('dashboard', 'Executive Dashboard');
    PERFORM public.seed_boolean_protocol('intelligence_hub', 'Intelligence Hub');
    PERFORM public.seed_boolean_protocol('reports', 'Analytical Reports');
    PERFORM public.seed_boolean_protocol('mail', 'Mail Infrastructure');
    PERFORM public.seed_boolean_protocol('themes', 'Settings & Themes');

    -- Cleanup
    DROP FUNCTION IF EXISTS public.seed_boolean_protocol(TEXT, TEXT);

END $$;
