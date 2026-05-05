-- v207_governance_audit.sql
-- Description: Implement security audit logging for role and permission modifications.

BEGIN;

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id        uuid REFERENCES public.profiles(id),
    target_user_id  uuid REFERENCES public.profiles(id),
    action_type     text NOT NULL, -- 'ROLE_CHANGE', 'PERMISSION_CHANGE', 'DEPT_CHANGE'
    resource_type   text NOT NULL, -- 'PROFILES', 'ROLE_PERMISSIONS'
    old_value       jsonb,
    new_value       jsonb,
    ip_address      text,
    user_agent      text,
    created_at      timestamptz DEFAULT now()
);

-- Index for security review
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON public.security_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_target ON public.security_audit_logs(target_user_id);

-- RLS: Only Super Admins can read security logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only super_admins can view security audit logs" ON public.security_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.role::text = 'super_admin'
        )
    );

-- Trigger Function for Profile Changes (Role/Dept)
CREATE OR REPLACE FUNCTION public.trg_fn_audit_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) THEN
        INSERT INTO public.security_audit_logs (actor_id, target_user_id, action_type, resource_type, old_value, new_value)
        VALUES (auth.uid(), NEW.id, 'ROLE_CHANGE', 'PROFILES', jsonb_build_object('role', OLD.role), jsonb_build_object('role', NEW.role));
    END IF;

    IF (OLD.department_id IS DISTINCT FROM NEW.department_id) THEN
        INSERT INTO public.security_audit_logs (actor_id, target_user_id, action_type, resource_type, old_value, new_value)
        VALUES (auth.uid(), NEW.id, 'DEPT_CHANGE', 'PROFILES', jsonb_build_object('dept', OLD.department_id), jsonb_build_object('dept', NEW.department_id));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_profile_security
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_audit_profile_changes();

COMMIT;
