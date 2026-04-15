-- v161_ticketing_schema_safety_patch.sql
-- Ensures critical columns exist for ITAM integration

DO $$ 
BEGIN
    -- Ensure asset_id exists for Hardware linking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='asset_id') THEN
        ALTER TABLE public.tickets ADD COLUMN asset_id uuid REFERENCES public.assets(id);
    END IF;

    -- Ensure affected_person_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='affected_person_id') THEN
        ALTER TABLE public.tickets ADD COLUMN affected_person_id uuid REFERENCES public.profiles(id);
    END IF;
END $$;
