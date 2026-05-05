-- v210_unified_hierarchical_scoping.sql
-- Description: Implement enterprise hierarchical scoping for data visibility.
-- Hierarchy: End User/Agent (Own only) >> Dept Admin (Dept broad) >> Super Admin (Global)
-- Fix: tickets.department_id does not exist; dept is on the requester's profile.

BEGIN;

-- 1. Create a helper function to get the current user's visibility scope
CREATE OR REPLACE FUNCTION public.get_current_user_scope()
RETURNS TABLE (
    scope_level text, -- 'GLOBAL', 'DEPARTMENT', 'OWN'
    dept_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role text;
    v_dept uuid;
BEGIN
    SELECT role::text, department_id INTO v_role, v_dept
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role = 'super_admin' THEN
        RETURN QUERY SELECT 'GLOBAL'::text, NULL::uuid;
    ELSIF v_role = 'dept_admin' THEN
        RETURN QUERY SELECT 'DEPARTMENT'::text, v_dept;
    ELSE
        RETURN QUERY SELECT 'OWN'::text, v_dept;
    END IF;
END;
$$;

-- 2. Update Ticket RLS to respect Hierarchy
-- Note: tickets has no department_id column. Department is resolved via the
-- requester's profile (profiles.department_id). We join through profiles.
DROP POLICY IF EXISTS "Tickets visibility policy" ON public.tickets;
DROP POLICY IF EXISTS "Tickets hierarchical visibility" ON public.tickets;

CREATE POLICY "Tickets hierarchical visibility" ON public.tickets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_scope() s
            WHERE s.scope_level = 'GLOBAL'
            OR (
                s.scope_level = 'DEPARTMENT'
                AND EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = tickets.requester_id
                    AND p.department_id = s.dept_id
                )
            )
            OR (
                s.scope_level = 'OWN'
                AND (
                    tickets.requester_id = auth.uid()
                    OR tickets.assigned_to_id = auth.uid()
                    OR tickets.created_by_id = auth.uid()
                    OR tickets.affected_person_id = auth.uid()
                )
            )
        )
    );

-- 3. Update Asset RLS to respect Hierarchy
-- assets.department_id exists (set on asset inward), so this is straightforward.
DROP POLICY IF EXISTS "Assets visibility policy" ON public.assets;
DROP POLICY IF EXISTS "Assets hierarchical visibility" ON public.assets;

CREATE POLICY "Assets hierarchical visibility" ON public.assets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_scope() s
            WHERE s.scope_level = 'GLOBAL'
            OR (s.scope_level = 'DEPARTMENT' AND assets.department_id = s.dept_id)
            OR (s.scope_level = 'OWN' AND assets.current_holder_id = auth.uid())
        )
    );

COMMIT;
