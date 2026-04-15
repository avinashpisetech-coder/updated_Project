-- v145_deployment_audit_trail.sql
-- Description: Dedicated high-fidelity status history for Asset Deployments.

BEGIN;

CREATE TABLE IF NOT EXISTS public.asset_deployment_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id       uuid REFERENCES public.asset_deployments(id) ON DELETE CASCADE,
    status              text NOT NULL,
    performed_by        uuid REFERENCES public.profiles(id),
    remarks             text,
    created_at          timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.asset_deployment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read deployment logs" ON public.asset_deployment_logs;
CREATE POLICY "Anyone can read deployment logs" ON public.asset_deployment_logs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert deployment logs" ON public.asset_deployment_logs;
CREATE POLICY "Anyone can insert deployment logs" ON public.asset_deployment_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Seed initial logs for existing deployments
INSERT INTO public.asset_deployment_logs (deployment_id, status, performed_by, remarks, created_at)
SELECT 
    id, 
    status, 
    auth.uid(), 
    'Initial System Snapshot', 
    created_at
FROM public.asset_deployments
ON CONFLICT DO NOTHING;

COMMIT;
