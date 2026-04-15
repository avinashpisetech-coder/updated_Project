-- v150_software_deployment_system.sql
-- Description: Professional Software Deployment (Allocation) module with document-based header/lines, same as hardware deployment.

BEGIN;

-- 1. Sequence for Software Deployment Numbers
CREATE SEQUENCE IF NOT EXISTS public.software_deployment_number_seq;

-- 2. Software Deployment Header (The Protocol Document)
CREATE TABLE IF NOT EXISTS public.software_deployments (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_number       text UNIQUE NOT NULL, -- e.g. 'SDP/24-25/0001'
    deployment_date         date DEFAULT CURRENT_DATE NOT NULL,
    recipient_id            uuid REFERENCES public.profiles(id), -- User getting the software
    project_id              uuid REFERENCES public.profiles(id), -- Or project scope
    department_id           uuid REFERENCES public.departments(id),
    status                  text DEFAULT 'draft' NOT NULL, -- 'draft', 'submitted', 'approved'
    notes                   text,
    created_by              uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- 3. Software Deployment Items (Specific Licenses allocated)
CREATE TABLE IF NOT EXISTS public.software_deployment_items (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id           uuid NOT NULL REFERENCES public.software_deployments(id) ON DELETE CASCADE,
    product_id              uuid NOT NULL REFERENCES public.software_assets(id),
    license_id              uuid NOT NULL REFERENCES public.software_licenses(id),
    remarks                 text,
    created_at              timestamptz DEFAULT now()
);

-- 4. Audit Trail for Software Deployments
CREATE TABLE IF NOT EXISTS public.software_deployment_logs (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id           uuid REFERENCES public.software_deployments(id) ON DELETE CASCADE,
    status                  text NOT NULL,
    performed_by            uuid REFERENCES public.profiles(id),
    remarks                 text,
    created_at              timestamptz DEFAULT now()
);

-- 5. RLS
ALTER TABLE public.software_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_deployment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_deployment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read s-deployments" ON public.software_deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read s-deployment items" ON public.software_deployment_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read s-deployment logs" ON public.software_deployment_logs FOR SELECT TO authenticated USING (true);

-- 6. Trigger for Number
CREATE OR REPLACE FUNCTION public.trg_generate_software_deployment_number()
RETURNS TRIGGER AS $$
DECLARE
    v_fy text;
BEGIN
    v_fy := CASE 
        WHEN EXTRACT(MONTH FROM NEW.deployment_date) >= 4 THEN 
            SUBSTRING(EXTRACT(YEAR FROM NEW.deployment_date)::text FROM 3 FOR 2) || '-' || SUBSTRING((EXTRACT(YEAR FROM NEW.deployment_date) + 1)::text FROM 3 FOR 2)
        ELSE 
            SUBSTRING((EXTRACT(YEAR FROM NEW.deployment_date) - 1)::text FROM 3 FOR 2) || '-' || SUBSTRING(EXTRACT(YEAR FROM NEW.deployment_date)::text FROM 3 FOR 2)
    END;
    NEW.deployment_number := 'SDP/FY' || v_fy || '/' || LPAD(nextval('public.software_deployment_number_seq')::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_software_deployments_number
    BEFORE INSERT ON public.software_deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_generate_software_deployment_number();

COMMIT;
