-- v022_backfill_ticket_activity_log.sql
-- Backfill creation activity for existing tickets that do not have an "Added ticket" entry.
-- Idempotent: safe to run multiple times.

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
  COALESCE(t.created_by_id, t.requester_id) AS actor_id,
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
    AND l.content = 'Added ticket'
);
