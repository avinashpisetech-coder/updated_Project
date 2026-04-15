-- v164_system_node_permissions.sql
-- Description: Seed CRUD permissions for Systemic Application Nodes to enable granular RBAC.

BEGIN;

DO $$
BEGIN
    -- 1. Dashboard
    PERFORM public.ensure_crud_permissions('module_dashboard', 'Executive Dashboard');

    -- 2. Intelligence Hub
    PERFORM public.ensure_crud_permissions('module_intelligence_hub', 'Intelligence Hub Analytics');

    -- 3. Analytical Reports
    PERFORM public.ensure_crud_permissions('module_reports', 'Analytical Reports');

    -- 4. Mail Protocol
    PERFORM public.ensure_crud_permissions('module_mail', 'Mail Infrastructure');

    -- 5. Settings & Themes
    PERFORM public.ensure_crud_permissions('module_themes', 'System Settings & Themes');

    -- 6. Ticketing (ensure comprehensive coverage) - slug is 'help-desk' in DB
    PERFORM public.ensure_crud_permissions('module_help_desk', 'Ticketing Support Module');
END $$;

COMMIT;
