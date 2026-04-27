-- v190_task_notifications.sql
-- Create table for in-app task notifications

CREATE TABLE IF NOT EXISTS task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow users to read their own notifications" ON task_notifications;
CREATE POLICY "Allow users to read their own notifications" ON task_notifications
  FOR SELECT TO authenticated 
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Allow system to insert notifications" ON task_notifications;
CREATE POLICY "Allow system to insert notifications" ON task_notifications
  FOR INSERT TO authenticated 
  WITH CHECK (true); -- Ideally restricted, but for simplicity in server actions

DROP POLICY IF EXISTS "Allow users to update their own notifications" ON task_notifications;
CREATE POLICY "Allow users to update their own notifications" ON task_notifications
  FOR UPDATE TO authenticated 
  USING (profile_id = auth.uid());

-- Enable Realtime
ALTER TABLE task_notifications REPLICA IDENTITY FULL;

-- Add to Realtime Publication if not already there
-- (Assuming supabase_realtime publication exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE task_notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
