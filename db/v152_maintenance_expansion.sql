-- v152_maintenance_expansion.sql
-- Description: Expand Asset Maintenance system with comprehensive diagnostic, execution, and costing fields.
-- Includes automatic numbering and multi-stage workflow (Draft -> Submitted -> Approved).

BEGIN;

-------------------------------------------------------------------------------
-- 1. MAINTENANCE SEQUENCE CONFIGURATION
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_maintenance_sequences (
    fiscal_year         text PRIMARY KEY,
    last_number         integer DEFAULT 0 NOT NULL,
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. MAINTENANCE NUMBER GENERATOR
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_maintenance_number()
RETURNS TRIGGER AS $$
DECLARE
    current_fy text;
    next_idx integer;
BEGIN
    -- Determine Current Fiscal Year (April to March)
    IF (EXTRACT(MONTH FROM CURRENT_DATE) >= 4) THEN
        current_fy := TO_CHAR(CURRENT_DATE, 'YY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY');
    ELSE
        current_fy := TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CURRENT_DATE, 'YY');
    END IF;

    -- Get and Increment Sequence for current FY
    INSERT INTO public.asset_maintenance_sequences (fiscal_year, last_number)
    VALUES (current_fy, 1)
    ON CONFLICT (fiscal_year) DO UPDATE 
    SET last_number = asset_maintenance_sequences.last_number + 1,
        updated_at = now()
    RETURNING last_number INTO next_idx;

    -- Format: MNT/FY26-27/0001
    NEW.maintenance_number := 'MNT/FY' || current_fy || '/' || LPAD(next_idx::text, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 3. TABLE EXPANSION
-------------------------------------------------------------------------------

-- Add missing columns to asset_maintenance
ALTER TABLE public.asset_maintenance 
ADD COLUMN IF NOT EXISTS maintenance_number      text UNIQUE,
ADD COLUMN IF NOT EXISTS request_type            text,
ADD COLUMN IF NOT EXISTS priority                text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS reported_by             uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reported_date           timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS operational_effect      text, -- e.g., 'Down', 'Degraded', 'Normal'
ADD COLUMN IF NOT EXISTS description_malfunction text,
ADD COLUMN IF NOT EXISTS work_execution          text,
ADD COLUMN IF NOT EXISTS work_instructions       jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS failure_analysis        jsonb DEFAULT '{"symptom": "", "cause": "", "action": ""}',
ADD COLUMN IF NOT EXISTS task_list               jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS meter_reading           numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS uom_reading             text,
ADD COLUMN IF NOT EXISTS labor_hours             numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS safety_checklist        jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS parts_used              jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS planned_costs           jsonb DEFAULT '{"labor": 0, "material": 0, "service": 0}',
ADD COLUMN IF NOT EXISTS actual_costs            jsonb DEFAULT '{"labor": 0, "material": 0, "service": 0}',
ADD COLUMN IF NOT EXISTS downtime_hours          numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS warranty_status          text DEFAULT 'Out of Warranty';

-- 4. WORKFLOW STATUS REFINEMENT
-------------------------------------------------------------------------------

-- Drop old constraints and update status logic
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.asset_maintenance'::regclass 
          AND (contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%')
    ) LOOP
        EXECUTE 'ALTER TABLE public.asset_maintenance DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Convert enum column to text for flexibility if needed, or update the enum
-- For now, we'll use a text-based status with a CHECK constraint to align with other modules
ALTER TABLE public.asset_maintenance ALTER COLUMN status TYPE text;
ALTER TABLE public.asset_maintenance 
ADD CONSTRAINT asset_maintenance_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'cancelled', 'in_progress', 'completed'));

-- Set default
ALTER TABLE public.asset_maintenance ALTER COLUMN status SET DEFAULT 'draft';

-------------------------------------------------------------------------------
-- 5. APPLY TRIGGER
-------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS tr_auto_maintenance_number ON public.asset_maintenance;
CREATE TRIGGER tr_auto_maintenance_number
BEFORE INSERT ON public.asset_maintenance
FOR EACH ROW
WHEN (NEW.maintenance_number IS NULL)
EXECUTE FUNCTION public.generate_maintenance_number();

COMMIT;
