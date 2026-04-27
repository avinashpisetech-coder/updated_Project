-- v184_asset_master_comprehensive_expansion.sql
-- Description: Comprehensive expansion of the assets table to match detailed register requirements.

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

-- Indexing for lookup performance
CREATE INDEX IF NOT EXISTS idx_assets_asset_id_custom ON public.assets(asset_id_custom);
CREATE INDEX IF NOT EXISTS idx_assets_display_number ON public.assets(asset_display_number);
CREATE INDEX IF NOT EXISTS idx_assets_supplier_id ON public.assets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_assets_certifying_company ON public.assets(certifying_company_id);
