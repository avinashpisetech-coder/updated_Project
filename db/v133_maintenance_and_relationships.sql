-- v133_maintenance_and_relationships.sql
-- Description: Implement Asset Maintenance, RMA tracking, and Relationship Mapping

-------------------------------------------------------------------------------
-- 1. ASSET RELATIONSHIPS (Peripheral Mapping)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_relationships (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_asset_id     uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    child_asset_id      uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    relationship_type   text DEFAULT 'connected' NOT NULL, -- 'connected', 'attached', 'component'
    created_at          timestamptz DEFAULT now(),
    UNIQUE(parent_asset_id, child_asset_id)
);

-------------------------------------------------------------------------------
-- 2. MAINTENANCE & SERVICE LOGS
-------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
        CREATE TYPE public.maintenance_type AS ENUM (
            'preventive', 'corrective', 'upgrade', 'rma', 'inspection'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_status') THEN
        CREATE TYPE public.maintenance_status AS ENUM (
            'scheduled', 'in_progress', 'completed', 'cancelled', 'out_for_rma', 'received_from_rma'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.asset_maintenance (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    type                public.maintenance_type NOT NULL,
    status              public.maintenance_status DEFAULT 'scheduled' NOT NULL,
    title               text NOT NULL,
    description         text,
    cost                numeric(15,2) DEFAULT 0,
    performed_by_vendor uuid REFERENCES public.asset_suppliers(id),
    ticket_id           uuid REFERENCES public.tickets(id), -- Link to Help Desk ticket
    scheduled_date      date,
    completed_date      date,
    rma_number          text,
    notes               text,
    created_by          uuid REFERENCES public.profiles(id),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Read asset relationships" ON public.asset_relationships FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage relationships" ON public.asset_relationships FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );

    CREATE POLICY "Read asset maintenance" ON public.asset_maintenance FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage maintenance" ON public.asset_maintenance FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
