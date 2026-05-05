-- v205_hierarchical_scoping.sql
-- Description: Implement hierarchical activity scoping (End User < Dept Admin < Super Admin)
-- and assignment-based visibility for all core modules (Tickets, Tasks, Assets).

BEGIN;

-------------------------------------------------------------------------------
-- 1. ENSURE SUPER ADMIN HAS GLOBAL WILDCARD PERMISSION
-------------------------------------------------------------------------------
-- First, find the Super Admin role
DO $$ 
DECLARE
    v_role_id uuid;
    v_perm_id uuid;
BEGIN
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'Super Admin';
    
    -- Ensure the global wildcard permission exists
    INSERT INTO public.permissions (name, description, resource, action)
    VALUES ('global_manage', 'Global management access', '*', '*')
    ON CONFLICT (name) DO UPDATE SET resource = '*', action = '*'
    RETURNING id INTO v_perm_id;
    
    -- Assign it to Super Admin
    INSERT INTO public.role_permissions (role_id, permission_id)
    VALUES (v_role_id, v_perm_id)
    ON CONFLICT DO NOTHING;
END $$;

-------------------------------------------------------------------------------
-- 2. REFINED VISIBILITY HELPER (Department-Aware)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_department_activity(p_requester_id uuid, p_assignee_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_dept_id uuid;
BEGIN
    -- Get current user's department
    SELECT department_id INTO v_user_dept_id FROM public.profiles WHERE id = auth.uid();
    
    -- If user doesn't have a department, they can't see department-wide activity
    IF v_user_dept_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if either the requester or the assignee belongs to the same department
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id IN (p_requester_id, p_assignee_id) 
        AND department_id = v_user_dept_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-------------------------------------------------------------------------------
-- 3. UPDATE TICKET RLS
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Universal Ticket Visibility" ON public.tickets;

CREATE POLICY "Universal Ticket Visibility" ON public.tickets
  FOR SELECT TO authenticated 
  USING (
    requester_id = auth.uid() 
    OR created_by_id = auth.uid() 
    OR assigned_to_id = auth.uid()
    OR public.is_ticket_assignee(id, auth.uid())
    OR public.has_permission(auth.uid(), '*', '*') -- Super Admin
    OR public.has_permission(auth.uid(), 'tickets', 'read') -- Global Ticket Reader
    OR (
        public.has_permission(auth.uid(), 'tickets', 'read_dept') -- Dept Admin Scope
        AND public.can_view_department_activity(requester_id, assigned_to_id)
    )
  );

-------------------------------------------------------------------------------
-- 4. UPDATE TASK RLS
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read tasks" ON public.tasks;

CREATE POLICY "Allow read tasks" ON public.tasks
  FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()
    OR id IN (SELECT task_id FROM public.task_assignees WHERE profile_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM workspace_projects 
      WHERE workspace_projects.id = tasks.project_id 
      AND public.is_workspace_member(workspace_projects.workspace_id)
    )
    OR public.has_permission(auth.uid(), '*', '*') -- Super Admin
    OR public.has_permission(auth.uid(), 'workspace', 'read') -- Global Workspace Reader
    OR (
        public.has_permission(auth.uid(), 'workspace', 'read_dept') -- Dept Admin Scope
        AND public.can_view_department_activity(created_by, (SELECT profile_id FROM public.task_assignees WHERE task_id = tasks.id LIMIT 1))
    )
  );

-------------------------------------------------------------------------------
-- 5. UPDATE ASSET RLS
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Universal Asset Visibility" ON public.assets;

CREATE POLICY "Universal Asset Visibility" ON public.assets
  FOR SELECT TO authenticated 
  USING (
    current_holder_id = auth.uid()
    OR public.has_permission(auth.uid(), '*', '*') -- Super Admin
    OR public.has_permission(auth.uid(), 'assets', 'read') -- Global Asset Reader
    OR (
        public.has_permission(auth.uid(), 'assets', 'read_dept') -- Dept Admin Scope
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND department_id = (SELECT department_id FROM public.profiles WHERE id = assets.current_holder_id)
        )
    )
  );

-------------------------------------------------------------------------------
-- 6. SEED DEPT ADMIN PERMISSIONS
-------------------------------------------------------------------------------
INSERT INTO public.permissions (name, description, resource, action) VALUES
('view_dept_tickets', 'View all tickets in own department', 'tickets', 'read_dept'),
('view_dept_tasks', 'View all tasks in own department', 'workspace', 'read_dept'),
('view_dept_assets', 'View all assets in own department', 'assets', 'read_dept')
ON CONFLICT (name) DO NOTHING;

-- Assign to Dept Admin role
DO $$ 
DECLARE
    v_role_id uuid;
BEGIN
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'Department Admin';
    
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT v_role_id, id FROM public.permissions 
    WHERE action = 'read_dept'
    ON CONFLICT DO NOTHING;
END $$;

COMMIT;
