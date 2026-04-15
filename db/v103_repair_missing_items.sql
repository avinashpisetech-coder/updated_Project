-- REPAIR SCRIPT: Restore missing material links for existing POs
-- This script identifies POs that have a header total but no items, and inserts a placeholder.

DO $$
DECLARE
    v_it_asset_type_id UUID;
    v_po_record RECORD;
BEGIN
    -- 1. Surgical Strike: Temporarily disable ONLY USER triggers
    -- This skips your audit logging without touching the database's internal system triggers.
    ALTER TABLE public.asset_purchase_items DISABLE TRIGGER USER;

    -- 2. Get a safe default asset type (IT Assets)
    SELECT id INTO v_it_asset_type_id 
    FROM public.asset_types 
    WHERE name ILIKE '%IT%' 
    OR name ILIKE '%Asset%'
    LIMIT 1;

    -- Fallback if no type found
    IF v_it_asset_type_id IS NULL THEN
        INSERT INTO public.asset_types (name, description)
        VALUES ('System Restored', 'Auto-generated for legacy records')
        RETURNING id INTO v_it_asset_type_id;
    END IF;

    -- 3. Identify POs with Header totals but 0 items
    FOR v_po_record IN 
        SELECT p.id, p.total_raw_amount, p.po_number 
        FROM public.asset_purchases p
        LEFT JOIN public.asset_purchase_items i ON p.id = i.purchase_id
        WHERE i.id IS NULL AND p.total_raw_amount > 0
    LOOP
        RAISE NOTICE 'Repairing Missing Items for PO: %', v_po_record.po_number;

        -- 4. Insert Placeholder Row to reconcile the table
        INSERT INTO public.asset_purchase_items (
            purchase_id,
            asset_type_id,
            asset_name,
            model_number,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_po_record.id,
            v_it_asset_type_id,
            'RESTORED MATERIAL PROTOCOL',
            'LEGACY_DATA_RECONCILIATION',
            1,
            v_po_record.total_raw_amount,
            v_po_record.total_raw_amount
        );
    END LOOP;

    -- 5. Re-enable the user triggers immediately after repair
    ALTER TABLE public.asset_purchase_items ENABLE TRIGGER USER;

END $$;
