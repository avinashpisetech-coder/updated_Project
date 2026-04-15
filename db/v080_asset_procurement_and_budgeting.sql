-- v080_asset_procurement_and_budgeting.sql
-- Description: Extend existing Companies/Projects and implement Supplier Master, Asset Types, and Year-wise Budgeting.

-------------------------------------------------------------------------------
-- 1. EXTEND EXISTING MASTERS
-------------------------------------------------------------------------------

-- Extend Companies with Taxation/Address details
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS gst_number text,
ADD COLUMN IF NOT EXISTS pan_number text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;

-- Extend Projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS description text;

-------------------------------------------------------------------------------
-- 2. NEW MASTERS (Supplier)
-------------------------------------------------------------------------------

-- Supplier Master
CREATE TABLE IF NOT EXISTS public.asset_suppliers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    address             text,
    gst_number          text,
    contact_person      text,
    email               text,
    phone               text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. ASSET HIERARCHY ENHANCEMENT
-------------------------------------------------------------------------------

-- Asset Main Types (e.g. IT Assets, Office Equipment, Furniture)
CREATE TABLE IF NOT EXISTS public.asset_types (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    description         text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Link Sub-Types to Main Types
ALTER TABLE public.asset_sub_types 
ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.asset_types(id);

-------------------------------------------------------------------------------
-- 4. BUDGETING SYSTEM
-------------------------------------------------------------------------------

-- Budget Master (Fiscal Year wise)
CREATE TABLE IF NOT EXISTS public.asset_budgets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year         text NOT NULL, -- e.g. "2026-2027"
    asset_type_id       uuid NOT NULL REFERENCES public.asset_types(id),
    allocated_amount    numeric(15,2) DEFAULT 0 NOT NULL,
    spent_amount        numeric(15,2) DEFAULT 0 NOT NULL,
    notes               text,
    created_by          uuid REFERENCES public.profiles(id),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE(fiscal_year, asset_type_id)
);

-------------------------------------------------------------------------------
-- 5. PURCHASE TRANSACTIONS
-------------------------------------------------------------------------------

-- Purchase Transactions / Purchase Orders
CREATE TABLE IF NOT EXISTS public.asset_purchases (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number           text UNIQUE NOT NULL,
    supplier_id         uuid NOT NULL REFERENCES public.asset_suppliers(id),
    project_id          uuid REFERENCES public.projects(id),
    purchase_date       date DEFAULT CURRENT_DATE,
    total_raw_amount    numeric(15,2) DEFAULT 0 NOT NULL,
    gst_percentage      numeric(5,2) DEFAULT 18.00,
    gst_amount          numeric(15,2) DEFAULT 0 NOT NULL,
    grand_total         numeric(15,2) DEFAULT 0 NOT NULL,
    status              text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
    approved_by         uuid REFERENCES public.profiles(id),
    notes               text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Link individual assets to purchase transactions
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.asset_purchases(id);

-------------------------------------------------------------------------------
-- 6. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_purchases ENABLE ROW LEVEL SECURITY;

-- Broad read for authenticated
DO $$ BEGIN
    CREATE POLICY "Read asset suppliers" ON public.asset_suppliers FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Read asset types" ON public.asset_types FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Read asset budgets" ON public.asset_budgets FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Read asset purchases" ON public.asset_purchases FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin Manage
DO $$ BEGIN
    CREATE POLICY "Admin manage suppliers" ON public.asset_suppliers FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
    CREATE POLICY "Admin manage types" ON public.asset_types FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
    CREATE POLICY "Admin manage budgets" ON public.asset_budgets FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
    CREATE POLICY "Admin manage purchases" ON public.asset_purchases FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 7. INITIAL SEED DATA
-------------------------------------------------------------------------------

INSERT INTO public.asset_types (name, description) VALUES
('IT Assets', 'Computers, Servers, Networking, and Peripherals'),
('Office Equipment', 'Furniture, Fixtures, and Appliances'),
('Machinery', 'Operating Machinery and Tools'),
('Vehicles', 'Company Transport Vehicles')
ON CONFLICT (name) DO NOTHING;

-- Map existing sub-types to IT Assets
UPDATE public.asset_sub_types 
SET type_id = (SELECT id FROM public.asset_types WHERE name = 'IT Assets')
WHERE type_id IS NULL;
