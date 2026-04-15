-- v156_seed_asset_management_modules.sql
-- Description: Seed the modules table with Asset Management modules to enable granular RBAC.

BEGIN;

INSERT INTO public.modules (name, slug) VALUES
('Asset Registry', 'asset_inventory'),
('Asset Deployment', 'asset_deployment'),
('Direct Handover', 'asset_handover'),
('Asset Recovery', 'asset_return'),
('Asset Maintenance', 'asset_maintenance'),
('Asset Disposal', 'asset_disposal'),
('Software SAM', 'asset_software'),
('Asset Requisitions', 'asset_requisitions'),
('Asset Procurement', 'asset_purchases')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

COMMIT;
