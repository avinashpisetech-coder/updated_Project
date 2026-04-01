-- RBAC System: Custom Roles and Permissions
-- This creates a flexible role-based access control system

-- Permissions table (what actions can be performed)
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- e.g., 'create_ticket', 'view_reports', 'manage_users'
  description text,
  resource text NOT NULL, -- e.g., 'tickets', 'users', 'reports'
  action text NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Custom roles table
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system_role boolean DEFAULT false, -- system roles cannot be deleted
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Role permissions (many-to-many between roles and permissions)
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- User roles (many-to-many between users and roles)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Ticket permissions
('create_ticket', 'Create new tickets', 'tickets', 'create'),
('view_ticket', 'View tickets', 'tickets', 'read'),
('update_ticket', 'Update ticket details', 'tickets', 'update'),
('delete_ticket', 'Delete tickets', 'tickets', 'delete'),
('assign_ticket', 'Assign tickets to users', 'tickets', 'assign'),
('close_ticket', 'Close tickets', 'tickets', 'close'),

-- User management permissions
('view_users', 'View user profiles', 'users', 'read'),
('create_user', 'Create new users', 'users', 'create'),
('update_user', 'Update user profiles', 'users', 'update'),
('delete_user', 'Delete users', 'users', 'delete'),
('manage_roles', 'Assign roles to users', 'users', 'manage_roles'),

-- Master data permissions
('manage_departments', 'Manage departments', 'departments', 'manage'),
('manage_designations', 'Manage designations', 'designations', 'manage'),
('manage_modules', 'Manage modules', 'modules', 'manage'),

-- Access control permissions
('manage_access_control', 'Manage user access controls', 'access_control', 'manage'),
('manage_roles_permissions', 'Manage roles and permissions', 'roles', 'manage'),

-- Report permissions
('view_reports', 'View system reports', 'reports', 'read'),
('export_reports', 'Export reports', 'reports', 'export');

-- Insert system roles (these cannot be deleted)
INSERT INTO roles (name, description, is_system_role) VALUES
('Super Admin', 'Full system access', true),
('Department Admin', 'Department-level administration', true),
('Module Agent', 'Module-specific agent access', true),
('End User', 'Basic user access', true);

-- Map existing enum roles to the new system
-- Note: This would need to be run as a migration script
-- UPDATE profiles SET role = 'end_user' WHERE role IS NULL;