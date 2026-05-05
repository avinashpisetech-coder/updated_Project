-- v031_ticket_notifications_and_sla.sql
-- Phase 2A: Notifications table, SLA age function, assignment trigger,
--           resolved-notify trigger, approve-close / re-open helpers.
-- Run after v030_ticket_meeting_scheduling.sql

-- ─────────────────────────────────────────────
-- 1. ticket_notifications table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  ticket_id   uuid                 REFERENCES tickets(id)   ON DELETE SET NULL,
  message     text        NOT NULL,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tn_user_unread
  ON ticket_notifications (user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_tn_ticket
  ON ticket_notifications (ticket_id);

ALTER TABLE ticket_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "tn_select_own" ON ticket_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Any authenticated session (triggers run as SECURITY DEFINER) may insert
CREATE POLICY "tn_insert_system" ON ticket_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can mark only their own notifications as read
CREATE POLICY "tn_update_own" ON ticket_notifications
  FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- 2. ticket_logs convenience view
--    Mirrors ticket_activity_log with readable column aliases
--    (ticket_activity_log is the source of truth — no data duplication)
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW ticket_logs AS
SELECT
  id,
  ticket_id,
  actor_id,
  activity_type         AS log_type,
  content               AS description,
  old_value,
  new_value,
  is_internal,
  created_at
FROM ticket_activity_log
WHERE activity_type IN ('status_change', 'assignment')
ORDER BY created_at DESC;

-- ─────────────────────────────────────────────
-- 3. Helper: fetch unread notifications for a user
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_unread_notifications(p_user_id uuid)
RETURNS SETOF ticket_notifications
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM   ticket_notifications
  WHERE  user_id  = p_user_id
    AND  is_read  = false
  ORDER  BY created_at DESC;
$$;

-- ─────────────────────────────────────────────
-- 4. Helper: SLA age display for a ticket
--    Returns display_text ("X Days, Y Hours, Z Minutes"),
--    total_minutes, is_overdue (> 48 h), sla_flag ("overdue"|"new"|"normal")
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ticket_age_display(p_ticket_id uuid)
RETURNS TABLE (
  display_text   text,
  total_minutes  bigint,
  is_overdue     boolean,
  is_resolved    boolean,
  sla_flag       text      -- 'overdue' | 'new' | 'normal' | 'resolved'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_at  timestamptz;
  v_resolved_at timestamptz;
  v_status      ticket_status;
  v_diff        interval;
  v_days        bigint;
  v_hours       bigint;
  v_mins        bigint;
  v_total_mins  bigint;
BEGIN
  SELECT created_at, resolved_at, status
  INTO   v_created_at, v_resolved_at, v_status
  FROM   tickets
  WHERE  id = p_ticket_id;

  -- Clock stops when resolved or closed
  IF v_status IN ('resolved', 'closed') THEN
    v_diff      := COALESCE(v_resolved_at, now()) - v_created_at;
    is_resolved := true;
    sla_flag    := 'resolved';
  ELSE
    v_diff      := now() - v_created_at;
    is_resolved := false;
  END IF;

  v_days       := EXTRACT(DAY    FROM v_diff)::bigint;
  v_hours      := EXTRACT(HOUR   FROM v_diff)::bigint;
  v_mins       := EXTRACT(MINUTE FROM v_diff)::bigint;
  v_total_mins := (EXTRACT(EPOCH FROM v_diff) / 60)::bigint;

  display_text  := v_days  || ' Days, '
                || v_hours || ' Hours, '
                || v_mins  || ' Minutes';
  total_minutes := v_total_mins;
  is_overdue    := (v_total_mins >  2880 AND NOT is_resolved); -- > 48 h

  IF NOT is_resolved THEN
    IF    v_total_mins > 2880 THEN sla_flag := 'overdue';   -- > 48 h → Red
    ELSIF v_total_mins < 1440 THEN sla_flag := 'new';       -- < 24 h → Green
    ELSE                           sla_flag := 'normal';
    END IF;
  END IF;

  RETURN NEXT;
END;
$$;

-- ─────────────────────────────────────────────
-- 5. Trigger: on assignment → set status = 'assigned' + notify assignee
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_ticket_assignment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when assigned_to_id actually changes to a non-null value
  IF (NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id)
     AND NEW.assigned_to_id IS NOT NULL
  THEN
    -- Auto-advance status to 'assigned' if still 'new'
    IF NEW.status = 'new' THEN
      NEW.status := 'assigned';
    END IF;

    -- Notification row for the assignee
    INSERT INTO ticket_notifications (user_id, ticket_id, message)
    VALUES (
      NEW.assigned_to_id,
      NEW.id,
      'You have been assigned ticket ' || NEW.ticket_number || ': ' || NEW.subject
    )
    ON CONFLICT DO NOTHING;

    -- Activity log entry
    INSERT INTO ticket_activity_log
      (ticket_id, actor_id, activity_type, content, old_value, new_value)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.assigned_to_id),
      'assignment',
      'Ticket assigned',
      OLD.assigned_to_id::text,
      NEW.assigned_to_id::text
    );

    -- Simulated email trigger: logged as internal note
    -- (Replace with real Resend call via Edge Function in P2/P3)
    INSERT INTO ticket_activity_log
      (ticket_id, actor_id, activity_type, content, is_internal)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.assigned_to_id),
      'internal_note',
      '[EMAIL TRIGGER] Assignment notification dispatched to assignee (simulate)',
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_assignment_notify ON tickets;
CREATE TRIGGER trg_ticket_assignment_notify
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_ticket_assignment_notify();

-- ─────────────────────────────────────────────
-- 6. Trigger: on status → 'resolved' → set resolved_at + notify requester
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_ticket_resolved_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved' AND (OLD.status IS DISTINCT FROM 'resolved') THEN
    -- Stamp resolved_at
    IF NEW.resolved_at IS NULL THEN
      NEW.resolved_at := now();
    END IF;

    -- Notify requester: they must approve closing or re-open
    INSERT INTO ticket_notifications (user_id, ticket_id, message)
    VALUES (
      NEW.requester_id,
      NEW.id,
      'Ticket ' || NEW.ticket_number
        || ' has been marked Resolved. Please Approve Closing or Re-open if the issue persists.'
    )
    ON CONFLICT DO NOTHING;

    -- Activity log
    INSERT INTO ticket_activity_log
      (ticket_id, actor_id, activity_type, content, old_value, new_value)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.requester_id),
      'status_change',
      'Ticket resolved by agent',
      OLD.status::text,
      'resolved'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_resolved_notify ON tickets;
CREATE TRIGGER trg_ticket_resolved_notify
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_ticket_resolved_notify();

-- ─────────────────────────────────────────────
-- 7. Trigger: on status → 'closed' → clear resolved_at guard (no re-resolve)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_fn_ticket_closed_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN
    INSERT INTO ticket_activity_log
      (ticket_id, actor_id, activity_type, content, old_value, new_value)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.requester_id),
      'status_change',
      'Ticket closed (requester approved)',
      OLD.status::text,
      'closed'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_closed_log ON tickets;
CREATE TRIGGER trg_ticket_closed_log
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_ticket_closed_log();
