-- v212_ticket_templates.sql
-- Description: Ticket template system for pre-filling common request types.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ticket_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    module_id uuid REFERENCES public.modules(id),
    category_id uuid REFERENCES public.ticket_categories(id),
    default_priority text DEFAULT 'medium',
    subject_template text NOT NULL,
    description_template text NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active templates
CREATE POLICY "Templates read" ON public.ticket_templates
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Only admins can manage templates
CREATE POLICY "Templates write admin" ON public.ticket_templates
    FOR ALL TO authenticated
    USING (public.has_permission(auth.uid(), 'settings', 'manage'))
    WITH CHECK (public.has_permission(auth.uid(), 'settings', 'manage'));

-- Seed with common templates
INSERT INTO public.ticket_templates (name, subject_template, description_template, default_priority) VALUES
('New Employee Onboarding', 'New Employee Setup — [EMPLOYEE_NAME]', 
 'Please set up the following for new employee [EMPLOYEE_NAME] joining on [JOIN_DATE]:\n\n1. Create Active Directory account\n2. Set up email account\n3. Install required software\n4. Assign hardware\n5. Grant system access', 
 'high'),
('Password Reset Request', 'Password Reset — [USERNAME]',
 'I am unable to log into my account.\n\nUsername: [USERNAME]\nSystem: [SYSTEM_NAME]\nLast successful login: [LAST_LOGIN_DATE]\n\nPlease assist.',
 'medium'),
('Hardware Fault Report', 'Hardware Fault — [DEVICE_TYPE] — [ASSET_TAG]',
 'My [DEVICE_TYPE] (Asset Tag: [ASSET_TAG]) is experiencing the following issue:\n\nProblem Description: [DESCRIBE_ISSUE]\nSince When: [DATE_STARTED]\nImpact: [BUSINESS_IMPACT]\n\nPlease arrange for inspection/replacement.',
 'high'),
('Software Installation Request', 'Software Installation Request — [SOFTWARE_NAME]',
 'Please install the following software on my workstation:\n\nSoftware: [SOFTWARE_NAME]\nVersion Required: [VERSION]\nBusiness Justification: [REASON]\nApproval From: [MANAGER_NAME]',
 'low'),
('VPN / Remote Access Request', 'Remote Access / VPN Setup Request',
 'I require remote access to perform my duties.\n\nEmployee: [EMPLOYEE_NAME]\nDepartment: [DEPARTMENT]\nSystems Required: [SYSTEMS]\nApproval: [MANAGER_NAME]\n\nPlease configure VPN credentials.',
 'medium')
ON CONFLICT DO NOTHING;

COMMIT;
