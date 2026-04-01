-- v011_profile_activity_log.sql
-- Add profile activity audit log for update events and admin actions.

CREATE TABLE IF NOT EXISTS public.profile_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read own or actor profile activity" ON public.profile_activity_log
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR actor_id = auth.uid());

CREATE POLICY "Allow insert profile activity by authenticated actor" ON public.profile_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
