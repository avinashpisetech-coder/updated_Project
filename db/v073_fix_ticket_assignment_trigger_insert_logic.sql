-- v073_fix_ticket_assignment_trigger_insert_logic.sql
-- Description: Fixes the FK violation caused by BEFORE INSERT triggers on the tickets table.
-- It splits the trigger to ensure status updates happen BEFORE update, 
-- but logs and notifications happen AFTER insert/update to satisfy foreign keys.

-- 1. Refine the trigger function to handle TG_OP (Trigger Operation)
CREATE OR REPLACE FUNCTION public.trg_fn_ticket_assignment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Determine if we should process assignment logic
  IF (TG_OP = 'INSERT' AND NEW.assigned_to_id IS NOT NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id AND NEW.assigned_to_id IS NOT NULL)
  THEN
    -- 1. Status Advancement (Only possible in BEFORE triggers, i.e., UPDATE)
    IF TG_OP = 'UPDATE' AND NEW.status = 'new' THEN
      NEW.status := 'assigned';
    END IF;

    -- 2. Side-effects (Notifications and Logging)
    -- In an AFTER INSERT trigger, the ticket row already exists, so FKs in activity_log will pass.
    IF (TG_OP = 'AFTER' OR (TG_OP = 'UPDATE' AND NEW.id IS NOT NULL) OR (TG_OP = 'INSERT' AND NEW.id IS NOT NULL)) THEN
       -- Note: Standard practice for SIDE EFFECTS like logging is AFTER triggers.
       -- However, if we keep it in ONE function used by both, we must be careful.
       
       -- We will move the INSERT INTO log to a location where we are SURE the ticket exists.
       -- If this is a BEFORE INSERT trigger, this will fail.
       -- If this is an AFTER INSERT or BEFORE/AFTER UPDATE, it works.
       
       -- To be safe, we only perform the manual log insert IF we are not in a BEFORE INSERT state.
       IF NOT (TG_WHEN = 'BEFORE' AND TG_OP = 'INSERT') THEN
            -- Notification row for the assignee
            INSERT INTO public.ticket_notifications (user_id, ticket_id, message)
            VALUES (
              NEW.assigned_to_id,
              NEW.id,
              'You have been assigned ticket ' || NEW.ticket_number || ': ' || NEW.subject
            )
            ON CONFLICT DO NOTHING;

            -- Activity log entry
            INSERT INTO public.ticket_activity_log
              (ticket_id, actor_id, activity_type, content, old_value, new_value)
            VALUES (
              NEW.id,
              COALESCE(auth.uid(), NEW.assigned_to_id),
              'assignment',
              'Ticket assigned',
              CASE WHEN TG_OP = 'UPDATE' THEN OLD.assigned_to_id::text ELSE NULL END,
              NEW.assigned_to_id::text
            );
       END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Drop the problematic combined trigger
DROP TRIGGER IF EXISTS trg_ticket_assignment_notify ON public.tickets;

-- 3. Create the specialized triggers
-- Status change must be BEFORE UPDATE
CREATE TRIGGER trg_ticket_assignment_notify_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_ticket_assignment_notify();

-- Notifications and logging must be AFTER INSERT to satisfy FKs
CREATE TRIGGER trg_ticket_assignment_notify_insert
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_ticket_assignment_notify();
