-- v086_master_restructure.sql
-- Description: Advanced Asset Masters, Taxation Hierarchy (Tax Group -> Taxes), and HSN Master Integration.
-- PRD Alignment: ASM_CORE standard.

-------------------------------------------------------------------------------
-- 1. TAXATION MASTERS
-------------------------------------------------------------------------------

-- Tax Group (e.g., 'GST 18%', 'GST 12%')
CREATE TABLE IF NOT EXISTS public.asset_tax_groups (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    description         text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Individual Taxes (e.g., 'CGST', 'SGST' under a Tax Group)
CREATE TABLE IF NOT EXISTS public.asset_taxes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id            uuid NOT NULL REFERENCES public.asset_tax_groups(id) ON DELETE CASCADE,
    name                text NOT NULL, -- e.g. CGST, SGST, IGST
    percentage          numeric(5,2) NOT NULL DEFAULT 0,
    created_at          timestamptz DEFAULT now()
);

-- HSN Code Master (e.g., '8471' for Computers)
CREATE TABLE IF NOT EXISTS public.asset_hsn_codes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hsn_code            text NOT NULL UNIQUE,
    description         text,
    tax_group_id        uuid REFERENCES public.asset_tax_groups(id),
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. ASSET HIERARCHY REFINEMENT
-------------------------------------------------------------------------------

-- 1. Asset Type (Exists in v080, but adding constraints if not there)
-- 2. Asset Sub Type (Exists in v078, linking it to Type)
ALTER TABLE public.asset_sub_types 
ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.asset_types(id);

-- 3. Asset Catalog (The "Product" level: Type -> Sub Type -> Catalog Asset)
CREATE TABLE IF NOT EXISTS public.asset_catalog (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_type_id         uuid NOT NULL REFERENCES public.asset_sub_types(id) ON DELETE CASCADE,
    name                text NOT NULL, -- e.g. "MacBook Pro 14 (M3 Max)"
    hsn_code_id         uuid REFERENCES public.asset_hsn_codes(id),
    brand               text,
    model_number        text,
    specifications      jsonb DEFAULT '{}'::jsonb,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(sub_type_id, name)
);

-------------------------------------------------------------------------------
-- 3. RLS POLICIES FOR NEW MASTERS
-------------------------------------------------------------------------------

ALTER TABLE public.asset_tax_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_hsn_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Authenticated read masters" ON public.asset_tax_groups FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Authenticated read taxes" ON public.asset_taxes FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Authenticated read hsn" ON public.asset_hsn_codes FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Authenticated read catalog" ON public.asset_catalog FOR SELECT TO authenticated USING (true);

    CREATE POLICY "Admin manage tax groups" ON public.asset_tax_groups FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
     CREATE POLICY "Admin manage taxes" ON public.asset_taxes FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
    CREATE POLICY "Admin manage hsn" ON public.asset_hsn_codes FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
    CREATE POLICY "Admin manage catalog" ON public.asset_catalog FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 4. LOGIC UPDATE: Link Purchases to Catalog
-------------------------------------------------------------------------------

-- Allow purchase items to link to the Catalog record
ALTER TABLE public.asset_purchase_items
ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.asset_catalog(id);

-------------------------------------------------------------------------------
-- 5. SEED DATA (Standard GST)
-------------------------------------------------------------------------------

INSERT INTO public.asset_tax_groups (name, description) VALUES
('GST 18%', 'Standard 18% GST (9% CGST + 9% SGST)'),
('GST 12%', 'Lower 12% GST (6% CGST + 6% SGST)')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.asset_taxes (group_id, name, percentage) 
SELECT id, 'CGST', 9.00 FROM public.asset_tax_groups WHERE name = 'GST 18%'
UNION ALL
SELECT id, 'SGST', 9.00 FROM public.asset_tax_groups WHERE name = 'GST 18%'
UNION ALL
SELECT id, 'CGST', 6.00 FROM public.asset_tax_groups WHERE name = 'GST 12%'
UNION ALL
SELECT id, 'SGST', 6.00 FROM public.asset_tax_groups WHERE name = 'GST 12%'
ON CONFLICT DO NOTHING;
