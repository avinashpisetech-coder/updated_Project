-- v149_software_sam_professional.sql
-- Description: Professional Software Asset Management with status-driven lifecycles and dedicated audit trails for Licenses and Assignments.

BEGIN;

-- 1. Ensure Status and Enums
-- Existing: software_assets, software_licenses, software_assignments

-- 2. Audit Table for Software Licenses
CREATE TABLE IF NOT EXISTS public.software_license_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id          uuid NOT NULL, -- References software_licenses(id)
    status              text NOT NULL,
    performed_by        uuid REFERENCES public.profiles(id),
    remarks             text,
    created_at          timestamptz DEFAULT now()
);

-- 3. Audit Table for Software Assignments (Allocations)
CREATE TABLE IF NOT EXISTS public.software_assignment_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id       uuid NOT NULL, -- References software_assignments(id)
    action              text NOT NULL, -- 'ALLOCATED', 'REVOKED'
    performed_by        uuid REFERENCES public.profiles(id),
    remarks             text,
    created_at          timestamptz DEFAULT now()
);

-- 4. Status column for software_licenses if not exists
DO $$ BEGIN
    ALTER TABLE public.software_licenses ADD COLUMN status text DEFAULT 'approved';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 5. RLS
ALTER TABLE public.software_license_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_assignment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read software logs" ON public.software_license_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert software logs" ON public.software_license_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read assignment logs" ON public.software_assignment_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert assignment logs" ON public.software_assignment_logs FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;
