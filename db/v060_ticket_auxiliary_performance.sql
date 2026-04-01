-- v060_ticket_auxiliary_performance.sql
-- Description: Applies the "Early-Exit" rule to all auxiliary ticket tables.
-- This ensures that your Super Admin role gets instant response times for 
-- activities, attachments, and meetings.

-- 1. Ticket Attachments
DROP POLICY IF EXISTS "Allow read attachments" ON public.ticket_attachments;
CREATE POLICY "Allow admin read attachments"
ON public.ticket_attachments
FOR SELECT
TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_attachments.ticket_id
    AND (t.requester_id = auth.uid() OR t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
  )
);

-- 2. Ticket Meetings
ALTER TABLE public.ticket_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read meetings" ON public.ticket_meetings;
CREATE POLICY "Allow admin read meetings"
ON public.ticket_meetings
FOR SELECT
TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_meetings.ticket_id
    AND (t.requester_id = auth.uid() OR t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
  )
);

-- 3. Ticket Watchers
DROP POLICY IF EXISTS "Allow read watchers" ON public.ticket_watchers;
CREATE POLICY "Allow admin read watchers"
ON public.ticket_watchers
FOR SELECT
TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_watchers.ticket_id
    AND (t.requester_id = auth.uid() OR t.assigned_to_id = auth.uid())
  )
);

-- 4. Ticket Chat Messages
DROP POLICY IF EXISTS "Allow read chat" ON public.ticket_chat_messages;
CREATE POLICY "Allow admin read chat"
ON public.ticket_chat_messages
FOR SELECT
TO authenticated
USING (
  public.is_super_admin_safe()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_chat_messages.ticket_id
    AND (t.requester_id = auth.uid() OR t.assigned_to_id = auth.uid() OR t.created_by_id = auth.uid())
  )
);
