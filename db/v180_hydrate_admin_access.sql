-- ============================================================================
-- V180: FORCE ADMIN HYDRATION (HOTFIX)
-- ============================================================================
-- Guarantees that the Super Admin role receives access to the newly aligned 
-- Boolean protocols (including access_control).

DO $$
BEGIN
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM public.roles r
    CROSS JOIN public.permissions p
    WHERE (r.name = 'Super Admin' OR r.name = 'IT Admin')
    AND p.resource IN (
        'access_control', 
        'users_master', 
        'organizations', 
        'help_desk_master', 
        'tickets', 
        'help-desk', 
        'requisitions', 
        'service-desk', 
        'support-queue', 
        'dashboard', 
        'intelligence_hub', 
        'reports', 
        'mail', 
        'themes'
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );
END $$;
