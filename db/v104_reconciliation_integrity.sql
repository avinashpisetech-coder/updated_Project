-- v104_reconciliation_integrity.sql
-- Description: Implement a stable PO update protocol that preserves GRN links and enforces budget checks.

-------------------------------------------------------------------------------
-- 1. BUDGET VALIDATION UTILITY
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_budget_availability(
    p_asset_type_id     uuid,
    p_amount            numeric,
    p_fiscal_year       text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
    v_fy text := COALESCE(p_fiscal_year, (SELECT fiscal_year FROM public.asset_budgets WHERE asset_type_id = p_asset_type_id ORDER BY created_at DESC LIMIT 1));
    v_budget RECORD;
BEGIN
    SELECT * INTO v_budget FROM public.asset_budgets 
    WHERE asset_type_id = p_asset_type_id AND fiscal_year = v_fy;

    IF NOT FOUND THEN
        RETURN FALSE; -- No budget allocated
    END IF;

    IF (v_budget.allocated_amount - v_budget.spent_amount) < p_amount THEN
        RETURN FALSE; -- Insufficient budget
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 2. STABLE PO UPDATE (UPSERT PROTOCOL)
-------------------------------------------------------------------------------

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
    v_existing_ids uuid[];
    v_new_ids uuid[] := ARRAY[]::uuid[];
    v_item_id uuid;
BEGIN
    -- 1. Update Header
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

    -- 2. Gather existing item IDs for cleanup
    SELECT ARRAY_AGG(id) INTO v_existing_ids FROM public.asset_purchase_items WHERE purchase_id = p_id;

    -- 3. Upsert Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'id')::uuid;

        IF v_item_id IS NOT NULL AND v_item_id = ANY(v_existing_ids) THEN
            -- Update Existing
            UPDATE public.asset_purchase_items
            SET 
                asset_type_id = (v_item->>'assetTypeId')::uuid,
                asset_name = (v_item->>'name')::text,
                model_number = (v_item->>'model')::text,
                quantity = (v_item->>'quantity')::integer,
                unit_price = (v_item->>'unitPrice')::numeric,
                total_price = (v_item->>'totalPrice')::numeric,
                item_purchase_date = COALESCE((v_item->>'purchaseDate')::date, p_purchase_date)
            WHERE id = v_item_id;
            v_new_ids := array_append(v_new_ids, v_item_id);
        ELSE
            -- Insert New
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
            ) RETURNING id INTO v_item_id;
            v_new_ids := array_append(v_new_ids, v_item_id);
        END IF;

        v_total_base := v_total_base + (v_item->>'totalPrice')::numeric;
    END LOOP;

    -- 4. Cleanup items that were removed but NEVER received (no GRN children)
    DELETE FROM public.asset_purchase_items 
    WHERE purchase_id = p_id 
      AND NOT (id = ANY(v_new_ids))
      AND NOT EXISTS (SELECT 1 FROM public.asset_grn_items WHERE purchase_item_id = public.asset_purchase_items.id);

    -- 5. Update Financial Aggregate
    UPDATE public.asset_purchases 
    SET 
        total_raw_amount = v_total_base,
        cgst_amount = v_total_base * 0.09,
        sgst_amount = v_total_base * 0.09,
        grand_total = v_total_base * 1.18 + COALESCE(p_other_charges, 0)
    WHERE id = p_id;

    -- 6. Recalculate received quantities from GRNs to ensure parity
    UPDATE public.asset_purchase_items api
    SET received_quantity = (
        SELECT COALESCE(SUM(received_quantity), 0)
        FROM public.asset_grn_items agi
        JOIN public.asset_grns ag ON ag.id = agi.grn_id
        WHERE agi.purchase_item_id = api.id AND ag.status = 'completed'
    )
    WHERE purchase_id = p_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 3. GLOBAL GRN SYNC TRIGGER
-------------------------------------------------------------------------------
-- Ensure PO status reflects 'received' if all quantities are fulfilled

CREATE OR REPLACE FUNCTION public.sync_po_received_status()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id uuid;
    v_total_ordered numeric;
    v_total_received numeric;
BEGIN
    SELECT purchase_id INTO v_po_id FROM public.asset_purchase_items WHERE id = COALESCE(NEW.purchase_item_id, OLD.purchase_item_id);
    
    -- Sum ordered vs received for entire PO
    SELECT SUM(quantity), SUM(received_quantity) INTO v_total_ordered, v_total_received
    FROM public.asset_purchase_items
    WHERE purchase_id = v_po_id;

    IF v_total_received >= v_total_ordered AND v_total_ordered > 0 THEN
        UPDATE public.asset_purchases SET status = 'received' WHERE id = v_po_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_po_status ON public.asset_purchase_items;
CREATE TRIGGER tr_sync_po_status AFTER UPDATE OF received_quantity ON public.asset_purchase_items
FOR EACH ROW EXECUTE FUNCTION public.sync_po_received_status();
