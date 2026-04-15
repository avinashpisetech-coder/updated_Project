-- v099_grn_item_level_update.sql
-- Description: Extends GRN update RPC to allow modification of received quantities.

CREATE OR REPLACE FUNCTION public.update_grn(
    p_id                uuid,
    p_received_date     date,
    p_notes             text,
    p_challan_number    text,
    p_challan_date      date,
    p_inward_number     text,
    p_items             jsonb DEFAULT '[]'::jsonb
) RETURNS boolean AS $$
DECLARE
    v_item jsonb;
    v_purchase_item_id uuid;
    v_diff integer;
BEGIN
    -- 1. Update GRN Header
    UPDATE public.asset_grns 
    SET 
        received_date = p_received_date,
        notes = p_notes,
        challan_number = p_challan_number,
        challan_date = p_challan_date,
        inward_number = p_inward_number,
        updated_at = now()
    WHERE id = p_id;

    -- 2. Update GRN Items
    -- For each item in p_items:
    -- a. Find existing record in asset_grn_items
    -- b. Calculate difference
    -- c. Update asset_purchase_items.received_quantity
    -- d. Update asset_grn_items record
    
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_purchase_item_id := (v_item->>'purchase_item_id')::uuid;
        
        -- Calculate the difference between new received quantity and old
        SELECT (v_item->>'received_quantity')::integer - received_quantity INTO v_diff
        FROM public.asset_grn_items
        WHERE grn_id = p_id AND purchase_item_id = v_purchase_item_id;

        -- Update the running total in the PO line item
        UPDATE public.asset_purchase_items
        SET received_quantity = received_quantity + v_diff,
            updated_at = now()
        WHERE id = v_purchase_item_id;

        -- Update the GRN line item
        UPDATE public.asset_grn_items
        SET received_quantity = (v_item->>'received_quantity')::integer
        WHERE grn_id = p_id AND purchase_item_id = v_purchase_item_id;
    END LOOP;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
