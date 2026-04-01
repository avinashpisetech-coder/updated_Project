-- v004_ticketing_schema.sql
-- Create ticketing tables (categories, tickets, activity log, chat, attachments)
-- Run after v003_seed_modules.sql

CREATE TYPE ticket_status AS ENUM (
  'new',
  'assigned',
  'in_progress',
  'pending_user',
  'pending_dept',
  'pending_third_party',
  'scheduled',
  'escalated',
  'resolved',
  'closed',
  'cancelled'
);

CREATE TYPE ticket_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE activity_type AS ENUM (
  'status_change',
  'assignment',
  'public_reply',
  'internal_note',
  'meeting_scheduled',
  'escalation',
  'transfer',
  'merge'
);

-- Ticket Categories
CREATE TABLE ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ticket Sub-Categories
CREATE TABLE ticket_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES ticket_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Core Tickets Table
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL, -- e.g. HD-2026-0001
  module_id uuid REFERENCES modules(id) NOT NULL,
  category_id uuid REFERENCES ticket_categories(id) NOT NULL,
  subcategory_id uuid REFERENCES ticket_subcategories(id),
  subject text NOT NULL,
  description text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'low',
  requester_id uuid REFERENCES profiles(id) NOT NULL,
  assigned_to_id uuid REFERENCES profiles(id),
  created_by_id uuid REFERENCES profiles(id) NOT NULL,
  affected_person_id uuid REFERENCES profiles(id),
  preferred_resolution_date date,
  sla_due_date timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  escalation_level int DEFAULT 0,
  is_confidential boolean DEFAULT false,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ticket Activity Log (History of status changes, assignment, meetings, notes)
CREATE TABLE ticket_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) NOT NULL,
  activity_type activity_type NOT NULL,
  content text,
  old_value text,
  new_value text,
  metadata jsonb,
  is_internal boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ticket Chat Messages (For Realtime Channel)
CREATE TABLE ticket_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  target_user_id uuid REFERENCES profiles(id), -- For @mentions
  content text NOT NULL,
  promoted_to_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Ticket Watchers (CC)
CREATE TABLE ticket_watchers (
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  watcher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (ticket_id, watcher_id)
);

-- Ticket Attachments
CREATE TABLE ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES profiles(id) NOT NULL,
  file_name text NOT NULL,
  file_size int NOT NULL,
  content_type text NOT NULL,
  storage_path text NOT NULL,
  is_chat_attachment boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create simple sequence for ticket numbering
CREATE SEQUENCE ticket_number_seq START 1;

-- Set up RLS basics
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Simple policies for phase 1 (Refine per PRD)
-- Categories: Readable by all authenticated
CREATE POLICY "Allow read categories for authenticated" ON ticket_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read subcategories for authenticated" ON ticket_subcategories FOR SELECT TO authenticated USING (true);

-- Authorization helper functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_dept_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role text;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  RETURN current_role = 'dept_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_department_id()
RETURNS uuid AS $$
DECLARE
  dept_id uuid;
BEGIN
  SELECT department_id INTO dept_id FROM public.profiles WHERE id = auth.uid();
  RETURN dept_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tickets:
-- Anyone can insert a ticket (requester or creator)
CREATE POLICY "Allow insert own tickets" ON tickets FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() OR created_by_id = auth.uid());

-- Admins have expanded read access by role
CREATE POLICY "Allow super_admin read tickets" ON tickets FOR SELECT TO authenticated USING (public.is_super_admin());

CREATE POLICY "Allow dept_admin read tickets" ON tickets FOR SELECT TO authenticated USING (
  public.is_dept_admin()
  AND (
    requester_id IN (SELECT id FROM public.profiles WHERE department_id = public.user_department_id())
    OR assigned_to_id IN (SELECT id FROM public.profiles WHERE department_id = public.user_department_id())
  )
);

CREATE POLICY "Allow module_agent read tickets" ON tickets FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.profile_module_access pma
    WHERE pma.profile_id = auth.uid() AND pma.can_view = true AND pma.module_id = tickets.module_id
  )
);

-- End users and case fallback non-confidential
CREATE POLICY "Allow read own tickets" ON tickets FOR SELECT TO authenticated USING (
  requester_id = auth.uid() OR created_by_id = auth.uid() OR affected_person_id = auth.uid() OR assigned_to_id = auth.uid()
);

-- Broad read for non-confidential tickets (Existing behavior)
CREATE POLICY "Allow read all non-confidential tickets" ON tickets FOR SELECT TO authenticated USING (is_confidential = false);

-- Read access for sub-tables
CREATE POLICY "Allow read activity" ON ticket_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read chat" ON ticket_chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read attachments" ON ticket_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read watchers" ON ticket_watchers FOR SELECT TO authenticated USING (true);

-- Allow inserts to sub tables for authenticated users
CREATE POLICY "Allow insert activity" ON ticket_activity_log FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE POLICY "Allow insert chat" ON ticket_chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Allow insert attachments" ON ticket_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Allow insert watchers" ON ticket_watchers FOR INSERT TO authenticated WITH CHECK (true);
