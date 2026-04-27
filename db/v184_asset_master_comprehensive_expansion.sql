-- v184_asset_master_comprehensive_expansion.sql
-- Description: Comprehensive expansion of the assets table to match detailed register requirements.
-- Fixes: Implements Case-Insensitivity for identifiers and Profile Export capability.

ALTER TABLE public.assets 
    ADD COLUMN IF NOT EXISTS certifying_company_id uuid REFERENCES public.companies(id),
    ADD COLUMN IF NOT EXISTS asset_name           text,
    ADD COLUMN IF NOT EXISTS asset_id_custom      text,
    ADD COLUMN IF NOT EXISTS asset_display_number text,
    ADD COLUMN IF NOT EXISTS warranty_from         date,
    ADD COLUMN IF NOT EXISTS warranty_to           date,
    ADD COLUMN IF NOT EXISTS client_name           text,
    ADD COLUMN IF NOT EXISTS invoice_date          date,
    ADD COLUMN IF NOT EXISTS supplier_id           uuid REFERENCES public.asset_suppliers(id),
    ADD COLUMN IF NOT EXISTS po_amount             numeric(12,2),
    ADD COLUMN IF NOT EXISTS tax_amount            numeric(12,2),
    ADD COLUMN IF NOT EXISTS gross_po_value        numeric(12,2),
    ADD COLUMN IF NOT EXISTS total_tax_credit      numeric(12,2),
    ADD COLUMN IF NOT EXISTS net_asset_value       numeric(12,2),
    ADD COLUMN IF NOT EXISTS warranty_remarks      text,
    ADD COLUMN IF NOT EXISTS maintenance_date      date,
    ADD COLUMN IF NOT EXISTS asset_photograph_path text;

-- 1. FIX CASE SENSITIVITY: Add functional indexes for case-insensitive searching
CREATE INDEX IF NOT EXISTS idx_assets_asset_id_custom_lower ON public.assets (LOWER(asset_id_custom));
CREATE INDEX IF NOT EXISTS idx_assets_display_number_lower ON public.assets (LOWER(asset_display_number));

-- Standard indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_assets_asset_id_custom ON public.assets(asset_id_custom);
CREATE INDEX IF NOT EXISTS idx_assets_display_number ON public.assets(asset_display_number);
CREATE INDEX IF NOT EXISTS idx_assets_supplier_id ON public.assets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_assets_certifying_company ON public.assets(certifying_company_id);

-- 2. PROFILE EXPORT: Function to export comprehensive asset profile data
CREATE OR REPLACE FUNCTION public.export_asset_profile_protocol(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile jsonb;
BEGIN
    SELECT jsonb_build_object(
        'core', to_jsonb(a.*),
        'insurance', (SELECT jsonb_agg(i) FROM public.asset_insurance i WHERE i.asset_id = a.id),
        'modifications', (SELECT jsonb_agg(m) FROM public.asset_modifications m WHERE m.asset_id = a.id),
        'history', (SELECT jsonb_agg(h) FROM public.stock_movements h WHERE h.asset_id = a.id)
    ) INTO v_profile
    FROM public.assets a
    WHERE a.id = p_asset_id;

    RETURN v_profile;
END;
$$;
