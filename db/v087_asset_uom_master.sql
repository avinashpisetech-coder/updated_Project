-- v087_asset_uom_master.sql
-- Description: Implement a professional Unit of Measurement (UOM) registry to ensure data normalization.

-------------------------------------------------------------------------------
-- 1. UOM REGISTRY
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_uom (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE, -- e.g. "Meter", "Quantity", "Kilogram"
    symbol              text NOT NULL UNIQUE, -- e.g. "MTR", "QTY", "KG"
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

-- 2. Link UOM to Asset Catalog
ALTER TABLE public.asset_catalog
ADD COLUMN IF NOT EXISTS uom_id uuid REFERENCES public.asset_uom(id);

-------------------------------------------------------------------------------
-- 3. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_uom ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Read UOM registry" ON public.asset_uom FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage UOM" ON public.asset_uom FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 4. SEED DATA (Standard UOMs)
-------------------------------------------------------------------------------

INSERT INTO public.asset_uom (name, symbol) VALUES
('Numbers', 'NOS'),
('Kilograms', 'KG'),
('Meters', 'MTR'),
('Boxes', 'BOX'),
('Pallets', 'PAL'),
('Set', 'SET')
ON CONFLICT DO NOTHING;
