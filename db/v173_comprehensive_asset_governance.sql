/**
 * v173_comprehensive_asset_governance.sql
 * GOAL: Achieve total parity between Ticketing and Assets in the RBAC matrix.
 * This ensures Asset Masters are treated exactly like Help Desk Masters in the governance matrix.
 */

BEGIN;

-- 1. SEED ASSET MASTER PROTOCOLS
INSERT INTO public.permissions (resource, action, name) VALUES
('module_asset_types', 'read', 'View Asset Categories'),
('module_asset_types', 'manage', 'Manage Asset Categories'),
('module_asset_brands', 'read', 'View Asset Brands'),
('module_asset_brands', 'manage', 'Manage Asset Brands'),
('module_asset_models', 'read', 'View Asset Models'),
('module_asset_models', 'manage', 'Manage Asset Models'),
('module_assets', 'create', 'Ingest Assets'),
('module_assets', 'update', 'Modify Assets'),
('module_assets', 'delete', 'Retire Assets')
ON CONFLICT DO NOTHING;

-- 2. HYDRATE GOVERNANCE ROLES
DO $$
DECLARE
    v_super_admin_id uuid;
BEGIN
    SELECT id INTO v_super_admin_id FROM public.roles WHERE UPPER(name) = 'SUPER ADMIN' OR name = 'Super Admin' LIMIT 1;

    -- Grant the new Asset Master protocols to the Super Admin
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM public.permissions 
        WHERE resource IN ('module_asset_types', 'module_asset_brands', 'module_asset_models', 'module_assets')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

COMMIT;
