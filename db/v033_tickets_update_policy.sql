-- v033_tickets_update_policy.sql
-- Adds RLS update policy for tickets so authorized agent/admin roles can assign/update status.

-- Drop stale policy names if they exist from prior experiments
DROP POLICY IF EXISTS "Allow update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow authorized update tickets" ON public.tickets;

-- Agent/admin update policy:
-- - super_admin can update all
-- - dept_admin can update tickets within their department scope
-- - module_agent can update tickets for modules where they have view or update access
-- Uses SECURITY DEFINER functions to avoid RLS recursion issues
CREATE POLICY "Allow authorized update tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_dept_admin()
      AND (
        requester_id = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
        OR assigned_to_id = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.profile_module_access pma
      WHERE pma.profile_id = auth.uid()
        AND pma.module_id = tickets.module_id
        AND (pma.can_view = true OR pma.can_update = true)
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_dept_admin()
      AND (
        requester_id = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
        OR assigned_to_id = ANY(SELECT public.get_dept_member_ids(public.user_department_id()))
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.profile_module_access pma
      WHERE pma.profile_id = auth.uid()
        AND pma.module_id = tickets.module_id
        AND (pma.can_view = true OR pma.can_update = true)
    )
  );
