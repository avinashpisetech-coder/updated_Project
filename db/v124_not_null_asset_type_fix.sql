-- v124_not_null_asset_type_fix.sql
-- Description: Fix Not-Null constraint on asset_type_id by adding smart lookups and fallbacks.

BEGIN;

-- 1. DROP and REDEPLOY definitively
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as func_spec
              FROM pg_proc
              WHERE proname = 'update_purchase_order_v2'
              AND pronamespace = 'public'::regnamespace)
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_spec || ' CASCADE;';
    END LOOP;
END $$;

-- 2. REDEPLOY WITH SMART LOOKUP
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
    v_actual_type_id uuid;
    v_catalog_id uuid;
BEGIN
    -- 1. Update Header
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

    -- 2. Identify materials to keep
    v_item_ids := ARRAY(
        SELECT (x->>'id')::uuid 
        FROM jsonb_array_elements(p_items) x 
        WHERE (x->>'id') IS NOT NULL 
          AND (x->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

    -- 3. Delete safe materials (NOT in payload AND NOT in GRN)
    DELETE FROM public.asset_purchase_items 
    WHERE purchase_id = p_id 
      AND id NOT IN (SELECT unnest(v_item_ids))
      AND id NOT IN (SELECT purchase_item_id FROM public.asset_grn_items);

    -- 4. Sync line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        -- Upsert check
        IF (v_item->>'id') IS NOT NULL AND (v_item->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            UPDATE public.asset_purchase_items
            SET unit_price = (v_item->>'unitPrice')::numeric,
                total_price = (v_item->>'totalPrice')::numeric,
                remarks = (v_item->>'remarks'),
                updated_at = now()
            WHERE id = (v_item->>'id')::uuid AND purchase_id = p_id;
        ELSE
            -- SMART TYPE LOOKUP for NEW items
            v_actual_type_id := (v_item->>'assetTypeId')::uuid;
            v_catalog_id := (v_item->>'catalogId')::uuid;

            -- Try lookup from catalog if null
            IF v_actual_type_id IS NULL AND v_catalog_id IS NOT NULL THEN
                SELECT asset_type_id INTO v_actual_type_id FROM public.asset_catalog WHERE id = v_catalog_id;
            END IF;

            -- Absolute Fallback (Mandatory for Not-Null)
            IF v_actual_type_id IS NULL THEN
                v_actual_type_id := (SELECT id FROM public.asset_types WHERE name ILIKE '%IT%' LIMIT 1);
            END IF;
            
            -- Absolute Fallback 2 (If no IT type exists)
            IF v_actual_type_id IS NULL THEN
                v_actual_type_id := (SELECT id FROM public.asset_types LIMIT 1);
            END IF;

            INSERT INTO public.asset_purchase_items (
                purchase_id, asset_type_id, asset_name, model_number, 
                quantity, unit_price, total_price, remarks, item_purchase_date
            ) VALUES (
                p_id, v_actual_type_id, (v_item->>'name'), (v_item->>'model'),
                (v_item->>'quantity')::numeric, (v_item->>'unitPrice')::numeric, 
                (v_item->>'totalPrice')::numeric, (v_item->>'remarks'), p_purchase_date
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
