-- v122_final_definitive_po_protocol.sql
-- Description: PURGE all overloads and DEPLOY single definitive Referentially Aware Sync Protocol.

BEGIN;

-- 1. PURGE ALL POSSIBLE OVERLOADS of update_purchase_order_v2
-- This is necessary because PostgreSQL allows multiple functions with the same name if signatures differ,
-- but named parameter calling in Supabase/PostgREST gets confused.
DROP FUNCTION IF EXISTS public.update_purchase_order_v2(integer, uuid, uuid, jsonb, text, numeric, text, text, uuid, date, text, uuid);
DROP FUNCTION IF EXISTS public.update_purchase_order_v2(uuid, text, uuid, uuid, date, text, text, text, text, text, integer, numeric, jsonb);
DROP FUNCTION IF EXISTS public.update_purchase_order_v2(integer, text, uuid, jsonb, text, numeric, text, text, uuid, date, text, uuid);

-- 2. DEPLOY SINGLE DEFINITIVE PROTOCOL
CREATE OR REPLACE FUNCTION public.update_purchase_order_v2(
    p_id uuid,
    p_po_number text,
    p_supplier_id uuid,
    p_project_id uuid,
    p_purchase_date date,
    p_po_type text,
    p_branch text,
    p_reference text,
    p_notes text,
    p_status text,
    p_amendment_number integer,
    p_other_charges numeric,
    p_items jsonb
) RETURNS void AS $$
DECLARE
    v_item jsonb;
    v_item_ids uuid[];
BEGIN
    -- 1. Update Header Metadata (Respect the specific ID)
    UPDATE public.asset_purchases
    SET po_number = p_po_number,
        supplier_id = p_supplier_id,
        project_id = p_project_id,
        purchase_date = p_purchase_date,
        po_type = p_po_type,
        branch = p_branch,
        reference = p_reference,
        notes = p_notes,
        status = p_status,
        amendment_number = p_amendment_number,
        other_charges = p_other_charges,
        updated_at = now()
    WHERE id = p_id;

    -- 2. Secure original IDs for incoming items (ensure they are UUIDs)
    v_item_ids := ARRAY(
        SELECT (x->>'id')::uuid 
        FROM jsonb_array_elements(p_items) x 
        WHERE (x->>'id') IS NOT NULL AND (x->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

    -- 3. Delete ONLY materials NOT in the payload AND NOT already received (FK Safe)
    DELETE FROM public.asset_purchase_items 
    WHERE purchase_id = p_id 
      AND id NOT IN (SELECT unnest(v_item_ids))
      AND id NOT IN (SELECT purchase_item_id FROM public.asset_grn_items);

    -- 4. Sync Line Items (Referentially Aware)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- If ID is valid UUID, it's an existing item
        IF (v_item->>'id') IS NOT NULL AND (v_item->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            UPDATE public.asset_purchase_items
            SET unit_price = (v_item->>'unitPrice')::numeric,
                total_price = (v_item->>'totalPrice')::numeric,
                remarks = (v_item->>'remarks'),
                updated_at = now()
            WHERE id = (v_item->>'id')::uuid AND purchase_id = p_id;
        ELSE
            -- Treat as new item (Split balance or fresh addition)
            INSERT INTO public.asset_purchase_items (
                purchase_id, 
                asset_type_id, 
                asset_name, 
                model_number, 
                quantity, 
                unit_price, 
                total_price,
                remarks,
                item_purchase_date
            ) VALUES (
                p_id,
                (v_item->>'assetTypeId')::uuid,
                (v_item->>'name'),
                (v_item->>'model'),
                (v_item->>'quantity')::numeric,
                (v_item->>'unitPrice')::numeric,
                (v_item->>'totalPrice')::numeric,
                (v_item->>'remarks'),
                p_purchase_date
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
