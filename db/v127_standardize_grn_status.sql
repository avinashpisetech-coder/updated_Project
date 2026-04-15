-- v127_standardize_grn_status.sql
-- Description: Align GRN status with corporate workflow and ensure legacy "Approved" states are restored.

BEGIN;

-------------------------------------------------------------------------------
-- 1. DATA RESTORATION: Map legacy and incorrect draft resets back to correct states
-------------------------------------------------------------------------------
UPDATE public.asset_grns 
SET status = CASE 
    WHEN status IS NULL OR TRIM(status) = '' THEN 'draft'
    WHEN status = 'pending' THEN 'submitted'
    WHEN status = 'completed' THEN 'approved'
    ELSE status 
END;

-- Final safety: ensure no orphan statuses remain that would block the constraint
UPDATE public.asset_grns
SET status = 'draft'
WHERE status NOT IN ('draft', 'submitted', 'received', 'approved', 'cancelled');

-------------------------------------------------------------------------------
-- 2. SCHEMA HARDENING: Drop old constraints and add standardized set
-------------------------------------------------------------------------------
DO $$ 
DECLARE 
    v_constraint_name text;
BEGIN
    FOR v_constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.asset_grns'::regclass AND contype = 'c' AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.asset_grns DROP CONSTRAINT ' || v_constraint_name;
    END LOOP;
END $$;

ALTER TABLE public.asset_grns 
ADD CONSTRAINT grn_status_check 
CHECK (status IN ('draft', 'submitted', 'received', 'approved', 'cancelled'));

ALTER TABLE public.asset_grns 
ALTER COLUMN status SET DEFAULT 'draft',
ALTER COLUMN status SET NOT NULL;

-------------------------------------------------------------------------------
-- 3. TRIGGER RE-ENGINEERING: Support both 'received' and 'approved' for stock ingestion
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
    -- Only act when a GRN moves to an authorized state (received or approved)
    IF ((NEW.status IN ('received', 'approved')) AND (OLD.status IS NULL OR OLD.status NOT IN ('received', 'approved'))) THEN
        
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
                    brand, 
                    model, 
                    sub_type_id, 
                    purchase_id,
                    purchase_date,
                    status
                ) VALUES (
                    item_record.asset_name,
                    COALESCE(item_record.model_number, 'NOT_SPECIFIED'),
                    v_asset_sub_type_id,
                    item_record.purchase_id,
                    item_record.purchase_date,
                    'in_stock'
                );
            END LOOP;
        END LOOP;
        
        -- 3. Update PO Header Status logic
        SELECT SUM(quantity), SUM(received_quantity)
        INTO v_total_ordered, v_total_received
        FROM public.asset_purchase_items
        WHERE purchase_id = NEW.purchase_id;

        IF (v_total_received >= v_total_ordered) THEN
            UPDATE public.asset_purchases SET status = 'received' WHERE id = NEW.purchase_id;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
