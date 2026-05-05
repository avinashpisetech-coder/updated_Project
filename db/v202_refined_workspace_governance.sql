-- v202_refined_workspace_governance.sql
-- Description: Refines workspace RLS to be purely permission and assignment based, removing hardcoded admin checks.

-- 1. Helper to check for a global permission (FAST)
CREATE OR REPLACE FUNCTION public.has_global_permission(u_id uuid, p_resource text, p_action text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = u_id
    AND p.resource = p_resource
    AND (p.action = p_action OR p.action = 'manage' OR p.action = '*')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update is_workspace_member to be more robust
-- Now checks: explicit membership OR creator OR assignment-based visibility
CREATE OR REPLACE FUNCTION public.is_workspace_member_v2(ws_id uuid, u_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN 
    EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND profile_id = u_id)
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id AND created_by = u_id)
    OR public.is_workspace_task_assignee(ws_id, u_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Refine Workspaces RLS
DROP POLICY IF EXISTS "Allow read workspaces for members" ON workspaces;
CREATE POLICY "Allow read workspaces for members" ON workspaces
  FOR SELECT TO authenticated 
  USING (
    public.is_workspace_member_v2(id, auth.uid())
    OR public.has_global_permission(auth.uid(), 'workspace', 'read')
    OR public.has_global_permission(auth.uid(), '*', 'manage')
  );

DROP POLICY IF EXISTS "Allow update workspaces" ON workspaces;
CREATE POLICY "Allow update workspaces" ON workspaces
  FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members 
      WHERE workspace_id = id AND profile_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR public.has_global_permission(auth.uid(), 'workspace', 'update')
    OR public.has_global_permission(auth.uid(), '*', 'manage')
  );

-- 4. Refine Projects RLS
DROP POLICY IF EXISTS "Allow read projects" ON workspace_projects;
CREATE POLICY "Allow read projects" ON workspace_projects
  FOR SELECT TO authenticated 
  USING (
    public.is_workspace_member_v2(workspace_id, auth.uid())
    OR public.is_project_assignee(id, auth.uid())
    OR public.has_global_permission(auth.uid(), 'workspace', 'read')
    OR public.has_global_permission(auth.uid(), '*', 'manage')
  );

-- 5. Refine Tasks RLS
DROP POLICY IF EXISTS "Allow read tasks" ON tasks;
CREATE POLICY "Allow read tasks" ON tasks
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR public.is_task_assignee(id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM workspace_projects wp
      WHERE wp.id = tasks.project_id 
      AND (
        public.is_workspace_member_v2(wp.workspace_id, auth.uid())
        OR public.has_global_permission(auth.uid(), 'workspace', 'read')
      )
    )
    OR public.has_global_permission(auth.uid(), '*', 'manage')
  );

-- 6. Grant Workspace Create Permission (Gating handled at app level + RLS)
DROP POLICY IF EXISTS "Allow insert workspaces" ON workspaces;
CREATE POLICY "Allow insert workspaces" ON workspaces
  FOR INSERT TO authenticated 
  WITH CHECK (
    created_by = auth.uid() 
    AND (
      public.has_global_permission(auth.uid(), 'workspace', 'create')
      OR public.has_global_permission(auth.uid(), '*', 'manage')
    )
  );
