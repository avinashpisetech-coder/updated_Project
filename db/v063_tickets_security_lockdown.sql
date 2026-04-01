-- v063_tickets_security_lockdown.sql
-- Description: Implement a strict "Private-By-Default" security model.
-- Only Admins (Super/Dept) and involved parties (Requester/Assignee/Team)
-- can see tickets and their associated data.

-- 1. High-Performance Admin Check (Bypasses RLS recursively via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Checks if current user is either a "super_admin" or "dept_admin"
  SELECT COALESCE(
    (SELECT regexp_replace(LOWER(role::text), '[^a-z0-9]+', '_', 'g') IN ('super_admin', 'dept_admin') 
     FROM public.profiles WHERE id = auth.uid()), 
    false
  );
$$;

-- 2. PURGE: Remove all existing broad/conflicting read policies for tickets
DROP POLICY IF EXISTS "Allow read all non-confidential tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow read own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow module_agent read tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow super_admin read all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow agents read assigned tickets" ON public.tickets;

-- 3. LOCKDOWN: Implement the unified "Admin or Involved" visibility policy
-- Note: Requesters, Creators, Assignees, Affected Persons, and Team Members are "Involved".
CREATE POLICY "Allow read tickets (Admin or Involved Only)"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_safe() -- Admin Pass
    OR auth.uid() = requester_id -- Requester
    OR auth.uid() = created_by_id -- Creator
    OR auth.uid() = assigned_to_id -- Assignee
    OR auth.uid() = affected_person_id -- Affected Person
    OR (metadata->'team_members') @> jsonb_build_array(auth.uid()::text) -- Team Member
  );

-- 4. PURGE & HARDEN: Sync auxiliary table visibility to identity ownership
-- Activity Log: Admin sees all. User sees ONLY their own actions OR public replies for their tickets.
DROP POLICY IF EXISTS "Allow read activity (Admin or Involved Only)" ON public.ticket_activity_log;
CREATE POLICY "Allow read activity (Identity Isolation)"
  ON public.ticket_activity_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_safe() -- Admin Pass
    OR actor_id = auth.uid() -- OWN ACTIONS (Identity Logic)
    OR (
      activity_type = 'public_reply' -- OR PUBLIC CONVERSATION
      AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_activity_log.ticket_id
        AND (
          t.requester_id = auth.uid()
          OR t.assigned_to_id = auth.uid()
          OR t.created_by_id = auth.uid()
          OR t.affected_person_id = auth.uid()
          OR (t.metadata->'team_members') @> jsonb_build_array(auth.uid()::text)
        )
      )
    )
  );

-- Profile Activity Log: Admin sees all. User sees ONLY their own actions.
DROP POLICY IF EXISTS "Allow read own or actor profile activity" ON public.profile_activity_log;
CREATE POLICY "Allow read profile activity (Identity Isolation)"
  ON public.profile_activity_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_safe()
    OR actor_id = auth.uid()
  );

-- Attachments: Admin sees all. User sees only for tickets they are involved in.
DROP POLICY IF EXISTS "Allow read attachments (Admin or Involved Only)" ON public.ticket_attachments;
CREATE POLICY "Allow read attachments (Identity Isolation)"
  ON public.ticket_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_safe()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
      AND (
        t.requester_id = auth.uid()
        OR t.assigned_to_id = auth.uid()
        OR t.created_by_id = auth.uid()
        OR t.affected_person_id = auth.uid()
        OR (t.metadata->'team_members') @> jsonb_build_array(auth.uid()::text)
      )
    )
  );

-- 5. Standard Update Policy
DROP POLICY IF EXISTS "Allow update own tickets" ON public.tickets;
CREATE POLICY "Allow manage tickets (Admin or Involved Only)"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_safe()
    OR auth.uid() = assigned_to_id
    OR auth.uid() = created_by_id
    OR (metadata->'team_members') @> jsonb_build_array(auth.uid()::text)
  )
  WITH CHECK (
    public.is_admin_safe()
    OR auth.uid() = assigned_to_id
    OR (metadata->'team_members') @> jsonb_build_array(auth.uid()::text)
  );
