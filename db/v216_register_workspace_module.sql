-- v216_register_workspace_module.sql
-- Description: Register the workspace module in the systemic registry
-- and ensure its CRUD permissions are available for the RBAC matrix.

BEGIN;

-- 1. Register Module
INSERT INTO public.modules (name, slug, icon, color, assignment_mode, is_active)
VALUES ('Workspace & Tasks', 'workspace', 'layout-dashboard', '#3b82f6', 'admin_only', true)
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- 2. Ensure CRUD permissions exist for 'module_workspace'
-- The trigger trg_modules_after_insert_auto_access should handle this,
-- but we'll do it explicitly for safety since the trigger might have been added later.
DO $$ 
BEGIN
    PERFORM public.ensure_crud_permissions('module_workspace', 'Workspace & Tasks module');
    PERFORM public.ensure_crud_permissions('workspace', 'Workspace & Tasks');
END $$;

-- 3. Backfill profile access rows (optional but keeps matrix clean)
DO $$
BEGIN
    PERFORM public.seed_profile_access_for_module((SELECT id FROM public.modules WHERE slug = 'workspace'));
END $$;

COMMIT;
