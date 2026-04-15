-- v142_asset_deployment_system.sql
-- Description: Professional Deployment Module with Scope Logic, Versioned Amendments, and Stock-Linked Auto-Indents.

-------------------------------------------------------------------------------
-- 1. ENUMS & MASTER DATA
-------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deployment_status') THEN
        CREATE TYPE public.deployment_status AS ENUM (
            'draft', 'submitted', 'approved', 'requested_for_delete', 'deleted', 'cancelled'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 2. DEPLOYMENT REGISTRY
-------------------------------------------------------------------------------

-- Sequence for Deployment Numbers
CREATE SEQUENCE IF NOT EXISTS public.asset_deployment_number_seq;

-- Header: Deployment Master
CREATE TABLE IF NOT EXISTS public.asset_deployments (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_number       text UNIQUE NOT NULL, -- e.g. 'DPL/24-25/0001'
    deployment_date         date DEFAULT CURRENT_DATE NOT NULL,
    company_id              uuid NOT NULL REFERENCES public.companies(id),
    project_id              uuid NOT NULL REFERENCES public.projects(id),
    scope                   text NOT NULL CHECK (scope IN ('User scope', 'Project scope')),
    
    -- Conditional References
    recipient_id            uuid REFERENCES public.profiles(id), -- For User scope
    department_id           uuid REFERENCES public.departments(id), -- For both
    store_id                uuid REFERENCES public.asset_stores(id), -- For Project scope
    handover_to             text, -- Representative name for Project scope
    
    status                  public.deployment_status DEFAULT 'draft' NOT NULL,
    remark                  text,
    version                 int DEFAULT 1 NOT NULL, -- Amendment tracking
    
    created_by              uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- Details: Deployment Items
CREATE TABLE IF NOT EXISTS public.asset_deployment_items (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id           uuid NOT NULL REFERENCES public.asset_deployments(id) ON DELETE CASCADE,
    asset_id                uuid NOT NULL REFERENCES public.asset_catalog(id),
    uom                     text,
    quantity                int DEFAULT 1 NOT NULL,
    remark                  text,
    item_image              text,
    created_at              timestamptz DEFAULT now()
);

-- Amendments: Historical Snapshots
CREATE TABLE IF NOT EXISTS public.asset_deployment_amendments (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id           uuid NOT NULL REFERENCES public.asset_deployments(id) ON DELETE CASCADE,
    version_number          int NOT NULL,
    snapshot                jsonb NOT NULL, -- Full JSON dump of header + items
    change_summary          text, -- Summary of what changed (Added/Mod/Del)
    created_by              uuid DEFAULT auth.uid() REFERENCES public.profiles(id),
    created_at              timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_deployment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_deployment_amendments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Select: All authenticated can read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read deployments') THEN
        CREATE POLICY "Read deployments" ON public.asset_deployments FOR SELECT TO authenticated USING (true);
    END IF;
    
    -- Manage: Super Admin and IT Admin
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage deployments') THEN
        CREATE POLICY "Admin manage deployments" ON public.asset_deployments FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
        );
    END IF;

    -- Items Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read deployment items') THEN
        CREATE POLICY "Read deployment items" ON public.asset_deployment_items FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage deployment items') THEN
        CREATE POLICY "Admin manage deployment items" ON public.asset_deployment_items FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 4. LOGIC ENGINE: DEPLOYMENT SETTLEMENT & AMENDMENT
-------------------------------------------------------------------------------

-- 4.1 FUNCTION: GENERATE DEPLOYMENT NUMBER
CREATE OR REPLACE FUNCTION public.generate_deployment_number(p_date date) RETURNS text AS $$
DECLARE
    v_fy text;
BEGIN
    v_fy := CASE 
        WHEN EXTRACT(MONTH FROM p_date) >= 4 THEN 
            SUBSTRING(EXTRACT(YEAR FROM p_date)::text FROM 3 FOR 2) || '-' || SUBSTRING((EXTRACT(YEAR FROM p_date) + 1)::text FROM 3 FOR 2)
        ELSE 
            SUBSTRING((EXTRACT(YEAR FROM p_date) - 1)::text FROM 3 FOR 2) || '-' || SUBSTRING(EXTRACT(YEAR FROM p_date)::text FROM 3 FOR 2)
    END;
    RETURN 'DPL/FY' || v_fy || '/' || LPAD(nextval('public.asset_deployment_number_seq')::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_generate_deployment_number() RETURNS trigger AS $$
BEGIN
    IF NEW.deployment_number IS NULL OR NEW.deployment_number = '' THEN
        NEW.deployment_number := public.generate_deployment_number(NEW.deployment_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_deployments_number ON public.asset_deployments;
CREATE TRIGGER trg_asset_deployments_number
    BEFORE INSERT ON public.asset_deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_generate_deployment_number();

-- 4.2 FUNCTION: APPROVE DEPLOYMENT (Stock Check + Asset Update + Auto Indent)
CREATE OR REPLACE FUNCTION public.approve_deployment(p_id uuid) RETURNS void AS $$
DECLARE
    v_item RECORD;
    v_stock_qty int;
    v_allow_negative boolean;
    v_sub_type_id uuid;
    v_req_id uuid;
    v_req_item_id uuid;
BEGIN
    -- 1. Update Header Status
    UPDATE public.asset_deployments SET status = 'approved', updated_at = now() WHERE id = p_id;

    -- 2. Process Items
    FOR v_item IN SELECT * FROM public.asset_deployment_items WHERE deployment_id = p_id
    LOOP
        -- Get Asset Sub-type for stock control via the Master Catalog
        SELECT sub_type_id INTO v_sub_type_id FROM public.asset_catalog WHERE id = v_item.asset_id;
        SELECT allow_negative_stock INTO v_allow_negative FROM public.asset_sub_types WHERE id = v_sub_type_id;
        
        -- Check Real-time Stock for this sub-type
        SELECT count(*) INTO v_stock_qty 
        FROM public.assets 
        WHERE sub_type_id = v_sub_type_id 
          AND status = 'in_stock'; 

        -- Logic: Asset Update (We do not update physical units here, only deployment lists are kept)

        -- Logic: Auto Indent if stock is low and allowed
        IF v_stock_qty < v_item.quantity AND v_allow_negative THEN
            -- Create Requisition
            INSERT INTO public.asset_requisitions (
                requisition_number, requested_by, project_id, department_id, store_id, justification, status
            ) VALUES (
                'REQ-AUTO-' || (SELECT deployment_number FROM public.asset_deployments WHERE id = p_id) || '-' || v_item.id,
                auth.uid(),
                (SELECT project_id FROM public.asset_deployments WHERE id = p_id),
                (SELECT department_id FROM public.asset_deployments WHERE id = p_id),
                (SELECT store_id FROM public.asset_deployments WHERE id = p_id),
                'Automated indent triggered by Deployment ' || (SELECT deployment_number FROM public.asset_deployments WHERE id = p_id),
                'pending_approval'
            ) RETURNING id INTO v_req_id;

            -- Create Requisition Item
            INSERT INTO public.asset_requisition_items (
                requisition_id, sub_type_id, quantity
            ) VALUES (
                v_req_id, v_sub_type_id, v_item.quantity
            ) RETURNING id INTO v_req_item_id;

            -- Create Indent
            INSERT INTO public.asset_indents (
                indent_number, requisition_item_id, sub_type_id, quantity, status, project_id, store_id, department_id, resolution_type
            ) VALUES (
                'IND-AUTO-' || (SELECT deployment_number FROM public.asset_deployments WHERE id = p_id) || '-' || v_item.id,
                v_req_item_id,
                v_sub_type_id,
                v_item.quantity,
                'pending',
                (SELECT project_id FROM public.asset_deployments WHERE id = p_id),
                (SELECT store_id FROM public.asset_deployments WHERE id = p_id),
                (SELECT department_id FROM public.asset_deployments WHERE id = p_id),
                'auto_triggered'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 FUNCTION: CREATE DEPLOYMENT AMENDMENT (Snapshot & Version Bump)
CREATE OR REPLACE FUNCTION public.create_deployment_amendment(
    p_id uuid,
    p_summary text
) RETURNS void AS $$
DECLARE
    v_snapshot jsonb;
    v_version int;
BEGIN
    -- 1. Caputre Snapshot (Header + Items)
    SELECT jsonb_build_object(
        'header', (SELECT row_to_json(h) FROM (SELECT * FROM public.asset_deployments WHERE id = p_id) h),
        'items', (SELECT jsonb_agg(row_to_json(i)) FROM (SELECT * FROM public.asset_deployment_items WHERE deployment_id = p_id) i)
    ) INTO v_snapshot;

    -- 2. Get Current Version
    SELECT version INTO v_version FROM public.asset_deployments WHERE id = p_id;

    -- 3. Insert Amendment Record
    INSERT INTO public.asset_deployment_amendments (
        deployment_id, version_number, snapshot, change_summary
    ) VALUES (
        p_id, v_version, v_snapshot, p_summary
    );

    -- 4. Bump Version & Reset Status to Draft
    UPDATE public.asset_deployments 
    SET version = version + 1,
        status = 'draft',
        updated_at = now()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

