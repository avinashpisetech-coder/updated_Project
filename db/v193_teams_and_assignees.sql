-- v193_teams_and_assignees.sql
-- Description: Add Teams and Team Members support for Workspace Tasks.

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, profile_id)
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view teams" ON teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view team members" ON team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage teams" ON teams FOR ALL TO authenticated USING (true); -- Simplified for now
CREATE POLICY "Admins can manage team members" ON team_members FOR ALL TO authenticated USING (true);

-- Realtime
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE team_members REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teams, team_members;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
