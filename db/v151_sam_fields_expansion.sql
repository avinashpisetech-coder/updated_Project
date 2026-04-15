-- v151_sam_fields_expansion.sql
-- Description: Expand Software Asset Management with fields for professional auditing and compliance.

BEGIN;

-- 1. Expand Software Assets (The Master Catalog)
ALTER TABLE public.software_assets 
    ADD COLUMN IF NOT EXISTS publisher_part_number text,
    ADD COLUMN IF NOT EXISTS version text,
    ADD COLUMN IF NOT EXISTS edition text;

-- 2. Expand Software Licenses (The Transaction/Entitlement)
ALTER TABLE public.software_licenses
    ADD COLUMN IF NOT EXISTS transaction_id text,
    ADD COLUMN IF NOT EXISTS transaction_type text DEFAULT 'acquisition',
    ADD COLUMN IF NOT EXISTS license_metric text DEFAULT 'Per User',
    ADD COLUMN IF NOT EXISTS maintenance_cost numeric(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS contract_reference text,
    ADD COLUMN IF NOT EXISTS compliance_status text DEFAULT 'compliant',
    ADD COLUMN IF NOT EXISTS has_downgrade_rights boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_upgrade_rights boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_reclaimable boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reclamation_status text,
    ADD COLUMN IF NOT EXISTS location text,
    ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id);

-- 3. Update license_type enum if possible, or just use text for flexibility (keeping existing enum)

COMMIT;
