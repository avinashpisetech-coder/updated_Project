-- v218_requirement_lifecycle_engine.sql
-- Description: Implement Requirement Lifecycle Management System
-- 1. Specialized requirement table and fields
-- 2. Configurable notification templates
-- 3. Versioning and auto-CO numbering triggers

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Schema Enhancements
-- ────────────────────────────────────────────────────────────────────────────

-- Add Requirement Flag and CO Number to main tickets table
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_requirement BOOLEAN DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS change_order_number TEXT;

-- Create specialized requirement table
CREATE TABLE IF NOT EXISTS public.ticket_requirements (
    ticket_id               uuid PRIMARY KEY REFERENCES public.tickets(id) ON DELETE CASCADE,
    version                 integer DEFAULT 1,
    approval_stage          integer DEFAULT 0, -- 0: Open, 1: Approval 1, etc.
    is_frozen               boolean DEFAULT false,
    description_of_change   text NOT NULL,
    reason_for_change        text NOT NULL,
    impact_scope            text,
    impact_timeline         text,
    risk_assessment         text,
    implementation_start_date date,
    expected_completion_date  date,
    checklist               jsonb DEFAULT '[]',
    program_type            text,
    document_name           text,
    revision_history        jsonb DEFAULT '[]',
    comments                text,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type          text UNIQUE NOT NULL, -- e.g., 'REQ_CREATE', 'REQ_APPROVAL_1', 'REQ_FINAL', 'REQ_REOPEN'
    subject_template    text NOT NULL,
    body_template       text NOT NULL,
    email_template      text NOT NULL,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Automation Logic (Triggers & Functions)
-- ────────────────────────────────────────────────────────────────────────────

-- Sequence for Change Order Numbers
CREATE SEQUENCE IF NOT EXISTS co_number_seq START 1;

-- Trigger to auto-generate CO Number and Initialize Requirement Record
CREATE OR REPLACE FUNCTION public.on_requirement_created()
RETURNS trigger AS $$
DECLARE
    v_co_number text;
BEGIN
    IF NEW.is_requirement THEN
        -- Generate CO-YYYY-XXXX
        v_co_number := 'CO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('co_number_seq')::text, 4, '0');
        
        UPDATE public.tickets 
        SET change_order_number = v_co_number 
        WHERE id = NEW.id;

        -- Revision History Initial Entry
        INSERT INTO public.ticket_requirements (
            ticket_id, 
            description_of_change, 
            reason_for_change, 
            revision_history
        ) VALUES (
            NEW.id,
            '', -- Will be filled by application logic
            '', 
            jsonb_build_array(jsonb_build_object(
                'version', '1.0',
                'date', now(),
                'description', 'Initial Requirement Creation'
            ))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_requirement_created ON public.tickets;
CREATE TRIGGER trg_requirement_created
    AFTER INSERT ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION public.on_requirement_created();

-- Updated Template Engine Logic
CREATE OR REPLACE FUNCTION public.get_dynamic_draft_v2(
    p_activity_type text,
    p_entity_type   text,
    p_transaction_id uuid,
    p_actor_name    text,
    p_custom_event  text DEFAULT NULL
) RETURNS TABLE (notification_body text, email_draft text, subject text) AS $$
DECLARE
    v_template record;
BEGIN
    -- Check if a custom template exists for this event
    SELECT * INTO v_template FROM public.notification_templates WHERE event_type = p_custom_event;
    
    IF v_template.id IS NOT NULL THEN
        -- Perform keyword replacement
        subject := replace(replace(v_template.subject_template, '{{id}}', p_transaction_id::text), '{{user}}', p_actor_name);
        notification_body := replace(replace(v_template.notification_template, '{{id}}', p_transaction_id::text), '{{user}}', p_actor_name);
        email_draft := replace(replace(v_template.email_template, '{{id}}', p_transaction_id::text), '{{user}}', p_actor_name);
    ELSE
        -- Fallback to legacy logic
        RETURN QUERY SELECT * FROM public.get_dynamic_draft(p_activity_type, p_entity_type, p_transaction_id, p_actor_name);
        RETURN;
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Seed Initial Templates
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO public.notification_templates (event_type, subject_template, body_template, email_template) VALUES
('REQ_CREATE', 'New Requirement: {{id}}', 'A new system requirement was created by {{user}}.', '<p>A new system requirement has been initiated.</p><p><strong>ID:</strong> {{id}}</p><p><strong>By:</strong> {{user}}</p>'),
('REQ_APPROVAL_1', 'Requirement Approval 1: {{id}}', 'Requirement {{id}} has received Stage 1 approval from {{user}}.', '<p>Requirement <strong>{{id}}</strong> has passed its first approval stage.</p><p><strong>Approved by:</strong> {{user}}</p>'),
('REQ_FINAL', 'Final Sign-Off: {{id}}', 'Requirement {{id}} has received FINAL approval and is now frozen.', '<p>Requirement <strong>{{id}}</strong> has been fully signed off.</p><p>The document is now frozen for implementation.</p>'),
('REQ_REOPEN', 'Requirement Reopened: {{id}}', 'Requirement {{id}} was reopened for changes by {{user}}.', '<p>Requirement <strong>{{id}}</strong> has been reopened.</p><p>A new version will be created for tracking.</p>')
ON CONFLICT (event_type) DO UPDATE SET
    subject_template = EXCLUDED.subject_template,
    body_template = EXCLUDED.body_template,
    email_template = EXCLUDED.email_template;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS & Permissions
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ticket_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read requirements" ON public.ticket_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow manage requirements" ON public.ticket_requirements FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow read templates" ON public.notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow super_admin manage templates" ON public.notification_templates FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'));

COMMIT;
