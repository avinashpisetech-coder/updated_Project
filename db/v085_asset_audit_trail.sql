-- v085_asset_audit_trail.sql
-- Description: Implement a professional chronology (audit trail) for asset procurement lifecycle.

-- 1. Create the Audit Log Table
CREATE TABLE IF NOT EXISTS public.asset_activity_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id         uuid REFERENCES public.asset_purchases(id) ON DELETE CASCADE,
    asset_id            uuid REFERENCES public.assets(id) ON DELETE CASCADE,
    action_type         text NOT NULL, -- 'PO_CREATED', 'GRN_POSTED', 'INVOICE_GENERATED', 'ASSET_HANDOVER'
    description         text,
    performed_by        uuid REFERENCES public.profiles(id),
    metadata            jsonb DEFAULT '{}'::jsonb,
    created_at          timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.asset_activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DO $$ BEGIN
    CREATE POLICY "Read asset logs" ON public.asset_activity_logs FOR SELECT TO authenticated USING (true);
    CREATE POLICY "System log activity" ON public.asset_activity_logs FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Update the PO Creation RPC to log the event
CREATE OR REPLACE FUNCTION public.create_purchase_order(
    p_po_number         text,
    p_supplier_id       uuid,
    p_project_id        uuid DEFAULT NULL,
    p_purchase_date     date DEFAULT CURRENT_DATE,
    p_total_raw_amount  numeric DEFAULT 0,
    p_total_cgst        numeric DEFAULT 0,
    p_total_sgst        numeric DEFAULT 0,
    p_total_igst        numeric DEFAULT 0,
    p_grand_total       numeric DEFAULT 0,
    p_status            text DEFAULT 'pending',
    p_notes             text DEFAULT '',
    p_items             jsonb DEFAULT '[]'::jsonb
) RETURNS uuid AS $$
DECLARE
    v_purchase_id uuid;
    v_item jsonb;
BEGIN
    -- 1. Insert Header
    INSERT INTO public.asset_purchases (
        po_number, 
        supplier_id, 
        project_id, 
        purchase_date, 
        total_raw_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        grand_total,
        status, 
        notes
    ) VALUES (
        p_po_number, 
        p_supplier_id, 
        p_project_id, 
        p_purchase_date, 
        p_total_raw_amount,
        p_total_cgst,
        p_total_sgst,
        p_total_igst,
        p_grand_total,
        p_status, 
        p_notes
    ) RETURNING id INTO v_purchase_id;

    -- 2. Insert Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.asset_purchase_items (
            purchase_id, 
            asset_type_id, 
            asset_name, 
            model_number,
            quantity, 
            unit_price, 
            total_price
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

    -- 3. Log Audit Activity
    INSERT INTO public.asset_activity_logs (
        purchase_id, 
        action_type, 
        description, 
        performed_by,
        metadata
    ) VALUES (
        v_purchase_id,
        'PO_CREATED',
        'Purchase Order generated with protocol ' || p_po_number,
        auth.uid(),
        jsonb_build_object('grand_total', p_grand_total, 'po_number', p_po_number)
    );

    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
