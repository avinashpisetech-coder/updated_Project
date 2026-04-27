-- v191_notification_refinement.sql
-- 1. Add task_id to ticket_notifications for general events
ALTER TABLE ticket_notifications ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;

-- 2. Ensure Realtime is enabled for ticket_notifications
ALTER TABLE ticket_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Check if already added to avoid error
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'ticket_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE ticket_notifications;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
