-- v131_add_company_project_to_budget.sql
-- Description: Implement corporate and project-level budgeting dimensions.

-------------------------------------------------------------------------------
-- 1. ADD RELATIONAL COLUMNS
-------------------------------------------------------------------------------

ALTER TABLE public.asset_budgets 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);

-------------------------------------------------------------------------------
-- 2. RECONSTRUCT CONSTRAINTS
-------------------------------------------------------------------------------

-- Drop the previous granular constraint
ALTER TABLE public.asset_budgets DROP CONSTRAINT IF EXISTS asset_budgets_granular_unique;

-- Add the new comprehensive corporate constraint
-- Year, Type, Sub-Type, Company, and Project must be unique together
ALTER TABLE public.asset_budgets ADD CONSTRAINT asset_budgets_corporate_unique UNIQUE (fiscal_year, asset_type_id, asset_sub_type_id, company_id, project_id);

-------------------------------------------------------------------------------
-- 3. INDEXING FOR PERFORMANCE
-------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_asset_budgets_company_id ON public.asset_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_asset_budgets_project_id ON public.asset_budgets(project_id);
