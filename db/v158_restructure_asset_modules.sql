-- v158_restructure_asset_modules.sql
-- Description: Split Procurement and Requisitions into sub-modules for granular RBAC.

BEGIN;

-- 1. Register Sub-modules for Requisitions and Procurement
INSERT INTO public.modules (name, slug) VALUES
('Asset Requisitions - Requests', 'asset_requisitions_requests'),
('Asset Requisitions - Approvals', 'asset_requisitions_approvals'),
('Asset Requisitions - Tracking', 'asset_requisitions_tracking'),
('Purchase Orders (PO)', 'asset_procurement_po'),
('Goods Receipt Notes (GRN)', 'asset_procurement_grn')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 2. Generate permissions for all asset modules (covering new ones)
INSERT INTO public.permissions (name, resource, action, description)
SELECT 
    m.name || ' ' || initcap(a.action),
    'module_' || lower(m.slug),
    a.action,
    'Allows ' || a.action || ' on ' || m.name
FROM public.modules m, 
     (SELECT unnest(ARRAY['read', 'create', 'update', 'delete']) as action) a
WHERE m.slug LIKE 'asset_%'
ON CONFLICT (name) DO NOTHING;

COMMIT;
