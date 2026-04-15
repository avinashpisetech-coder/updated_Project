-- v153_asset_master_expansion.sql
-- Description: Expand Asset Master (Catalog) and Physical Assets with Depreciation, HSN Metadata, and Life-Cycle Tracking.

-------------------------------------------------------------------------------
-- 1. ASSET CATALOG (MASTER) EXPANSION
-------------------------------------------------------------------------------

ALTER TABLE public.asset_catalog 
    ADD COLUMN IF NOT EXISTS description           text,
    ADD COLUMN IF NOT EXISTS brand                 text,
    ADD COLUMN IF NOT EXISTS model_number          text,
    ADD COLUMN IF NOT EXISTS serial_number         text,
    ADD COLUMN IF NOT EXISTS inventory_number      text,
    ADD COLUMN IF NOT EXISTS manufacturing_date    date,
    ADD COLUMN IF NOT EXISTS expiry_date           date,
    ADD COLUMN IF NOT EXISTS date_put_to_use       date,
    ADD COLUMN IF NOT EXISTS store_id              uuid REFERENCES public.asset_stores(id),
    ADD COLUMN IF NOT EXISTS hsn_code_id           uuid REFERENCES public.asset_hsn_codes(id),
    ADD COLUMN IF NOT EXISTS depreciation_method   text DEFAULT 'Straight Line',
    ADD COLUMN IF NOT EXISTS depreciation_key      text,
    ADD COLUMN IF NOT EXISTS useful_life_years     numeric(5,2) DEFAULT 3.00,
    ADD COLUMN IF NOT EXISTS salvage_value_percent numeric(5,2) DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS depreciation_areas   jsonb DEFAULT '["Accounting", "Tax"]'::jsonb;

-------------------------------------------------------------------------------
-- 2. PHYSICAL ASSETS (INVENTORY) EXPANSION
-------------------------------------------------------------------------------

ALTER TABLE public.assets 
    ADD COLUMN IF NOT EXISTS hsn_code_id           uuid REFERENCES public.asset_hsn_codes(id),
    ADD COLUMN IF NOT EXISTS inventory_number      text UNIQUE,
    ADD COLUMN IF NOT EXISTS date_put_to_use       date,
    ADD COLUMN IF NOT EXISTS store_id              uuid REFERENCES public.asset_stores(id),
    ADD COLUMN IF NOT EXISTS salvage_value         numeric(12,2), -- Actual salvage value in currency
    ADD COLUMN IF NOT EXISTS depreciation_key      text; -- Override from Master if needed

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_assets_inventory_number ON public.assets(inventory_number);
CREATE INDEX IF NOT EXISTS idx_assets_store_id ON public.assets(store_id);

-------------------------------------------------------------------------------
-- 3. SCHEMA INTEGRITY: HSN MASTER SYNC
-------------------------------------------------------------------------------

-- Ensure HSN master handles the "click to enable" logic via metadata if needed
-- Adding a control flag for systemic behavior
ALTER TABLE public.asset_hsn_codes
    ADD COLUMN IF NOT EXISTS allows_automated_depreciation boolean DEFAULT true;

-------------------------------------------------------------------------------
-- 4. RLS UPDATES (Inherited)
-------------------------------------------------------------------------------
-- No new tables, RLS from v086 covers new columns.
