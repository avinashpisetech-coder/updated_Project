-- v014_profile_module_access.sql
-- Add many-to-many access rights between profiles and modules.

DROP TABLE IF EXISTS profile_module_access CASCADE;

CREATE TABLE profile_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT false,
  can_update boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  access_scope text NOT NULL DEFAULT 'global',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, module_id)
);

ALTER TABLE profile_module_access ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION public.is_super_admin_access()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_dept_admin_access()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'dept_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow super_admin all actions
DROP POLICY IF EXISTS "Allow super_admin access" ON public.profile_module_access;
CREATE POLICY "Allow super_admin access" ON public.profile_module_access
  FOR ALL TO authenticated
  USING (public.is_super_admin_access())
  WITH CHECK (public.is_super_admin_access());

-- Allow dept_admin read for own department users, and update/insert/delete restricted by own dept
DROP POLICY IF EXISTS "Allow dept_admin select access" ON public.profile_module_access;
CREATE POLICY "Allow dept_admin select access" ON public.profile_module_access
  FOR SELECT TO authenticated
  USING (
    public.is_dept_admin_access()
    AND profile_id IN (SELECT id FROM public.profiles WHERE department_id = (SELECT department_id FROM public.profiles WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Allow dept_admin insert access" ON public.profile_module_access;
CREATE POLICY "Allow dept_admin insert access" ON public.profile_module_access
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Allow dept_admin update access" ON public.profile_module_access;
CREATE POLICY "Allow dept_admin update access" ON public.profile_module_access
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Allow dept_admin delete access" ON public.profile_module_access;
CREATE POLICY "Allow dept_admin delete access" ON public.profile_module_access
  FOR DELETE TO authenticated
  USING (false);
-- Seed master modules for advanced rights configuration
INSERT INTO modules (id, name, slug, icon, color, assignment_mode, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Users Master', 'masters_users', 'users', '#22c55e', 'admin_only', true, now(), now()),
  (gen_random_uuid(), 'ERP Master', 'masters_erp', 'settings', '#6366f1', 'admin_only', true, now(), now()),
  (gen_random_uuid(), 'Help Desk Master', 'masters_help_desk', 'help-circle', '#06b6d4', 'admin_only', true, now(), now()),
  (gen_random_uuid(), 'Access Control', 'masters_access_control', 'shield-check', '#f59e0b', 'admin_only', true, now(), now())
ON CONFLICT (slug) DO NOTHING;
