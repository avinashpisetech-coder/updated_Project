-- v157_add_admin_asset_modules.sql
-- Description: Add Masters, Reports, and Settings modules for Assets to the RBAC system.

BEGIN;

-- 1. Insert administrative modules for Assets
INSERT INTO public.modules (name, slug) VALUES
('Asset Masters Hub', 'asset_masters'),
('Asset Reporting Matrix', 'asset_reports'),
('Asset Global Settings', 'asset_settings')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 2. Generate permissions for these modules (Read, Create, Update, Delete)
INSERT INTO public.permissions (name, resource, action, description)
SELECT 
    m.name || ' ' || initcap(a.action),
    'module_' || lower(m.slug),
    a.action,
    'Allows ' || a.action || ' on ' || m.name
FROM public.modules m, 
     (SELECT unnest(ARRAY['read', 'create', 'update', 'delete']) as action) a
WHERE m.slug IN ('asset_masters', 'asset_reports', 'asset_settings')
ON CONFLICT (name) DO NOTHING;

COMMIT;
