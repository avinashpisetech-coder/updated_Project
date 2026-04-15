/**
 * v175_comprehensive_asset_matrix_seed.sql
 * DEFINITIVE RESOLUTION: Seeding all ITAM protocols to ensure total parity with Ticketing.
 * This ensures every ITAM node is represented in the governance matrix.
 */

BEGIN;

-- 1. Create a helper for bulk action seeding
CREATE OR REPLACE FUNCTION public.seed_module_actions(p_resource text, p_name text) RETURNS void AS $$
BEGIN
    INSERT INTO public.permissions (resource, action, name) VALUES
    (p_resource, 'read', 'View ' || p_name),
    (p_resource, 'create', 'Create ' || p_name),
    (p_resource, 'update', 'Edit ' || p_name),
    (p_resource, 'delete', 'Delete ' || p_name),
    (p_resource, 'manage', 'Administrative ' || p_name)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 2. SEED EXTENDED ASSET VERTICALS
SELECT public.seed_module_actions('module_assets', 'Asset Registry');
SELECT public.seed_module_actions('module_asset_types', 'Asset Categories');
SELECT public.seed_module_actions('module_asset_brands', 'Asset Brands');
SELECT public.seed_module_actions('module_asset_models', 'Asset Models');
SELECT public.seed_module_actions('module_asset_purchases', 'Purchase Orders & GRN');
SELECT public.seed_module_actions('module_asset_requisitions', 'Asset Requisitions');
SELECT public.seed_module_actions('module_software_compliance', 'Software Assets (SAM)');

-- 3. HYDRATE SUPER ADMIN (Grant full ITAM sovereignty)
DO $$
DECLARE
    v_super_admin_id uuid;
BEGIN
    SELECT id INTO v_super_admin_id FROM public.roles WHERE UPPER(name) = 'SUPER ADMIN' OR name = 'Super Admin' LIMIT 1;
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM public.permissions
        WHERE resource LIKE 'module_asset%' OR resource = 'module_software_compliance'
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

DROP FUNCTION public.seed_module_actions(text, text);

COMMIT;
