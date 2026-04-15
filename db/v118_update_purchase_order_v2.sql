-- v118_update_purchase_order_v2.sql
-- Description: Deploying the missing PO Amendment RPC with full metadata and amendment sequence support.

CREATE OR REPLACE FUNCTION public.update_purchase_order_v2(
    p_id                uuid,
    p_purchase_date     date,
    p_notes             text,
    p_status            text,
    p_amendment_number  integer,
    p_other_charges     numeric,
    p_items             jsonb,
    p_supplier_id       uuid,
    p_project_id        uuid DEFAULT NULL,
    p_po_number         text DEFAULT NULL,
    p_po_type          text DEFAULT 'Domestic',
    p_branch            text DEFAULT 'HO_HEAD_OFFICE'
) RETURNS boolean AS $$
DECLARE
    v_item jsonb;
    v_total_base numeric := 0;
BEGIN
    -- 1. Update Header Metadata (Full Spectrum including Amendment Counter)
    UPDATE public.asset_purchases 
    SET 
        purchase_date = p_purchase_date,
        notes = p_notes,
        status = p_status,
        amendment_number = p_amendment_number,
        other_charges = p_other_charges,
        supplier_id = p_supplier_id,
        project_id = p_project_id,
        po_number = COALESCE(p_po_number, po_number),
        po_type = COALESCE(p_po_type, po_type),
        branch = COALESCE(p_branch, branch),
        updated_at = now()
    WHERE id = p_id;

    -- 2. Synchronize Line Items (Atomic Reset)
    DELETE FROM public.asset_purchase_items WHERE purchase_id = p_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.asset_purchase_items (
            purchase_id, 
            asset_type_id, 
            asset_name, 
            model_number,
            quantity, 
            unit_price, 
            total_price,
            item_purchase_date
        ) VALUES (
            p_id,
            (v_item->>'assetTypeId')::uuid,
            (v_item->>'name')::text,
            (v_item->>'model')::text,
            (v_item->>'quantity')::integer,
            (v_item->>'unitPrice')::numeric,
            (v_item->>'totalPrice')::numeric,
            COALESCE((v_item->>'purchaseDate')::date, p_purchase_date)
        );
        v_total_base := v_total_base + (v_item->>'totalPrice')::numeric;
    END LOOP;

    -- 3. Update Financial Aggregate (Protocol Specific)
    -- Recalculating GST (18%) and Grand Total based on new material base
    UPDATE public.asset_purchases 
    SET 
        total_raw_amount = v_total_base,
        cgst_amount = (v_total_base * 0.09),
        sgst_amount = (v_total_base * 0.09),
        grand_total = (v_total_base * 1.18) + COALESCE(p_other_charges, 0)
    WHERE id = p_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
