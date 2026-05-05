-- v217_unified_event_protocol.sql
-- Description: Implement Unified Event & Communication Protocol
-- 1. Multi-channel activity trigger (Bell + Email)
-- 2. Dynamic draft generation engine
-- 3. Real-time chat sync

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Communication Queue Table
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_queue (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES public.profiles(id),
    subject         text NOT NULL,
    body_html       text NOT NULL,
    entity_id       uuid, -- Transaction_ID for traceability
    entity_type     text, -- 'ticket', 'task', 'asset', etc.
    activity_type   text, -- 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN'
    status          text DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    retry_count     int DEFAULT 0,
    error_log       text,
    created_at      timestamptz DEFAULT now(),
    processed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comm_queue_status ON public.communication_queue(status) WHERE status = 'pending';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Dynamic Draft Generation Logic
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_dynamic_draft(
    p_activity_type text,
    p_entity_type   text,
    p_transaction_id uuid,
    p_actor_name    text
) RETURNS TABLE (notification_body text, email_draft text, subject text) AS $$
DECLARE
    v_entity_label text;
BEGIN
    v_entity_label := INITCAP(p_entity_type);
    
    CASE p_activity_type
        WHEN 'CREATE' THEN
            subject := 'New ' || v_entity_label || ' Created';
            notification_body := 'New ' || v_entity_label || ' created by ' || p_actor_name || '. ID: ' || p_transaction_id::text || '.';
            email_draft := '<p>New <strong>' || v_entity_label || '</strong> was created by <strong>' || p_actor_name || '</strong>.</p>' ||
                           '<p><strong>Transaction ID:</strong> ' || p_transaction_id::text || '</p>';
        
        WHEN 'UPDATE' THEN
            subject := v_entity_label || ' Updated';
            notification_body := 'Changes made to ' || v_entity_label || ' by ' || p_actor_name || '. View history for details.';
            email_draft := '<p>Changes were made to <strong>' || v_entity_label || '</strong> by <strong>' || p_actor_name || '</strong>.</p>' ||
                           '<p>Please view the history for full details.</p>' ||
                           '<p><strong>Transaction ID:</strong> ' || p_transaction_id::text || '</p>';
        
        WHEN 'DELETE' THEN
            subject := 'Alert: ' || v_entity_label || ' Deleted';
            notification_body := 'Alert: ' || v_entity_label || ' was deleted by ' || p_actor_name || '. Transaction: ' || p_transaction_id::text || '.';
            email_draft := '<p style="color: #dc2626; font-weight: bold;">Alert: ' || v_entity_label || ' was deleted.</p>' ||
                           '<p><strong>Action by:</strong> ' || p_actor_name || '</p>' ||
                           '<p><strong>Transaction ID:</strong> ' || p_transaction_id::text || '</p>';
        
        WHEN 'ASSIGN' THEN
            subject := 'Priority Update: New Assignment';
            notification_body := 'Priority Update: You have been assigned to ' || v_entity_label || ' ID: ' || p_transaction_id::text || ' by ' || p_actor_name || '.';
            email_draft := '<p><strong>Priority Update:</strong> You have been assigned to a <strong>' || v_entity_label || '</strong> by <strong>' || p_actor_name || '</strong>.</p>' ||
                           '<p><strong>Entity ID:</strong> ' || p_transaction_id::text || '</p>';
        
        ELSE
            subject := 'System Notification';
            notification_body := 'Activity on ' || v_entity_label || ' by ' || p_actor_name || '.';
            email_draft := notification_body;
    END CASE;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Unified Activity Handler
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_unified_activity()
RETURNS trigger AS $$
DECLARE
    v_activity_type text;
    v_entity_type   text;
    v_transaction_id uuid;
    v_owner_id      uuid;
    v_assignee_ids  uuid[] := '{}';
    v_actor_id      uuid := auth.uid();
    v_actor_name    text;
    v_draft         record;
    v_user_id       uuid;
    v_target_users  uuid[] := '{}';
BEGIN
    -- 1. Identify Entity and Transaction
    v_entity_type := TG_ARGV[0];
    
    IF TG_OP = 'DELETE' THEN
        v_transaction_id := OLD.id;
        v_activity_type := 'DELETE';
    ELSE
        v_transaction_id := NEW.id;
        IF TG_OP = 'INSERT' THEN
            v_activity_type := 'CREATE';
        ELSIF TG_OP = 'UPDATE' THEN
            v_activity_type := 'UPDATE';
            -- Check for Assignment Change (Ticket specific)
            IF v_entity_type = 'ticket' AND OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id AND NEW.assigned_to_id IS NOT NULL THEN
                v_activity_type := 'ASSIGN';
            END IF;
        END IF;
    END IF;

    -- 2. Capture Owner and Assigned Users
    IF v_entity_type = 'ticket' THEN
        IF TG_OP = 'DELETE' THEN
            v_owner_id := OLD.created_by_id;
            v_assignee_ids := array_remove(ARRAY[OLD.assigned_to_id, OLD.requester_id], NULL);
        ELSE
            v_owner_id := NEW.created_by_id;
            v_assignee_ids := array_remove(ARRAY[NEW.assigned_to_id, NEW.requester_id], NULL);
        END IF;
    ELSIF v_entity_type = 'task' THEN
        IF TG_OP = 'DELETE' THEN
            v_owner_id := OLD.created_by;
        ELSE
            v_owner_id := NEW.created_by;
            -- Fetch assignees from task_assignees table
            SELECT array_agg(profile_id) INTO v_assignee_ids FROM public.task_assignees WHERE task_id = NEW.id;
        END IF;
    END IF;

    -- Combine target users (Owner + Assignees), excluding the actor
    v_target_users := array_cat(ARRAY[v_owner_id], v_assignee_ids);
    
    -- 3. Get Actor Name
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
    v_actor_name := COALESCE(v_actor_name, 'System');

    -- 4. Generate Drafts and Dispatch
    SELECT * INTO v_draft FROM public.get_dynamic_draft(v_activity_type, v_entity_type, v_transaction_id, v_actor_name);

    FOREACH v_user_id IN ARRAY v_target_users
    LOOP
        IF v_user_id IS NOT NULL AND v_user_id != v_actor_id THEN
            -- UI Notification
            INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
            VALUES (
                v_user_id, 
                v_draft.subject, 
                v_draft.notification_body, 
                'info', 
                '/' || v_entity_type || 's/' || v_transaction_id::text,
                jsonb_build_object('transaction_id', v_transaction_id, 'entity_type', v_entity_type)
            );

            -- Email Queue
            INSERT INTO public.communication_queue (user_id, subject, body_html, entity_id, entity_type, activity_type)
            VALUES (v_user_id, v_draft.subject, v_draft.email_draft, v_transaction_id, v_entity_type, v_activity_type);
        END IF;
    END LOOP;

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Chat Sync Logic
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_chat_sync()
RETURNS trigger AS $$
DECLARE
    v_entity_type   text;
    v_entity_id     uuid;
    v_actor_name    text;
    v_target_users  uuid[] := '{}';
    v_user_id       uuid;
    v_subject       text;
    v_message       text;
BEGIN
    v_entity_type := TG_ARGV[0];
    
    IF v_entity_type = 'ticket' THEN
        v_entity_id := NEW.ticket_id;
        SELECT array_agg(u) FROM (
            SELECT created_by_id as u FROM public.tickets WHERE id = v_entity_id
            UNION
            SELECT requester_id FROM public.tickets WHERE id = v_entity_id
            UNION
            SELECT assigned_to_id FROM public.tickets WHERE id = v_entity_id
        ) s INTO v_target_users;
    ELSIF v_entity_type = 'task' THEN
        v_entity_id := NEW.task_id;
        SELECT array_agg(u) FROM (
            SELECT created_by as u FROM public.tasks WHERE id = v_entity_id
            UNION
            SELECT profile_id FROM public.task_assignees WHERE task_id = v_entity_id
        ) s INTO v_target_users;
    END IF;

    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = NEW.sender_id;
    v_actor_name := COALESCE(v_actor_name, 'System');
    
    v_subject := 'New Message in ' || INITCAP(v_entity_type);
    v_message := v_actor_name || ': ' || LEFT(NEW.content, 100);

    FOREACH v_user_id IN ARRAY v_target_users
    LOOP
        IF v_user_id IS NOT NULL AND v_user_id != NEW.sender_id THEN
            INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
            VALUES (
                v_user_id, 
                v_subject, 
                v_message, 
                'chat', 
                '/' || v_entity_type || 's/' || v_entity_id::text,
                jsonb_build_object('transaction_id', v_entity_id, 'entity_type', v_entity_type, 'message_id', NEW.id)
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Attach Triggers
-- ────────────────────────────────────────────────────────────────────────────

-- Tickets
DROP TRIGGER IF EXISTS trg_tickets_unified_activity ON public.tickets;
CREATE TRIGGER trg_tickets_unified_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.handle_unified_activity('ticket');

-- Tasks
DROP TRIGGER IF EXISTS trg_tasks_unified_activity ON public.tasks;
CREATE TRIGGER trg_tasks_unified_activity
    AFTER INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_unified_activity('task');

-- Chat Sync
DROP TRIGGER IF EXISTS trg_ticket_chat_sync ON public.ticket_chat_messages;
CREATE TRIGGER trg_ticket_chat_sync
    AFTER INSERT ON public.ticket_chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_chat_sync('ticket');

DROP TRIGGER IF EXISTS trg_task_chat_sync ON public.task_comments;
CREATE TRIGGER trg_task_chat_sync
    AFTER INSERT ON public.task_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_chat_sync('task');

-- Task Assignment (Explicit ASSIGN for tasks)
CREATE OR REPLACE FUNCTION public.handle_task_assignment_activity()
RETURNS trigger AS $$
DECLARE
    v_actor_name text;
    v_draft record;
BEGIN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = auth.uid();
    SELECT * INTO v_draft FROM public.get_dynamic_draft('ASSIGN', 'task', NEW.task_id, COALESCE(v_actor_name, 'System'));

    IF NEW.profile_id != auth.uid() THEN
        INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
        VALUES (NEW.profile_id, v_draft.subject, v_draft.notification_body, 'info', '/tasks/' || NEW.task_id::text, jsonb_build_object('transaction_id', NEW.task_id, 'entity_type', 'task'));

        INSERT INTO public.communication_queue (user_id, subject, body_html, entity_id, entity_type, activity_type)
        VALUES (NEW.profile_id, v_draft.subject, v_draft.email_draft, NEW.task_id, 'task', 'ASSIGN');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_task_assignment_activity ON public.task_assignees;
CREATE TRIGGER trg_task_assignment_activity
    AFTER INSERT ON public.task_assignees
    FOR EACH ROW EXECUTE FUNCTION public.handle_task_assignment_activity();


-- ────────────────────────────────────────────────────────────────────────────
-- 6. Realtime Configuration
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMIT;

