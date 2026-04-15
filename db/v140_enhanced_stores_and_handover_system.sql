-- v140_enhanced_stores_and_handover_system.sql
-- Description: Implement Enhanced Store Master, Multi-Asset Handover with Condition Tracking, and Provisioning-linked Audit Trails.

-------------------------------------------------------------------------------
-- 1. STORE MASTER EXTENSIONS
-------------------------------------------------------------------------------

ALTER TABLE public.asset_stores 
    ADD COLUMN IF NOT EXISTS contact_person text,
    ADD COLUMN IF NOT EXISTS address        text,
    ADD COLUMN IF NOT EXISTS company_id     uuid REFERENCES public.companies(id),
    ADD COLUMN IF NOT EXISTS email          text;

-------------------------------------------------------------------------------
-- 2. HANDOVER REGISTRY (Sequence & Tables)
-------------------------------------------------------------------------------

-- Sequence for Handover IDs
CREATE SEQUENCE IF NOT EXISTS public.asset_handover_number_seq;

-- Header: Professional Handover Note
CREATE TABLE IF NOT EXISTS public.asset_handovers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_number     text UNIQUE NOT NULL, -- e.g. 'HND/24-25/0001'
    recipient_id        uuid NOT NULL REFERENCES public.profiles(id),
    performed_by        uuid NOT NULL REFERENCES public.profiles(id),
    project_id          uuid REFERENCES public.projects(id),
    department_id       uuid REFERENCES public.departments(id),
    store_id            uuid REFERENCES public.asset_stores(id),
    provisioning_id     uuid REFERENCES public.asset_requisitions(id), -- Linked Provisioning Target ID
    handover_date       date DEFAULT CURRENT_DATE NOT NULL,
    status              text DEFAULT 'draft' NOT NULL, -- 'draft', 'confirmed'
    notes               text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Details: Specific Assets being Handed Over
CREATE TABLE IF NOT EXISTS public.asset_handover_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_id         uuid NOT NULL REFERENCES public.asset_handovers(id) ON DELETE CASCADE,
    asset_id            uuid NOT NULL REFERENCES public.assets(id),
    condition_status    text DEFAULT 'good' NOT NULL, -- 'mint', 'good', 'fair', 'poor'
    condition_notes     text,
    attachments         jsonb DEFAULT '[]'::jsonb, -- Photos of current situation
    created_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. AUDIT CHRONOLOGY ENHANCEMENTS
-------------------------------------------------------------------------------

-- Extend existing activity logs for Provisioning Target tracking
ALTER TABLE public.asset_activity_logs 
    ADD COLUMN IF NOT EXISTS provisioning_id uuid REFERENCES public.asset_requisitions(id),
    ADD COLUMN IF NOT EXISTS audit_category  text; -- 'MAINTENANCE', 'AUDIT', 'DEPLOYMENT', 'SYSTEM_EDIT'

-- Create an index for faster Provisioning Target lookup
CREATE INDEX IF NOT EXISTS idx_asset_activity_logs_provisioning ON public.asset_activity_logs(provisioning_id);

-------------------------------------------------------------------------------
-- 4. RLS POLICIES (Secure Documentation Access)
-------------------------------------------------------------------------------

ALTER TABLE public.asset_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_handover_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- 4.1 Handover Header Access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read relevant handovers') THEN
        CREATE POLICY "Read relevant handovers" ON public.asset_handovers FOR SELECT TO authenticated USING (
            recipient_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'procurement_admin', 'department_admin'))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage handovers') THEN
        CREATE POLICY "Admin manage handovers" ON public.asset_handovers FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'procurement_admin'))
        );
    END IF;

    -- 4.2 Handover Items Access (Inherit from Header)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read relevant handover items') THEN
        CREATE POLICY "Read relevant handover items" ON public.asset_handover_items FOR SELECT TO authenticated USING (
            EXISTS (
                SELECT 1 FROM public.asset_handovers h 
                WHERE h.id = public.asset_handover_items.handover_id 
                AND (h.recipient_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('super_admin', 'it_admin', 'procurement_admin', 'department_admin')))
            )
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 5. RPC: EXECUTE_BATCH_HANDOVER
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.execute_batch_handover(
    p_recipient_id      uuid,
    p_project_id        uuid,
    p_dept_id           uuid,
    p_store_id          uuid,
    p_provisioning_id   uuid,
    p_handover_date     date,
    p_notes             text,
    p_items             jsonb -- Array of {asset_id, condition, notes, photos}
) RETURNS text AS $$
DECLARE
    v_handover_id uuid;
    v_handover_num text;
    v_item jsonb;
    v_fy text;
BEGIN
    -- 1. Generate Financial Year Segment
    v_fy := CASE 
        WHEN EXTRACT(MONTH FROM p_handover_date) >= 4 THEN 
            SUBSTRING(EXTRACT(YEAR FROM p_handover_date)::text FROM 3 FOR 2) || '-' || SUBSTRING((EXTRACT(YEAR FROM p_handover_date) + 1)::text FROM 3 FOR 2)
        ELSE 
            SUBSTRING((EXTRACT(YEAR FROM p_handover_date) - 1)::text FROM 3 FOR 2) || '-' || SUBSTRING(EXTRACT(YEAR FROM p_handover_date)::text FROM 3 FOR 2)
    END;

    -- 2. Generate Handover ID
    v_handover_num := 'HND/FY' || v_fy || '/' || LPAD(nextval('public.asset_handover_number_seq')::text, 4, '0');

    -- 3. Insert Header
    INSERT INTO public.asset_handovers (
        handover_number, recipient_id, performed_by, project_id, department_id, store_id, provisioning_id, handover_date, notes, status
    ) VALUES (
        v_handover_num, p_recipient_id, auth.uid(), p_project_id, p_dept_id, p_store_id, p_provisioning_id, p_handover_date, p_notes, 'confirmed'
    ) RETURNING id INTO v_handover_id;

    -- 4. Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- 4.1 Insert Record Detail
        INSERT INTO public.asset_handover_items (
            handover_id, asset_id, condition_status, condition_notes, attachments
        ) VALUES (
            v_handover_id, 
            (v_item->>'asset_id')::uuid, 
            (v_item->>'condition')::text, 
            (v_item->>'notes')::text, 
            COALESCE((v_item->'photos'), '[]'::jsonb)
        );

        -- 4.2 Update Asset Status
        UPDATE public.assets 
        SET current_holder_id = p_recipient_id,
            status = 'assigned',
            received_status = 'pending',
            updated_at = now()
        WHERE id = (v_item->>'asset_id')::uuid;

        -- 4.3 Log Audit Chronology
        INSERT INTO public.asset_activity_logs (
            asset_id, provisioning_id, action_type, audit_category, description, performed_by, metadata
        ) VALUES (
            (v_item->>'asset_id')::uuid,
            p_provisioning_id,
            'ASSET_HANDOVER',
            'DEPLOYMENT',
            'Asset deployed to ' || (SELECT full_name FROM public.profiles WHERE id = p_recipient_id) || ' under protocol ' || v_handover_num,
            auth.uid(),
            jsonb_build_object('handover_id', v_handover_id, 'handover_number', v_handover_num)
        );
    END LOOP;

    RETURN v_handover_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
