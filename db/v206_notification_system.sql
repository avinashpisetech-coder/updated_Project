-- v206_notification_system.sql
-- Description: Create centralized notification table and RLS policies

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       text NOT NULL,
    message     text NOT NULL,
    type        text DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'ticket', 'asset', 'task'
    link        text, -- URL to redirect when clicked
    is_read     boolean DEFAULT false,
    metadata    jsonb DEFAULT '{}',
    created_at  timestamptz DEFAULT now()
);

-- Index for performance on user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Helper function to create notification from other functions
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_title text,
    p_message text,
    p_type text DEFAULT 'info',
    p_link text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
) RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    VALUES (p_user_id, p_title, p_message, p_type, p_link, p_metadata)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
