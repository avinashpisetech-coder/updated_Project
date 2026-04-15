-- ============================================================================
-- V176: UNIVERSAL GOVERNANCE SYNC (LEGACY CAPTURE VERSION)
-- ============================================================================
-- REVISION 3: Added "Upsert by Name" logic to handle legacy permission collisions.
-- This version captures existing permissions and standardizes them into the
-- module_ prefix system required for 100% Governance Parity.

DO $$
BEGIN
    -- 1. HELPER: STANDARDIZED SEEDING (UPSERT BY NAME)
    CREATE OR REPLACE FUNCTION public.seed_universal_protocol(p_resource TEXT, p_name TEXT) 
    RETURNS void AS $inner$
    BEGIN
        -- SYNC VIEW (read)
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'View ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'read', description = 'Ability to view ' || p_name || ' records'
            WHERE name = 'View ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'read') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('View ' || p_name, 'Ability to view ' || p_name || ' records', p_resource, 'read');
        END IF;

        -- SYNC CREATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Create ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'create', description = 'Ability to initialize new ' || p_name || ' records'
            WHERE name = 'Create ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'create') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Create ' || p_name, 'Ability to initialize new ' || p_name || ' records', p_resource, 'create');
        END IF;

        -- SYNC UPDATE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Update ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'update', description = 'Ability to modify existing ' || p_name || ' records'
            WHERE name = 'Update ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'update') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Update ' || p_name, 'Ability to modify existing ' || p_name || ' records', p_resource, 'update');
        END IF;

        -- SYNC DELETE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Delete ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'delete', description = 'Ability to remove ' || p_name || ' records'
            WHERE name = 'Delete ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'delete') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Delete ' || p_name, 'Ability to remove ' || p_name || ' records', p_resource, 'delete');
        END IF;

        -- SYNC MANAGE
        IF EXISTS (SELECT 1 FROM public.permissions WHERE name = 'Manage ' || p_name) THEN
            UPDATE public.permissions SET resource = p_resource, action = 'manage', description = 'Full administrative control over ' || p_name
            WHERE name = 'Manage ' || p_name;
        ELSIF NOT EXISTS (SELECT 1 FROM public.permissions WHERE resource = p_resource AND action = 'manage') THEN
            INSERT INTO public.permissions (name, description, resource, action)
            VALUES ('Manage ' || p_name, 'Full administrative control over ' || p_name, p_resource, 'manage');
        END IF;
    END;
    $inner$ LANGUAGE plpgsql;

    -- 2. SYNC: CORE SERVICE SUPPORT (TICKETING)
    PERFORM public.seed_universal_protocol('module_help_desk', 'Help Desk');
    PERFORM public.seed_universal_protocol('module_tickets', 'Tickets');
    PERFORM public.seed_universal_protocol('module_requisitions', 'Ticketing Requisitions');

    -- 3. SYNC: ASSETS & LOGISTICS
    PERFORM public.seed_universal_protocol('module_assets', 'Asset Registry');
    PERFORM public.seed_universal_protocol('module_asset_types', 'Asset Categories');
    PERFORM public.seed_universal_protocol('module_asset_brands', 'Asset Brands');
    PERFORM public.seed_universal_protocol('module_asset_models', 'Asset Models');
    PERFORM public.seed_universal_protocol('module_asset_purchases', 'Asset Procurement');
    PERFORM public.seed_universal_protocol('module_asset_requisitions', 'Asset Requisitions');

    -- 4. HYDRATE ADMIN ROLES (SAFE VERSION)
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
    DROP FUNCTION IF EXISTS public.seed_universal_protocol(TEXT, TEXT);

END $$;
