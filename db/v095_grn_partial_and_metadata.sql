-- v095_grn_partial_and_metadata.sql
-- Description: Implement Partial GRN Support, Delivery Challan Metadata, and Inward tracking.

-------------------------------------------------------------------------------
-- 1. EXTEND GRN REGISTRY
-------------------------------------------------------------------------------

ALTER TABLE public.asset_grns 
ADD COLUMN IF NOT EXISTS challan_number    text,
ADD COLUMN IF NOT EXISTS challan_date      date,
ADD COLUMN IF NOT EXISTS inward_number     text;

-------------------------------------------------------------------------------
-- 2. TRACK LINE-LEVEL RECEIPTS
-------------------------------------------------------------------------------

ALTER TABLE public.asset_purchase_items 
ADD COLUMN IF NOT EXISTS received_quantity integer DEFAULT 0 NOT NULL;

-------------------------------------------------------------------------------
-- 3. RE-ARCHITECT INVENTORY POSTING (PARTIAL SUPPORT)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_grn_to_inventory()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    i INTEGER;
    v_asset_sub_type_id UUID;
    v_total_ordered INTEGER;
    v_total_received INTEGER;
BEGIN
    -- Only act when a GRN is moved to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        
        -- Loop through all items in THIS GRN transaction
        FOR item_record IN 
            SELECT 
                agi.id as grn_item_id,
                agi.purchase_item_id,
                agi.received_quantity as current_receipt,
                api.asset_name, 
                api.model_number, 
                api.asset_type_id,
                api.quantity as ordered_quantity,
                ap.purchase_date,
                ap.supplier_id,
                ap.id as purchase_id
            FROM public.asset_grn_items agi
            JOIN public.asset_purchase_items api ON agi.purchase_item_id = api.id
            JOIN public.asset_purchases ap ON api.purchase_id = ap.id
            WHERE agi.grn_id = NEW.id
        LOOP
            -- 1. Update the 'received_quantity' on the Purchase Line Item
            UPDATE public.asset_purchase_items 
            SET received_quantity = received_quantity + item_record.current_receipt,
                updated_at = now()
            WHERE id = item_record.purchase_item_id;

            -- 2. For each received quantity, create one asset record in inventory
            FOR i IN 1..item_record.current_receipt LOOP
                -- Auto-select matching Sub-type
                SELECT id INTO v_asset_sub_type_id 
                FROM public.asset_sub_types 
                WHERE type_id = item_record.asset_type_id 
                LIMIT 1;

                INSERT INTO public.assets (
                    name, 
                    model, 
                    sub_type_id, 
                    purchase_id,
                    purchase_date,
                    status,
                    is_active
                ) VALUES (
                    item_record.asset_name,
                    item_record.model_number,
                    v_asset_sub_type_id,
                    item_record.purchase_id,
                    item_record.purchase_date,
                    'in_stock',
                    true
                );
            END LOOP;
        END LOOP;
        
        -- 3. Update PO Header Status
        -- Check if all items are fully received
        SELECT SUM(quantity), SUM(received_quantity)
        INTO v_total_ordered, v_total_received
        FROM public.asset_purchase_items
        WHERE purchase_id = NEW.purchase_id;

        IF (v_total_received >= v_total_ordered) THEN
            UPDATE public.asset_purchases SET status = 'received' WHERE id = NEW.purchase_id;
        ELSEIF (v_total_received > 0) THEN
            -- Implement a partial status if needed, or keep it 'pending'
            -- We'll stay 'pending' or you can add a 'partial' status to the enum
            -- Let's just keep it pending for now but technically we can track it.
            NULL; 
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
