-- v163_fix_admin_auth_logic.sql
-- Description: Updates is_admin_safe_v2 to recognize users assigned via the new Role-Based system.

CREATE OR REPLACE FUNCTION public.is_admin_safe_v2(u_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_is_legacy_admin boolean;
    v_has_admin_role boolean;
BEGIN
    -- 1. Check legacy profiles.role column
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = u_id 
        AND regexp_replace(LOWER(role::text), '[^a-z0-9]+', '_', 'g') IN ('super_admin', 'dept_admin')
    ) INTO v_is_legacy_admin;

    IF v_is_legacy_admin THEN
        RETURN true;
    END IF;

    -- 2. Check the new user_roles mapping for Admin-level protocol groups
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = u_id
        AND (
            LOWER(r.name) LIKE '%admin%' 
            OR LOWER(r.name) LIKE '%manager%'
            OR r.is_system_role = true -- System roles are usually admin-level in this context
        )
    ) INTO v_has_admin_role;

    RETURN v_has_admin_role;
END;
$$;

-- Force PostgREST to recognize the logic update
NOTIFY pgrst, 'reload schema';
