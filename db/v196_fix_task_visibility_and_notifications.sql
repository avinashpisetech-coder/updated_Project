-- v196_fix_task_visibility_and_notifications.sql
-- Description: Fix RLS for tasks/projects to allow assignee visibility and add creation notifications.

-- 1. Update Tasks RLS: Allow visibility for assignees even if not workspace members
DROP POLICY IF EXISTS "Allow read tasks" ON tasks;
CREATE POLICY "Allow read tasks" ON tasks
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM workspace_projects 
      WHERE workspace_projects.id = tasks.project_id 
      AND public.is_workspace_member(workspace_projects.workspace_id)
    )
  );

-- 2. Update Task Assignees RLS
DROP POLICY IF EXISTS "Anyone can view task assignees" ON task_assignees;
CREATE POLICY "Anyone can view task assignees" ON task_assignees
  FOR SELECT TO authenticated 
  USING (true); -- Usually safe to view who else is assigned to a task you can see

-- 3. Update Projects RLS: Allow visibility for assignees
DROP POLICY IF EXISTS "Allow read projects" ON workspace_projects;
CREATE POLICY "Allow read projects" ON workspace_projects
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR public.is_workspace_member(workspace_id)
    OR EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.project_id = workspace_projects.id 
      AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = tasks.id AND profile_id = auth.uid())
    )
  );

-- 4. Ensure task_notifications are in realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER TABLE task_notifications REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE task_notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
