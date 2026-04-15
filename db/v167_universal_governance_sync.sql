/**
 * v167_universal_governance_sync.sql
 * RESTORES: Sidebar visibility and operational protocols.
 * DYNAMIC: Uses role metadata (is_system_role) instead of hardcoded names.
 */

BEGIN;

-- 1. IDENTIFY & HYDRATE: System-Level Roles
-- Automatically grants all new protocols (Tickets, Assets, Masters) to 
-- any role designated as a core System Role.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.is_system_role = true
ON CONFLICT DO NOTHING;

-- 2. CALIBRATE: Professional Operational Tiers
-- Grants specialized access to roles with 'Admin' or 'Agent' in their description.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE (r.name ILIKE '%Admin%' OR r.description ILIKE '%Support%')
  AND p.resource IN ('module_help_desk', 'module_assets', 'module_dashboard', 'module_intelligence_hub', 'module_reports')
ON CONFLICT DO NOTHING;

COMMIT;
