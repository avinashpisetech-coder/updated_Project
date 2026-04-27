-- v189_workspace_rls_fix.sql
-- Add missing UPDATE and DELETE policies for workspace-related tables

-- 1. Workspace Projects Policies
DROP POLICY IF EXISTS "Allow update projects" ON workspace_projects;
CREATE POLICY "Allow update projects" ON workspace_projects
  FOR UPDATE TO authenticated 
  USING (is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Allow delete projects" ON workspace_projects;
CREATE POLICY "Allow delete projects" ON workspace_projects
  FOR DELETE TO authenticated 
  USING (is_workspace_member(workspace_id));

-- 2. Workspaces Policies
DROP POLICY IF EXISTS "Allow update workspaces" ON workspaces;
CREATE POLICY "Allow update workspaces" ON workspaces
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Allow delete workspaces" ON workspaces;
CREATE POLICY "Allow delete workspaces" ON workspaces
  FOR DELETE TO authenticated 
  USING (created_by = auth.uid());

-- 3. Tasks Policies
DROP POLICY IF EXISTS "Allow delete tasks" ON tasks;
CREATE POLICY "Allow delete tasks" ON tasks
  FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM workspace_projects 
      WHERE workspace_projects.id = tasks.project_id 
      AND is_workspace_member(workspace_projects.workspace_id)
    )
  );

-- 4. Task Comments Policies
DROP POLICY IF EXISTS "Allow update task comments" ON task_comments;
CREATE POLICY "Allow update task comments" ON task_comments
  FOR UPDATE TO authenticated 
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Allow delete task comments" ON task_comments;
CREATE POLICY "Allow delete task comments" ON task_comments
  FOR DELETE TO authenticated 
  USING (profile_id = auth.uid());

-- 5. Task Checklists Policies (Adding if missing)
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read task checklists" ON task_checklists;
CREATE POLICY "Allow read task checklists" ON task_checklists
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM tasks JOIN workspace_projects ON tasks.project_id = workspace_projects.id 
      WHERE tasks.id = task_checklists.task_id AND is_workspace_member(workspace_projects.workspace_id)
    )
  );

DROP POLICY IF EXISTS "Allow insert task checklists" ON task_checklists;
CREATE POLICY "Allow insert task checklists" ON task_checklists
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Allow update task checklists" ON task_checklists;
CREATE POLICY "Allow update task checklists" ON task_checklists
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Allow delete task checklists" ON task_checklists;
CREATE POLICY "Allow delete task checklists" ON task_checklists
  FOR DELETE TO authenticated 
  USING (created_by = auth.uid());
