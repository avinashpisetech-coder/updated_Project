-- v023_ticket_activity_trigger.sql
-- Adds a DB-level trigger that automatically inserts a ticket_activity_log row
-- whenever a ticket is created.  This is the authoritative mechanism; the
-- application code in tickets/actions.ts acts as a secondary safety net.
--
-- Also backfills any tickets that have no activity log entry at all.
-- Idempotent: safe to run multiple times.

-- ────────────────────────────────────────────────────────────────────────────
-- 1.  Trigger function
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.on_ticket_created_log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as the function owner, bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Only insert if no activity for this ticket already exists to keep
  -- things idempotent if the trigger is re-fired somehow.
  IF NOT EXISTS (
    SELECT 1
    FROM public.ticket_activity_log
    WHERE ticket_id = NEW.id
      AND content   = 'Added ticket'
  ) THEN
    INSERT INTO public.ticket_activity_log (
      ticket_id,
      actor_id,
      activity_type,
      content,
      new_value,
      is_internal,
      created_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.created_by_id, NEW.requester_id),
      'status_change'::activity_type,
      'Added ticket',
      NEW.ticket_number,
      false,
      NEW.created_at
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never let an activity-log failure abort the ticket insert.
    RAISE WARNING 'ticket activity log trigger failed for ticket %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.  Attach the trigger (drop first so re-run is safe)
-- ────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_ticket_created_log_activity ON public.tickets;

CREATE TRIGGER trg_ticket_created_log_activity
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.on_ticket_created_log_activity();

-- ────────────────────────────────────────────────────────────────────────────
-- 3.  Back-fill: create an "Added ticket" entry for every ticket that has
--     no activity log rows at all (covers tickets created before this trigger
--     and before the v022 backfill).
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.ticket_activity_log (
  ticket_id,
  actor_id,
  activity_type,
  content,
  new_value,
  is_internal,
  created_at
)
SELECT
  t.id,
  COALESCE(t.created_by_id, t.requester_id),
  'status_change'::activity_type,
  'Added ticket',
  t.ticket_number,
  false,
  t.created_at
FROM public.tickets t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.ticket_activity_log l
  WHERE l.ticket_id = t.id
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4.  Grant execute on the trigger function to authenticated users
--     (needed on some Supabase projects)
-- ────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.on_ticket_created_log_activity() TO authenticated;
