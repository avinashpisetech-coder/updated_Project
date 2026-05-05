-- v204_fix_missing_workspace_function.sql
-- Description: Restores the missing is_workspace_task_assignee function required by workspace RLS policies.

-- This function checks if a user is assigned to ANY task within a workspace.
-- It is critical for the "is_workspace_member_v2" check used in RLS policies.

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Also ensure is_workspace_member_v2 is correctly pointing to it
CREATE OR REPLACE FUNCTION public.is_workspace_member_v2(ws_id uuid, u_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN 
    EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND profile_id = u_id)
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id AND created_by = u_id)
    OR public.is_workspace_task_assignee(ws_id, u_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
