-- v081_asset_grn_and_inventory_integration.sql
-- Description: Implement PO Line Items, GRN (Goods Receipt Note), and Inventory Stock Integration.

-------------------------------------------------------------------------------
-- 0. PRE-REQUISITES (Fix Role Enum)
-------------------------------------------------------------------------------

DO $$ BEGIN
    ALTER TYPE public.user_role ADD VALUE 'it_admin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 1. PURCHASE LINE ITEMS
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_purchase_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id         uuid NOT NULL REFERENCES public.asset_purchases(id) ON DELETE CASCADE,
    asset_type_id       uuid NOT NULL REFERENCES public.asset_types(id),
    asset_name          text NOT NULL,
    model_number        text,
    quantity            integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price          numeric(15,2) NOT NULL DEFAULT 0,
    total_price         numeric(15,2) NOT NULL DEFAULT 0, -- quantity * unit_price
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. GOODS RECEIPT NOTE (GRN)
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_grns (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id         uuid NOT NULL REFERENCES public.asset_purchases(id) ON DELETE CASCADE,
    grn_number          text UNIQUE NOT NULL, -- e.g. "GRN-2026-001"
    received_date       date DEFAULT CURRENT_DATE,
    received_by         uuid REFERENCES public.profiles(id),
    status              text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes               text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Tracking individual item receipts
CREATE TABLE IF NOT EXISTS public.asset_grn_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id              uuid NOT NULL REFERENCES public.asset_grns(id) ON DELETE CASCADE,
    purchase_item_id    uuid NOT NULL REFERENCES public.asset_purchase_items(id),
    received_quantity   integer NOT NULL DEFAULT 0,
    created_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. INVOICING
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_invoices (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id         uuid NOT NULL REFERENCES public.asset_purchases(id) ON DELETE CASCADE,
    invoice_number      text NOT NULL,
    invoice_date        date NOT NULL,
    due_date            date,
    total_untaxed       numeric(15,2) NOT NULL,
    total_tax           numeric(15,2) NOT NULL,
    total_grand         numeric(15,2) NOT NULL,
    status              text DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partially_paid')),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 4. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_grns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_invoices ENABLE ROW LEVEL SECURITY;

-- Select for Authenticated
DO $$ BEGIN
    CREATE POLICY "Read procurement items" ON public.asset_purchase_items FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Read asset GRNs" ON public.asset_grns FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Read GRN items" ON public.asset_grn_items FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Read asset invoices" ON public.asset_invoices FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin Manage
DO $$ BEGIN
    CREATE POLICY "Admin manage procurement items" ON public.asset_purchase_items FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
    );
    CREATE POLICY "Admin manage GRNs" ON public.asset_grns FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
    );
    CREATE POLICY "Admin manage GRN items" ON public.asset_grn_items FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
    );
    CREATE POLICY "Admin manage invoices" ON public.asset_invoices FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 5. FUNCTION: POST GRN TO INVENTORY
-------------------------------------------------------------------------------
-- Automatically creates records in the `assets` table when a GRN is completed.

CREATE OR REPLACE FUNCTION public.post_grn_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    i INTEGER;
    v_asset_sub_type_id UUID;
BEGIN
    IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
        -- Loop through all items in this GRN
        FOR item_record IN 
            SELECT 
                api.asset_name, 
                api.model_number, 
                api.asset_type_id,
                agi.received_quantity,
                ap.purchase_date,
                ap.supplier_id,
                ap.id as purchase_id
            FROM public.asset_grn_items agi
            JOIN public.asset_purchase_items api ON agi.purchase_item_id = api.id
            JOIN public.asset_purchases ap ON api.purchase_id = ap.id
            WHERE agi.grn_id = NEW.id
        LOOP
            -- For each received quantity, create one asset record
            FOR i IN 1..item_record.received_quantity LOOP
                -- We need a default sub-type if not specified. 
                -- We'll try to find any sub-type that matches the type.
                SELECT id INTO v_asset_sub_type_id 
                FROM public.asset_sub_types 
                WHERE type_id = item_record.asset_type_id 
                LIMIT 1;

                INSERT INTO public.assets (
                    name, 
                    model, 
                    sub_type_id, 
                    purchase_id,
                    purchase_date,
                    status,
                    is_active
                ) VALUES (
                    item_record.asset_name,
                    item_record.model_number,
                    v_asset_sub_type_id,
                    item_record.purchase_id,
                    item_record.purchase_date,
                    'in_stock',
                    true
                );
            END LOOP;
        END LOOP;
        
        -- Also update PO status
        UPDATE public.asset_purchases 
        SET status = 'received' 
        WHERE id = NEW.purchase_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_post_grn_to_inventory ON public.asset_grns;
CREATE TRIGGER trigger_post_grn_to_inventory
AFTER UPDATE OF status ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.post_grn_to_inventory();

-------------------------------------------------------------------------------
-- 6. RPC: CREATE PURCHASE ORDER WITH ITEMS
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_purchase_order(
    p_po_number text,
    p_supplier_id uuid,
    p_project_id uuid,
    p_purchase_date date,
    p_total_raw_amount numeric,
    p_gst_percentage numeric,
    p_gst_amount numeric,
    p_grand_total numeric,
    p_status text,
    p_notes text,
    p_items jsonb
) RETURNS uuid AS $$
DECLARE
    v_purchase_id uuid;
    v_item jsonb;
BEGIN
    -- 1. Insert Header
    INSERT INTO public.asset_purchases (
        po_number, supplier_id, project_id, purchase_date,
        total_raw_amount, gst_percentage, gst_amount, grand_total,
        status, notes
    ) VALUES (
        p_po_number, p_supplier_id, p_project_id, p_purchase_date,
        p_total_raw_amount, p_gst_percentage, p_gst_amount, p_grand_total,
        p_status, p_notes
    ) RETURNING id INTO v_purchase_id;

    -- 2. Insert Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.asset_purchase_items (
            purchase_id, asset_type_id, asset_name, model_number,
            quantity, unit_price, total_price
        ) VALUES (
            v_purchase_id,
            (v_item->>'assetTypeId')::uuid,
            (v_item->>'name')::text,
            (v_item->>'model')::text,
            (v_item->>'quantity')::integer,
            (v_item->>'unitPrice')::numeric,
            (v_item->>'totalPrice')::numeric
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
