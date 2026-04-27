-- v197_fix_recursion_and_visibility.sql
-- Description: Fix infinite recursion in workspace_projects and tasks RLS policies by using SECURITY DEFINER functions.

-- 1. Helper Function: Check if user is assigned to a specific task (Security Definer avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_task_assignee(p_task_id uuid, p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.task_assignees 
    WHERE task_id = p_task_id AND profile_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: Check if user is assigned to ANY task in a project
CREATE OR REPLACE FUNCTION public.is_project_assignee(p_project_id uuid, p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.task_assignees ta ON ta.task_id = t.id
    WHERE t.project_id = p_project_id AND ta.profile_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix Tasks RLS
DROP POLICY IF EXISTS "Allow read tasks" ON tasks;
CREATE POLICY "Allow read tasks" ON tasks
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR public.is_task_assignee(id, auth.uid())
    OR EXISTS (
      -- Check workspace membership directly via helper to avoid project-table recursion
      SELECT 1 FROM workspace_projects wp
      WHERE wp.id = tasks.project_id 
      AND public.is_workspace_member(wp.workspace_id)
    )
  );

-- 4. Fix Projects RLS
DROP POLICY IF EXISTS "Allow read projects" ON workspace_projects;
CREATE POLICY "Allow read projects" ON workspace_projects
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR public.is_workspace_member(workspace_id)
    OR public.is_project_assignee(id, auth.uid())
  );

-- 5. Fix Assignees RLS (Consistency)
DROP POLICY IF EXISTS "Anyone can view task assignees" ON task_assignees;
CREATE POLICY "Anyone can view task assignees" ON task_assignees
  FOR SELECT TO authenticated 
  USING (true);
