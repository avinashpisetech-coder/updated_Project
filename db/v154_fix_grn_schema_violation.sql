-- v154_fix_grn_schema_violation.sql
-- Description: Restore created_by column to asset_grns to ensure compatibility with legacy and hydrated protocols.

ALTER TABLE public.asset_grns 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id);

-- Backfill created_by if needed (optional)
UPDATE public.asset_grns 
SET created_by = received_by 
WHERE created_by IS NULL;
