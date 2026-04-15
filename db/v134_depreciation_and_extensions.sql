-- v134_depreciation_and_extensions.sql
-- Description: Extend assets table with financial and compliance fields

-------------------------------------------------------------------------------
-- 1. ASSET TABLE EXTENSIONS
-------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'depreciation_method') THEN
        CREATE TYPE public.depreciation_method AS ENUM (
            'straight_line', 'declining_balance', 'none'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS depreciation_method   public.depreciation_method DEFAULT 'straight_line',
ADD COLUMN IF NOT EXISTS depreciation_rate     numeric(5,2) DEFAULT 10.00, -- Annual percentage
ADD COLUMN IF NOT EXISTS salvage_value         numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchase_cost         numeric(15,2),
ADD COLUMN IF NOT EXISTS tags                  text[], -- For QR/Barcode tagging
ADD COLUMN IF NOT EXISTS discovery_metadata    jsonb DEFAULT '{}', -- Data from automated agents
ADD COLUMN IF NOT EXISTS disposal_date         date,
ADD COLUMN IF NOT EXISTS disposal_method       text,
ADD COLUMN IF NOT EXISTS disposal_certificate_url text;

-------------------------------------------------------------------------------
-- 2. ASSET AUDIT LOG (IMMUTABLE LOGS)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_audit_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    action              text NOT NULL, -- 'CREATED', 'MOVED', 'CHECKED_OUT', 'CHECKED_IN', 'RETIRED', 'MAINTENANCE'
    performed_by        uuid NOT NULL REFERENCES public.profiles(id),
    old_values          jsonb,
    new_values          jsonb,
    metadata            jsonb DEFAULT '{}',
    created_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Read audit logs" ON public.asset_audit_logs FOR SELECT TO authenticated USING (true);
    CREATE POLICY "System insert audit logs" ON public.asset_audit_logs FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
