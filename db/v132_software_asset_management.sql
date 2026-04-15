-- v132_software_asset_management.sql
-- Description: Implement SAM (Software Asset Management) tables

-------------------------------------------------------------------------------
-- 1. SOFTWARE ASSETS (Catalog)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.software_assets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    publisher           text,
    category            text, -- e.g. 'Operating System', 'IDEs', 'SaaS'
    description         text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. SOFTWARE LICENSES (Inventory)
-------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_type') THEN
        CREATE TYPE public.license_type AS ENUM (
            'perpetual', 'subscription', 'per_node', 'per_user', 'open_source'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.software_licenses (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    software_id         uuid NOT NULL REFERENCES public.software_assets(id) ON DELETE CASCADE,
    license_key         text,
    license_type        public.license_type DEFAULT 'subscription',
    seat_count          int DEFAULT 1 NOT NULL,
    cost                numeric(15,2) DEFAULT 0,
    currency            text DEFAULT 'INR',
    purchase_date       date,
    expiry_date         date,
    vendor_id           uuid REFERENCES public.asset_suppliers(id),
    purchase_id         uuid REFERENCES public.asset_purchases(id),
    notes               text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. LICENSE ASSIGNMENTS (Relationship)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.software_assignments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id          uuid NOT NULL REFERENCES public.software_licenses(id) ON DELETE CASCADE,
    asset_id            uuid REFERENCES public.assets(id), -- Null if assigned to user directly
    user_id             uuid REFERENCES public.profiles(id), -- Null if assigned to hardware directly
    assigned_at         timestamptz DEFAULT now(),
    unassigned_at       timestamptz,
    is_active           boolean DEFAULT true,
    CHECK (asset_id IS NOT NULL OR user_id IS NOT NULL)
);

-------------------------------------------------------------------------------
-- 4. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.software_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.software_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read software assets" ON public.software_assets FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage software assets" ON public.software_assets FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );

    CREATE POLICY "Read software licenses" ON public.software_licenses FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage software licenses" ON public.software_licenses FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );

    CREATE POLICY "Read software assignments" ON public.software_assignments FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage software assignments" ON public.software_assignments FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
