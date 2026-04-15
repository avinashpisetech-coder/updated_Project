-- v130_enhance_budget_granularity.sql
-- Description: Implement granular budgeting (Sub-Type level) and automated tax calculation logic.

-------------------------------------------------------------------------------
-- 1. ADD NEW FISCAL COLUMNS
-------------------------------------------------------------------------------

ALTER TABLE public.asset_budgets 
ADD COLUMN IF NOT EXISTS asset_sub_type_id uuid REFERENCES public.asset_sub_types(id),
ADD COLUMN IF NOT EXISTS is_taxable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS basic_amount numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_group_id uuid REFERENCES public.asset_tax_groups(id),
ADD COLUMN IF NOT EXISTS tax_amount numeric(15,2) DEFAULT 0;

-------------------------------------------------------------------------------
-- 2. UPDATE CONSTRAINTS
-------------------------------------------------------------------------------

-- Drop old constraint based on only fiscal_year and asset_type_id
ALTER TABLE public.asset_budgets DROP CONSTRAINT IF EXISTS asset_budgets_fiscal_year_asset_type_id_key;

-- Add new granular constraint (Year, Type, and optional Sub-Type)
-- Note: PostgreSQL handles multiple NULL values in UNIQUE constraints by default (they are considered different).
-- If we want to allow only one "Global Type" budget and one "Specific Sub-Type" budget per year:
ALTER TABLE public.asset_budgets ADD CONSTRAINT asset_budgets_granular_unique UNIQUE (fiscal_year, asset_type_id, asset_sub_type_id);

-------------------------------------------------------------------------------
-- 3. MIGRATE EXISTING DATA
-------------------------------------------------------------------------------

-- For existing records, set basic_amount = allocated_amount if not set
UPDATE public.asset_budgets 
SET basic_amount = allocated_amount 
WHERE basic_amount = 0 AND allocated_amount > 0;

-------------------------------------------------------------------------------
-- 4. RLS UPDATES (Inherited, but ensure consistency)
-------------------------------------------------------------------------------

-- Ensure it_admin also has access if not previously defined broadly
DO $$ BEGIN
    CREATE POLICY "IT Admin manage budgets" ON public.asset_budgets FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
