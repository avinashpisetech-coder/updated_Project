-- v165_universal_rbac_rpc.sql
-- Description: Centralized RPC for resolving user permissions through their roles.

BEGIN;

-- 1. Ensure all systemic nodes are registered as identifying modules
DO $$
BEGIN
    PERFORM public.ensure_crud_permissions('module_dashboard', 'Executive Dashboard');
    PERFORM public.ensure_crud_permissions('module_intelligence_hub', 'Intelligence Hub');
    PERFORM public.ensure_crud_permissions('module_reports', 'Analytical Reports');
    PERFORM public.ensure_crud_permissions('module_mail', 'Mail Protocol');
    PERFORM public.ensure_crud_permissions('module_themes', 'System Settings & Themes');
    PERFORM public.ensure_crud_permissions('module_users_master', 'User Directory');
    PERFORM public.ensure_crud_permissions('module_erp_masters', 'ERP Systems Master');
    PERFORM public.ensure_crud_permissions('module_help_desk_master', 'Help Desk Master');
    PERFORM public.ensure_crud_permissions('module_organizations', 'Organizational Entities');
    PERFORM public.ensure_crud_permissions('module_access_control', 'Security & Access Control');
    PERFORM public.ensure_crud_permissions('module_assets', 'Asset Inventory');
    PERFORM public.ensure_crud_permissions('module_help_desk', 'Ticketing Queue');
END $$;

-- 2. Create the flattened permission resolver RPC
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
RETURNS TABLE (
    resource text,
    action text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.resource,
        p.action
    FROM public.permissions p
    JOIN public.role_permissions rp ON rp.permission_id = p.id
    JOIN public.user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id;
END;
$$;

-- 3. Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_permissions(uuid) TO authenticated;

COMMIT;
