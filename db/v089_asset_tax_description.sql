-- v089_asset_tax_description.sql
-- Description: Add descriptive metadata to individual taxes within a tax group.

ALTER TABLE public.asset_taxes
ADD COLUMN IF NOT EXISTS description text;

-- Update existing triggers (v088) will automatically pick this up as it's a structural change.
