-- Add session management columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_session_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Create a function to update last activity
CREATE OR REPLACE FUNCTION update_last_activity(user_id UUID, session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET last_activity_at = now(),
      current_session_id = session_id
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
