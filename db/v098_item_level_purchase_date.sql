-- v098_item_level_purchase_date.sql
-- Description: Extends procurement items to track granular purchase dates and individual rates.

ALTER TABLE public.asset_purchase_items 
ADD COLUMN IF NOT EXISTS item_purchase_date date DEFAULT CURRENT_DATE;

-------------------------------------------------------------------------------
-- UPDATE PO AMENDMENT RPC TO HANDLE ITEM-LEVEL DATES
-------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.update_purchase_order(uuid, date, text, text, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.update_purchase_order(
    p_id                uuid,
    p_purchase_date     date,
    p_notes             text,
    p_status            text,
    p_other_charges     numeric,
    p_items             jsonb 
) RETURNS boolean AS $$
DECLARE
    v_item jsonb;
    v_total_base numeric := 0;
BEGIN
    -- 1. Update Header Metadata
    UPDATE public.asset_purchases 
    SET 
        purchase_date = p_purchase_date,
        notes = p_notes,
        status = p_status,
        other_charges = p_other_charges,
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
