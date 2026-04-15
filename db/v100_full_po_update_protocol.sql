-- v100_full_po_update_protocol.sql
-- Description: Expand PO amendment RPC to allow updating all header metadata (Supplier, Project, etc.) in a single transaction.

DROP FUNCTION IF EXISTS public.update_purchase_order(uuid, date, text, text, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.update_purchase_order(
    p_id                uuid,
    p_purchase_date     date,
    p_notes             text,
    p_status            text,
    p_other_charges     numeric,
    p_items             jsonb,
    p_supplier_id       uuid DEFAULT NULL,
    p_project_id        uuid DEFAULT NULL,
    p_po_number         text DEFAULT NULL,
    p_po_type          text DEFAULT 'Domestic',
    p_branch            text DEFAULT 'HO_HEAD_OFFICE'
) RETURNS boolean AS $$
DECLARE
    v_item jsonb;
    v_total_base numeric := 0;
BEGIN
    -- 1. Update Header Metadata (Full Spectrum)
    UPDATE public.asset_purchases 
    SET 
        purchase_date = p_purchase_date,
        notes = p_notes,
        status = p_status,
        other_charges = p_other_charges,
        supplier_id = COALESCE(p_supplier_id, supplier_id),
        project_id = p_project_id,
        po_number = COALESCE(p_po_number, po_number),
        po_type = COALESCE(p_po_type, po_type),
        branch = COALESCE(p_branch, branch),
        updated_at = now()
    WHERE id = p_id;

    -- 2. Synchronize Line Items
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

    -- 3. Update Financial Aggregate
    -- This trigger fn_purchase_financial_recalc will handle taxes automatically if inserted via RPC trigger.
    UPDATE public.asset_purchases 
    SET 
        total_raw_amount = v_total_base,
        cgst_amount = v_total_base * 0.09,
        sgst_amount = v_total_base * 0.09,
        grand_total = v_total_base * 1.18 + COALESCE(p_other_charges, 0)
    WHERE id = p_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
