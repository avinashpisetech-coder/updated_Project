-- v136_link_assets_to_tickets.sql
-- Description: Add direct asset_id linkage to tickets for ITAM integration

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES public.assets(id);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_tickets_asset_id ON public.tickets(asset_id);

-- Update RLS if necessary (already covers general ticket reading)
