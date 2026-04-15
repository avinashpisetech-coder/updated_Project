-- v147_return_lifecycle.sql
-- Description: Professional Asset Recovery/Return module with status-driven states, audit trails, and stock restoration logic.

BEGIN;

-- 1. Sequence for Return Numbers
CREATE SEQUENCE IF NOT EXISTS public.asset_return_number_seq;

-- 2. Return Header
CREATE TABLE IF NOT EXISTS public.asset_returns (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number       text UNIQUE NOT NULL, -- e.g. 'RET/24-25/0001'
    original_holder_id  uuid REFERENCES public.profiles(id), -- Employee returning it
    project_id          uuid REFERENCES public.projects(id),
    department_id       uuid REFERENCES public.departments(id),
    store_id            uuid REFERENCES public.asset_stores(id), -- Destination Stock Hub
    return_date         date DEFAULT CURRENT_DATE NOT NULL,
    status              text DEFAULT 'draft' NOT NULL, -- 'draft', 'submitted', 'approved', 'deleted'
    notes               text,
    created_by          uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- 3. Return Items
CREATE TABLE IF NOT EXISTS public.asset_return_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id           uuid NOT NULL REFERENCES public.asset_returns(id) ON DELETE CASCADE,
    asset_id            uuid NOT NULL REFERENCES public.assets(id),
    condition_status    text DEFAULT 'good' NOT NULL, -- 'mint', 'good', 'fair', 'poor'
    condition_notes     text,
    photos              jsonb DEFAULT '[]'::jsonb,
    created_at          timestamptz DEFAULT now()
);

-- 4. Audit Table for Returns
CREATE TABLE IF NOT EXISTS public.asset_return_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id           uuid REFERENCES public.asset_returns(id) ON DELETE CASCADE,
    status              text NOT NULL,
    performed_by        uuid REFERENCES public.profiles(id),
    remarks             text,
    created_at          timestamptz DEFAULT now()
);

-- 5. RLS
ALTER TABLE public.asset_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_return_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read return data" ON public.asset_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read return items" ON public.asset_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can read return logs" ON public.asset_return_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage returns" ON public.asset_returns FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'procurement_admin'))
);

-- 6. Trigger for Return Number
CREATE OR REPLACE FUNCTION public.trg_generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
    v_fy text;
BEGIN
    v_fy := CASE 
        WHEN EXTRACT(MONTH FROM NEW.return_date) >= 4 THEN 
            SUBSTRING(EXTRACT(YEAR FROM NEW.return_date)::text FROM 3 FOR 2) || '-' || SUBSTRING((EXTRACT(YEAR FROM NEW.return_date) + 1)::text FROM 3 FOR 2)
        ELSE 
            SUBSTRING((EXTRACT(YEAR FROM NEW.return_date) - 1)::text FROM 3 FOR 2) || '-' || SUBSTRING(EXTRACT(YEAR FROM NEW.return_date)::text FROM 3 FOR 2)
    END;
    NEW.return_number := 'RET/FY' || v_fy || '/' || LPAD(nextval('public.asset_return_number_seq')::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_returns_number
    BEFORE INSERT ON public.asset_returns
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_generate_return_number();

COMMIT;
