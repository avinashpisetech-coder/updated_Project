-- v065_fix_assignment_trigger_insert.sql
-- Description: Fixes the assignment trigger to fire on INSERT as well as UPDATE.
-- This ensures that when a ticket is created with an assignee already set,
-- the notification row is correctly created and the status is set to 'assigned'.

-- Drop existing trigger to recreate it with INSERT
DROP TRIGGER IF EXISTS trg_ticket_assignment_notify ON public.tickets;

CREATE TRIGGER trg_ticket_assignment_notify
  BEFORE INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_ticket_assignment_notify();
