-- v001_initial_schema.sql
-- Core tables: departments, profiles (extends auth.users), modules.
-- Run in Supabase SQL Editor after creating the project. No dependencies.

-- Enums for profiles and modules
CREATE TYPE user_status AS ENUM (
  'active',
  'inactive',
  'pending_approval',
  'locked'
);

CREATE TYPE user_role AS ENUM (
  'super_admin',
  'dept_admin',
  'module_agent',
  'end_user'
);

CREATE TYPE assignment_mode AS ENUM (
  'admin_only',
  'self_pick',
  'round_robin'
);

-- Departments (no FK to profiles yet to avoid circular ref at creation)
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  head_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profiles: extends Supabase auth.users (id = auth.uid())
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  designation text,
  department_id uuid REFERENCES departments(id),
  manager_id uuid REFERENCES profiles(id),
  mobile text,
  personal_email text,
  avatar_url text,
  status user_status NOT NULL DEFAULT 'pending_approval',
  role user_role NOT NULL DEFAULT 'end_user',
  theme_prefs jsonb,
  notification_prefs jsonb,
  last_login_at timestamptz,
  password_changed_at timestamptz,
  force_password_change boolean DEFAULT true,
  failed_login_attempts int DEFAULT 0,
  locked_until timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Allow departments.head_id to reference profiles after profiles exists
ALTER TABLE departments
  ADD CONSTRAINT departments_head_id_fkey
  FOREIGN KEY (head_id) REFERENCES profiles(id);

-- Modules (Help Desk, ERP, General)
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  color text,
  assignment_mode assignment_mode NOT NULL DEFAULT 'admin_only',
  unassigned_alert_hours int DEFAULT 2,
  is_active boolean DEFAULT true,
  settings jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: enable on all tables (policies to be added in a later version)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Minimal policies so Supabase doesn't block; tighten in v002_rls_*.sql
CREATE POLICY "Allow read departments for authenticated"
  ON departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read own profile"
  ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Allow update own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Allow read modules for authenticated"
  ON modules FOR SELECT TO authenticated USING (true);
