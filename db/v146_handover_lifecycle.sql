-- v146_handover_lifecycle.sql
-- Description: Implement status-based lifecycle and audit trail for Handover Registry.

BEGIN;

-- 1. Ensure Statuses are standard
-- asset_handovers.status already exists (draft, confirmed)
-- We will align with Deployment statuses: 'draft', 'submitted', 'approved', 'deleted'

-- 2. Audit Table for Handovers
CREATE TABLE IF NOT EXISTS public.asset_handover_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_id         uuid REFERENCES public.asset_handovers(id) ON DELETE CASCADE,
    status              text NOT NULL,
    performed_by        uuid REFERENCES public.profiles(id),
    remarks             text,
    created_at          timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.asset_handover_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read handover logs" ON public.asset_handover_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert handover logs" ON public.asset_handover_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Seed initial logs
INSERT INTO public.asset_handover_logs (handover_id, status, performed_by, remarks, created_at)
SELECT 
    id, 
    status, 
    auth.uid(), 
    'Initial Handover Snapshot', 
    created_at
FROM public.asset_handovers
ON CONFLICT DO NOTHING;

COMMIT;
