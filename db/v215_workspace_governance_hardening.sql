-- v215_workspace_governance_hardening.sql
-- Description: Unify workspace module permissions with the universal governance system
-- and fix visibility/update issues for admins and assignees.

BEGIN;

-- 1. Enhance is_workspace_member to include universal permissions
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check direct membership
  IF EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = ws_id AND profile_id = auth.uid()
  ) THEN RETURN TRUE; END IF;

  -- Check workspace ownership
  IF EXISTS (
    SELECT 1 FROM public.workspaces 
    WHERE id = ws_id AND created_by = auth.uid()
  ) THEN RETURN TRUE; END IF;

  -- Check task assignment
  IF public.is_workspace_task_assignee(ws_id, auth.uid()) THEN RETURN TRUE; END IF;

  -- Check global permissions (Admin/Manager)
  IF public.has_permission(auth.uid(), 'workspace', 'manage') 
     OR public.has_permission(auth.uid(), 'module_workspace', 'manage')
     OR public.is_admin_safe_v2(auth.uid()) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update Workspaces Policy
DROP POLICY IF EXISTS "Allow read workspaces for members" ON public.workspaces;
CREATE POLICY "Universal Workspace Visibility" ON public.workspaces
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR public.is_workspace_member(id)
    OR public.has_permission(auth.uid(), 'workspace', 'read')
    OR public.has_permission(auth.uid(), 'module_workspace', 'read')
  );

-- 3. Update Tasks Policy for robust updates
DROP POLICY IF EXISTS "Allow update tasks" ON public.tasks;
CREATE POLICY "Universal Task Update" ON public.tasks
  FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid() -- Task creator
    OR EXISTS (
      SELECT 1 FROM public.task_assignees 
      WHERE task_id = tasks.id AND profile_id = auth.uid()
    ) -- Task assignee
    OR EXISTS (
      SELECT 1 FROM public.workspace_projects wp
      WHERE wp.id = tasks.project_id AND public.is_workspace_member(wp.workspace_id)
    ) -- Workspace member/admin
  );

-- 4. Update Tasks SELECT policy for robust visibility
DROP POLICY IF EXISTS "Allow read tasks" ON public.tasks;
CREATE POLICY "Universal Task Visibility" ON public.tasks
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.task_assignees 
      WHERE task_id = tasks.id AND profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_projects wp
      WHERE wp.id = tasks.project_id AND public.is_workspace_member(wp.workspace_id)
    )
    OR public.has_permission(auth.uid(), 'workspace', 'read')
    OR public.has_permission(auth.uid(), 'module_workspace', 'read')
  );

COMMIT;
