-- v096_purchase_aggregates_and_rpc.sql
-- Description: Standardize the Procurement Aggregate registry and re-engineer the PO Authorization RPC.

-------------------------------------------------------------------------------
-- 0. CLEANUP (DROP ALL OLD VERSIONS TO AVOID SIGNATURE CONFLICTS)
-------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_purchase_order(text,uuid,uuid,date,numeric,numeric,numeric,numeric,text,text,jsonb); -- 11 params version (v081)
DROP FUNCTION IF EXISTS public.create_purchase_order(text,uuid,uuid,date,numeric,numeric,numeric,numeric,numeric,text,text,jsonb); -- 12 params version (v084)

-------------------------------------------------------------------------------
-- 1. EXTEND PURCHASE REGISTRY
-------------------------------------------------------------------------------

ALTER TABLE public.asset_purchases 
ADD COLUMN IF NOT EXISTS cgst_amount     numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS sgst_amount     numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS igst_amount     numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS other_charges    numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS gst_amount       numeric(15,2) DEFAULT 0 NOT NULL;

-------------------------------------------------------------------------------
-- 2. RE-ENGINEER PO AUTHORIZATION RPC
-------------------------------------------------------------------------------

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
    -- 1. Insert Header with full financial breakdown
    INSERT INTO public.asset_purchases (
        po_number, supplier_id, project_id, purchase_date,
        total_raw_amount, cgst_amount, sgst_amount, igst_amount, 
        gst_amount, grand_total, status, notes
    ) VALUES (
        p_po_number, p_supplier_id, p_project_id, p_purchase_date,
        p_total_raw_amount, p_total_cgst, p_total_sgst, p_total_igst,
        (p_total_cgst + p_total_sgst + p_total_igst), p_grand_total,
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
