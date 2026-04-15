-- v137_asset_requisitions_and_indents.sql
-- Description: Implement IT Dispatcher requisitions, Indent state machine, and granular stock hierarchy tracking.

-------------------------------------------------------------------------------
-- 0. PRE-REQUISITES (Role Extension)
-------------------------------------------------------------------------------
-- Ensure the procurement_admin role exists before applying policies
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'procurement_admin';

-------------------------------------------------------------------------------
-- 1. ASSET STORES (Stockroom Hierarchy)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_stores (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    code                text UNIQUE NOT NULL, -- e.g. 'STORE-MUM-01'
    project_id          uuid REFERENCES public.projects(id), -- Optional project-specific store
    location            text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. REQUISITIONS & INDENTS
-------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_status') THEN
        CREATE TYPE public.requisition_status AS ENUM (
            'draft', 'pending_approval', 'approved', 'rejected', 'partially_fulfilled', 'fulfilled'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'indent_status') THEN
        CREATE TYPE public.indent_status AS ENUM (
            'pending', 'transfer_initiated', 'po_linked', 'fulfilled', 'cancelled'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Header for Request (Raised by IT Dispatchperson or User)
CREATE TABLE IF NOT EXISTS public.asset_requisitions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_number  text UNIQUE NOT NULL, -- e.g. 'REQ-2026-0001'
    requested_by        uuid NOT NULL REFERENCES public.profiles(id), -- IT Dispatcher/User
    on_behalf_of        uuid REFERENCES public.profiles(id), -- For new joiners
    project_id          uuid REFERENCES public.projects(id),
    department_id       uuid REFERENCES public.departments(id),
    store_id            uuid REFERENCES public.asset_stores(id),
    status              public.requisition_status DEFAULT 'draft' NOT NULL,
    priority            text DEFAULT 'medium' NOT NULL,
    justification       text,
    notes               text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Items within a Request
CREATE TABLE IF NOT EXISTS public.asset_requisition_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_id      uuid NOT NULL REFERENCES public.asset_requisitions(id) ON DELETE CASCADE,
    sub_type_id         uuid NOT NULL REFERENCES public.asset_sub_types(id),
    quantity            int DEFAULT 1 NOT NULL,
    estimated_unit_cost numeric(15,2),
    specifications      jsonb DEFAULT '{}',
    status              text DEFAULT 'pending' NOT NULL, -- 'pending', 'indent_raised', 'allocated'
    created_at          timestamptz DEFAULT now()
);

-- Indents (Gap tracking when stock is 0)
CREATE TABLE IF NOT EXISTS public.asset_indents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indent_number       text UNIQUE NOT NULL, -- e.g. 'IND-2026-0001'
    requisition_item_id uuid NOT NULL REFERENCES public.asset_requisition_items(id) ON DELETE CASCADE,
    sub_type_id         uuid NOT NULL REFERENCES public.asset_sub_types(id),
    quantity            int NOT NULL,
    status              public.indent_status DEFAULT 'pending' NOT NULL,
    project_id          uuid REFERENCES public.projects(id),
    store_id            uuid REFERENCES public.asset_stores(id),
    department_id       uuid REFERENCES public.departments(id),
    resolution_type     text, -- 'transfer' or 'purchase'
    source_store_id     uuid REFERENCES public.asset_stores(id), -- For Transfer type
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Junction table linking PO Line Items to Indents
CREATE TABLE IF NOT EXISTS public.po_item_indents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    po_item_id          uuid NOT NULL REFERENCES public.asset_purchase_items(id) ON DELETE CASCADE,
    indent_id           uuid NOT NULL REFERENCES public.asset_indents(id) ON DELETE CASCADE,
    allocated_quantity  int NOT NULL,
    created_at          timestamptz DEFAULT now(),
    UNIQUE(po_item_id, indent_id)
);

-------------------------------------------------------------------------------
-- 3. ASSET TABLE EXTENSIONS (Granular Tracking)
-------------------------------------------------------------------------------

ALTER TABLE public.assets 
    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
    ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.asset_stores(id),
    ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id),
    ADD COLUMN IF NOT EXISTS received_status text DEFAULT 'pending' NOT NULL, -- 'pending', 'received'
    ADD COLUMN IF NOT EXISTS received_at timestamptz,
    ADD COLUMN IF NOT EXISTS indent_id uuid REFERENCES public.asset_indents(id);

-------------------------------------------------------------------------------
-- 4. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_indents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_item_indents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- Stores: Read for all, manage for IT Admin
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read stores') THEN
        CREATE POLICY "Read stores" ON public.asset_stores FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin manage stores') THEN
        CREATE POLICY "Admin manage stores" ON public.asset_stores FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
        );
    END IF;

    -- Requisitions: Read for requester/holder/admin
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read own requisitions') THEN
        CREATE POLICY "Read own requisitions" ON public.asset_requisitions FOR SELECT TO authenticated USING (
            requested_by = auth.uid() OR on_behalf_of = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Create requisitions') THEN
        CREATE POLICY "Create requisitions" ON public.asset_requisitions FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin update requisitions') THEN
        CREATE POLICY "Admin update requisitions" ON public.asset_requisitions FOR UPDATE TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
        );
    END IF;

    -- Indents & PO Links: Read for all, manage for IT/Procurement Admin
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Read indents') THEN
        CREATE POLICY "Read indents" ON public.asset_indents FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Manage indents') THEN
        -- Hardened cast to text to avoid enum mismatch if enum hasn't committed yet (Postgres quirk)
        CREATE POLICY "Manage indents" ON public.asset_indents FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'procurement_admin'))
        );
    END IF;

EXCEPTION WHEN duplicate_object THEN NULL; END $$;
