-- v200_workspace_assignee_visibility.sql
-- Description: Fix workspace visibility for users who are task assignees but not workspace_members.
-- Bug: Users assigned to tasks within a workspace cannot see the workspace in "All Workspaces" view
-- because the RLS policy only checks workspace_members and created_by.

-- 1. Helper Function: Check if user is a task assignee in ANY task within a workspace (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_task_assignee(ws_id uuid, u_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_projects wp
    JOIN public.tasks t ON t.project_id = wp.id
    JOIN public.task_assignees ta ON ta.task_id = t.id
    WHERE wp.workspace_id = ws_id
      AND ta.profile_id = u_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the is_workspace_member function to also consider task assignees
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = ws_id AND profile_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = ws_id AND created_by = auth.uid()
  ) OR public.is_workspace_task_assignee(ws_id, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Workspaces RLS SELECT policy to include task assignees
DROP POLICY IF EXISTS "Allow read workspaces for members" ON workspaces;
CREATE POLICY "Allow read workspaces for members" ON workspaces
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = id AND profile_id = auth.uid()
    )
    OR public.is_workspace_task_assignee(id, auth.uid())
    OR public.is_admin_safe_v2(auth.uid())
  );

-- 4. Performance index for the new lookup path
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_profile_id ON task_assignees(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_workspace_id ON workspace_projects(workspace_id);
