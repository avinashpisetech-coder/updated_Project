-- v041_system_settings.sql
-- Table for storing system-wide settings like SMTP, branding, etc.
-- Allows runtime configuration without redeploying code.

CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for key lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- RLS: Only Super Admin can manage settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow super_admin to manage settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- Allow authenticated users to READ settings (needed for mail lib in server actions)
CREATE POLICY "Allow authenticated to read settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed SMTP Settings
INSERT INTO public.system_settings (key, value, description) VALUES
('smtp_host', '', 'SMTP Server Host (e.g., smtp.resend.com or smtp.gmail.com)'),
('smtp_port', '587', 'SMTP Server Port (usually 587 or 465)'),
('smtp_user', '', 'SMTP Username'),
('smtp_pass', '', 'SMTP Password'),
('smtp_secure', 'false', 'Use TLS/SSL (true/false)'),
('smtp_from_address', 'no-reply@yourdomain.com', 'Sender Email Address'),
('smtp_from_name', 'EIRMS System', 'Sender Display Name')
ON CONFLICT (key) DO NOTHING;
