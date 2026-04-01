-- v012_password_reset_requests.sql
-- Track password reset requests per user to enforce daily limits.

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert own password reset request" ON public.password_reset_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow select own password reset requests" ON public.password_reset_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
