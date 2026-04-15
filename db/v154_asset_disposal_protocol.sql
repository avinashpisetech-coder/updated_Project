-- v154_asset_disposal_protocol.sql
-- Description: Professional Asset Disposal & Scrap management with multi-stage approval, Certificate of Destruction tracking, and Financial write-off logic.

BEGIN;

-- 1. Sequence for Disposal Numbers
CREATE SEQUENCE IF NOT EXISTS public.asset_disposal_number_seq;

-- 2. Disposal Header
CREATE TABLE IF NOT EXISTS public.asset_disposals (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disposal_number     text UNIQUE NOT NULL, -- e.g. 'DSP/24-25/0001'
    disposal_type       text DEFAULT 'scrap' NOT NULL, -- 'scrap', 'sale', 'donation', 'theft', 'lost'
    status              text DEFAULT 'draft' NOT NULL, -- 'draft', 'pending_approval', 'approved', 'processed', 'cancelled'
    
    -- Request Details
    reason              text NOT NULL,
    requested_by        uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
    requested_at        timestamptz DEFAULT now(),
    
    -- Approval Details (Finance/Admin)
    approved_by         uuid REFERENCES public.profiles(id),
    approved_at         timestamptz,
    approval_notes      text,
    
    -- Finalization Details
    vendor_name         text, -- E-waste vendor or scrap buyer
    sale_value          numeric(12,2) DEFAULT 0, -- If sold
    disposal_date       date,
    certificate_url     text, -- Link to Certificate of Destruction
    
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- 3. Disposal Items
CREATE TABLE IF NOT EXISTS public.asset_disposal_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disposal_id         uuid NOT NULL REFERENCES public.asset_disposals(id) ON DELETE CASCADE,
    asset_id            uuid NOT NULL REFERENCES public.assets(id),
    book_value_at_time  numeric(12,2), -- Snapshot of value during disposal request
    condition_notes     text,
    created_at          timestamptz DEFAULT now()
);

-- 4. Audit Table for Disposals
CREATE TABLE IF NOT EXISTS public.asset_disposal_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    disposal_id         uuid REFERENCES public.asset_disposals(id) ON DELETE CASCADE,
    status              text NOT NULL,
    performed_by        uuid REFERENCES public.profiles(id),
    remarks             text,
    created_at          timestamptz DEFAULT now()
);

-- 5. RLS
ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_disposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_disposal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Disposals read access" ON public.asset_disposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Disposal items read access" ON public.asset_disposal_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Disposal logs read access" ON public.asset_disposal_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage disposals" ON public.asset_disposals FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'procurement_admin'))
);

CREATE POLICY "Admin manage disposal items" ON public.asset_disposal_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'procurement_admin'))
);

-- 6. Trigger for Disposal Number
CREATE OR REPLACE FUNCTION public.trg_generate_disposal_number()
RETURNS TRIGGER AS $$
DECLARE
    v_fy text;
BEGIN
    v_fy := CASE 
        WHEN EXTRACT(MONTH FROM now()) >= 4 THEN 
            SUBSTRING(EXTRACT(YEAR FROM now())::text FROM 3 FOR 2) || '-' || SUBSTRING((EXTRACT(YEAR FROM now()) + 1)::text FROM 3 FOR 2)
        ELSE 
            SUBSTRING((EXTRACT(YEAR FROM now()) - 1)::text FROM 3 FOR 2) || '-' || SUBSTRING(EXTRACT(YEAR FROM now())::text FROM 3 FOR 2)
    END;
    NEW.disposal_number := 'DSP/' || v_fy || '/' || LPAD(nextval('public.asset_disposal_number_seq')::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_asset_disposals_number
    BEFORE INSERT ON public.asset_disposals
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_generate_disposal_number();

COMMIT;
