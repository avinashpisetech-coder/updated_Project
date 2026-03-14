-- v002_profile_insert_and_audit.sql
-- Allow authenticated user to insert their own profile (for first-login sync). Add audit_log table.
-- Run after v001_initial_schema.sql.

-- So dashboard/layout can create profile on first login if missing
CREATE POLICY "Allow insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Audit log for Phase 1 (login, logout, password change, user CRUD)
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  ip_address text,
  user_agent text,
  changes jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only Super Admin can read audit log (we will add role check in app; here allow service role / authenticated for now, restrict in app)
CREATE POLICY "Allow read audit_log for authenticated"
  ON audit_log FOR SELECT TO authenticated USING (true);

-- Inserts from server (service role or authenticated user logging own action) — restrict in app to valid actions
CREATE POLICY "Allow insert audit_log"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);
