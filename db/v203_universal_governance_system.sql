-- v203_universal_governance_system.sql
-- Description: Implement a purely dynamic, non-hardcoded RBAC system across all core modules.
-- This replaces legacy 'is_admin' checks with permission-based lookups and ensures
-- that direct object assignment (Tickets, Tasks, Assets) grants automatic visibility.

BEGIN;

-------------------------------------------------------------------------------
-- 1. CORE PERMISSION HELPER (The Single Source of Truth)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_permission(u_id uuid, p_resource text, p_action text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = u_id
    AND (p.resource = p_resource OR p.resource = '*' OR p.resource = 'module_' || p_resource)
    AND (p.action = p_action OR p.action = 'manage' OR p.action = '*')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Update the legacy admin check to be a wrapper around the permission system
CREATE OR REPLACE FUNCTION public.is_admin_safe_v2(u_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin is now defined as someone with 'manage' rights on all resources or a system-wide manage flag
  RETURN public.has_permission(u_id, '*', '*');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-------------------------------------------------------------------------------
-- 2. TICKET GOVERNANCE (Support Queue)
-------------------------------------------------------------------------------
-- Helper for ticket assignment check
CREATE OR REPLACE FUNCTION public.is_ticket_assignee(p_ticket_id uuid, p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE id = p_ticket_id AND assigned_to_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.ticket_watchers
    WHERE ticket_id = p_ticket_id AND watcher_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Allow read own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow super_admin read tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow dept_admin read tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow module_agent read tickets" ON public.tickets;
DROP POLICY IF EXISTS "Allow read all non-confidential tickets" ON public.tickets;

CREATE POLICY "Universal Ticket Visibility" ON public.tickets
  FOR SELECT TO authenticated 
  USING (
    requester_id = auth.uid() 
    OR created_by_id = auth.uid() 
    OR assigned_to_id = auth.uid()
    OR public.is_ticket_assignee(id, auth.uid())
    OR public.has_permission(auth.uid(), 'tickets', 'read')
    OR public.has_permission(auth.uid(), 'module_help_desk', 'read')
  );

CREATE POLICY "Universal Ticket Creation" ON public.tickets
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.has_permission(auth.uid(), 'tickets', 'create')
    OR public.has_permission(auth.uid(), 'module_help_desk', 'create')
  );

-------------------------------------------------------------------------------
-- 3. ASSET GOVERNANCE
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own assets" ON public.assets;
DROP POLICY IF EXISTS "Agents and Admins read all assets" ON public.assets;
DROP POLICY IF EXISTS "Admins manage assets" ON public.assets;

CREATE POLICY "Universal Asset Visibility" ON public.assets
  FOR SELECT TO authenticated 
  USING (
    current_holder_id = auth.uid()
    OR public.has_permission(auth.uid(), 'assets', 'read')
    OR public.has_permission(auth.uid(), 'module_assets', 'read')
  );

CREATE POLICY "Universal Asset Management" ON public.assets
  FOR ALL TO authenticated 
  USING (
    public.has_permission(auth.uid(), 'assets', 'manage')
    OR public.has_permission(auth.uid(), 'module_assets', 'manage')
  );

-------------------------------------------------------------------------------
-- 4. PROFILE GOVERNANCE
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow read all profiles" ON public.profiles;

CREATE POLICY "Universal Profile Visibility" ON public.profiles
  FOR SELECT TO authenticated 
  USING (
    id = auth.uid()
    OR public.has_permission(auth.uid(), 'users', 'read')
    OR public.has_permission(auth.uid(), 'module_users_master', 'read')
  );

-------------------------------------------------------------------------------
-- 5. MASTER DATA GOVERNANCE
-------------------------------------------------------------------------------
-- ERP Modules
ALTER TABLE public.erp_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read erp_systems" ON public.erp_modules;
DROP POLICY IF EXISTS "Universal ERP Visibility" ON public.erp_modules;
CREATE POLICY "Universal ERP Visibility" ON public.erp_modules
  FOR SELECT TO authenticated 
  USING (
    public.has_permission(auth.uid(), 'erp', 'read')
    OR public.has_permission(auth.uid(), 'module_erp_masters', 'read')
  );

-- ERP Sub-Modules
ALTER TABLE public.erp_sub_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to anyone" ON public.erp_sub_modules;
DROP POLICY IF EXISTS "Universal ERP Sub-Module Visibility" ON public.erp_sub_modules;
CREATE POLICY "Universal ERP Sub-Module Visibility" ON public.erp_sub_modules
  FOR SELECT TO authenticated 
  USING (
    public.has_permission(auth.uid(), 'erp', 'read')
    OR public.has_permission(auth.uid(), 'module_erp_masters', 'read')
  );

-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read companies" ON public.companies;
DROP POLICY IF EXISTS "Universal Org Visibility" ON public.companies;
CREATE POLICY "Universal Org Visibility" ON public.companies
  FOR SELECT TO authenticated 
  USING (
    public.has_permission(auth.uid(), 'orgs', 'read')
    OR public.has_permission(auth.uid(), 'module_organizations', 'read')
  );

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read projects" ON public.projects;
DROP POLICY IF EXISTS "Universal Project Visibility" ON public.projects;
CREATE POLICY "Universal Project Visibility" ON public.projects
  FOR SELECT TO authenticated 
  USING (
    public.has_permission(auth.uid(), 'orgs', 'read')
    OR public.has_permission(auth.uid(), 'module_organizations', 'read')
  );

COMMIT;
