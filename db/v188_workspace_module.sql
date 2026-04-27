-- v188_workspace_module.sql
-- Create Workspace tables, relationships, and RLS policies

-- Enums (Idempotent creation)
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, profile_id)
);

-- Workspace Projects (Renamed from projects to avoid conflict)
CREATE TABLE IF NOT EXISTS workspace_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES workspace_projects(id) ON DELETE CASCADE NOT NULL,
  ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL, -- Optional link to helpdesk tickets
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'TODO',
  priority task_priority NOT NULL DEFAULT 'LOW',
  start_date date,
  due_date date,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Assignees
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (task_id, profile_id)
);

-- Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Activity Logs
CREATE TABLE IF NOT EXISTS task_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL, -- e.g., 'task_created', 'status_changed'
  metadata jsonb,
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  file_name text NOT NULL,
  file_size int NOT NULL,
  content_type text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Task Tags (Master List per Workspace)
CREATE TABLE IF NOT EXISTS task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

-- Task Tag Links
CREATE TABLE IF NOT EXISTS task_tag_links (
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES task_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

-- Row Level Security (RLS)
-- Use DROP POLICY IF EXISTS before creating to ensure idempotence

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tag_links ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if user is in workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = ws_id AND profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = ws_id AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for Workspaces
DROP POLICY IF EXISTS "Allow read workspaces for members" ON workspaces;
CREATE POLICY "Allow read workspaces for members" ON workspaces
  FOR SELECT TO authenticated 
  USING (is_workspace_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Allow insert workspaces" ON workspaces;
CREATE POLICY "Allow insert workspaces" ON workspaces
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

-- Policies for Workspace Members
DROP POLICY IF EXISTS "Allow read workspace members" ON workspace_members;
CREATE POLICY "Allow read workspace members" ON workspace_members
  FOR SELECT TO authenticated 
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Allow insert workspace members" ON workspace_members;
CREATE POLICY "Allow insert workspace members" ON workspace_members
  FOR INSERT TO authenticated 
  WITH CHECK (
    is_workspace_member(workspace_id) OR 
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND created_by = auth.uid())
  );

-- Policies for Projects
DROP POLICY IF EXISTS "Allow read projects" ON workspace_projects;
CREATE POLICY "Allow read projects" ON workspace_projects
  FOR SELECT TO authenticated 
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Allow insert projects" ON workspace_projects;
CREATE POLICY "Allow insert projects" ON workspace_projects
  FOR INSERT TO authenticated 
  WITH CHECK (is_workspace_member(workspace_id));

-- Policies for Tasks
DROP POLICY IF EXISTS "Allow read tasks" ON tasks;
CREATE POLICY "Allow read tasks" ON tasks
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM workspace_projects WHERE workspace_projects.id = tasks.project_id AND is_workspace_member(workspace_projects.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Allow insert tasks" ON tasks;
CREATE POLICY "Allow insert tasks" ON tasks
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_projects WHERE workspace_projects.id = project_id AND is_workspace_member(workspace_projects.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Allow update tasks" ON tasks;
CREATE POLICY "Allow update tasks" ON tasks
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM workspace_projects WHERE workspace_projects.id = tasks.project_id AND is_workspace_member(workspace_projects.workspace_id)
    )
  );

-- Policies for Comments
DROP POLICY IF EXISTS "Allow read task comments" ON task_comments;
CREATE POLICY "Allow read task comments" ON task_comments
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM tasks JOIN workspace_projects ON tasks.project_id = workspace_projects.id 
      WHERE tasks.id = task_comments.task_id AND is_workspace_member(workspace_projects.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Allow insert task comments" ON task_comments;
CREATE POLICY "Allow insert task comments" ON task_comments
  FOR INSERT TO authenticated 
  WITH CHECK (profile_id = auth.uid());

-- Realtime Configuration
-- Enable replica identity for realtime features on necessary tables
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE task_comments REPLICA IDENTITY FULL;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activity_logs;
