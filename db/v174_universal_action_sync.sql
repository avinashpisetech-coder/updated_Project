/**
 * v174_universal_action_sync.sql
 * GOAL: Populate the governance matrix with granular actions for all modules.
 * This resolves the "Empty Selection" issue and ensures Tickets/Assets parity.
 * It ensures every module has View, Create, Update, and Delete available in the UI.
 */

BEGIN;

-- 1. Create a helper for bulk action seeding
CREATE OR REPLACE FUNCTION public.seed_module_actions(p_resource text, p_name text) RETURNS void AS $$
BEGIN
    INSERT INTO public.permissions (resource, action, name) VALUES
    (p_resource, 'read', 'View ' || p_name),
    (p_resource, 'create', 'Create ' || p_name),
    (p_resource, 'update', 'Edit ' || p_name),
    (p_resource, 'delete', 'Delete ' || p_name)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 2. SEED ACTIONS FOR ALL NODES (Ticketing & Assets Parity)
-- Administration
SELECT public.seed_module_actions('module_users_master', 'Users');
SELECT public.seed_module_actions('module_erp_masters', 'ERP Masters');
SELECT public.seed_module_actions('module_help_desk_master', 'Help Desk Config');
SELECT public.seed_module_actions('module_organizations', 'Organizations');
SELECT public.seed_module_actions('module_access_control', 'Security & Access');

-- Logistics (Assets)
SELECT public.seed_module_actions('module_assets', 'Asset Registry');
SELECT public.seed_module_actions('module_asset_types', 'Asset Categories');
SELECT public.seed_module_actions('module_asset_brands', 'Asset Brands');
SELECT public.seed_module_actions('module_asset_models', 'Asset Models');

-- Technical Hub
SELECT public.seed_module_actions('module_dashboard', 'Executive Dashboard');
SELECT public.seed_module_actions('module_intelligence_hub', 'Intelligence Hub');
SELECT public.seed_module_actions('module_reports', 'Analytical Reports');
SELECT public.seed_module_actions('module_mail', 'Mail Infrastructure');
SELECT public.seed_module_actions('module_themes', 'Settings & Themes');

-- 3. HYDRATE SUPER ADMIN (Auto-grant all newly created actions)
DO $$
DECLARE
    v_super_admin_id uuid;
BEGIN
    SELECT id INTO v_super_admin_id FROM public.roles WHERE UPPER(name) = 'SUPER ADMIN' OR name = 'Super Admin' LIMIT 1;

    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM public.permissions
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

DROP FUNCTION public.seed_module_actions(text, text);

COMMIT;
