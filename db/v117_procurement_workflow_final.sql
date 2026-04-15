-- v117_procurement_workflow_final.sql
-- Description: FINALIZING Procurement Status Lifecycle & Reconciliation Protocol.
-- This script updates the status CHECK constraints for POs and GRNs to follow the multi-stage approval flow.

BEGIN;

-------------------------------------------------------------------------------
-- 1. ASSET PURCHASES: EXTENDED STATUS PROTOCOL
-------------------------------------------------------------------------------
-- Lifecycle: draft -> submitted -> approved -> cancelled
-- Amendment: amend_draft -> amend_submitted -> amend_approved

-- Identifying and dropping existing constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.asset_purchases'::regclass 
          AND (contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%')
    ) LOOP
        EXECUTE 'ALTER TABLE public.asset_purchases DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.asset_purchases 
ADD CONSTRAINT asset_purchases_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'cancelled', 'amend_draft', 'amend_submitted', 'amend_approved', 'received'));

-- Initial backfill for existing 'pending' statuses
UPDATE public.asset_purchases SET status = 'draft' WHERE status = 'pending';

-------------------------------------------------------------------------------
-- 2. ASSET GRNS: MULTI-STAGE RECEIPT PROTOCOL
-------------------------------------------------------------------------------
-- Lifecycle: draft -> submitted -> received -> approved -> cancelled

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.asset_grns'::regclass 
          AND (contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%')
    ) LOOP
        EXECUTE 'ALTER TABLE public.asset_grns DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.asset_grns 
ADD CONSTRAINT asset_grns_status_check 
CHECK (status IN ('draft', 'submitted', 'received', 'approved', 'cancelled'));

-- Initial backfill for existing 'pending' statuses
UPDATE public.asset_grns SET status = 'draft' WHERE status = 'pending';

-------------------------------------------------------------------------------
-- 3. RECONCILIATION PROTOCOL: DECOUPLED SYNC
-------------------------------------------------------------------------------
-- Updating the trigger function to only synchronize quantities to the PO when the GRN is 'approved'.

CREATE OR REPLACE FUNCTION public.sync_and_guard_procurement_receipts()
RETURNS TRIGGER AS $$
DECLARE
    v_ordered INTEGER;
    v_received_already INTEGER;
    v_po_id uuid;
    v_item_id uuid;
    v_grn_status text;
BEGIN
    -- Context: Operating on asset_grn_items
    v_item_id := COALESCE(NEW.purchase_item_id, OLD.purchase_item_id);

    -- Get Parent GRN Status
    SELECT status INTO v_grn_status FROM public.asset_grns WHERE id = COALESCE(NEW.grn_id, OLD.grn_id);

    -- 1. Get current PO item state (Ordered vs Received)
    SELECT quantity, purchase_id INTO v_ordered, v_po_id
    FROM public.asset_purchase_items
    WHERE id = v_item_id;

    -- Calculate baseline received from OTHER approved GRNs
    SELECT COALESCE(SUM(received_quantity), 0) INTO v_received_already
    FROM public.asset_grn_items agi
    JOIN public.asset_grns ag ON ag.id = agi.grn_id
    WHERE agi.purchase_item_id = v_item_id 
      AND ag.status = 'approved'
      AND agi.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- 2. ENFORCEMENT: Prevent over-receipt (The Brick Wall)
    -- This check runs regardless of status to prevent invalid drafts from being created
    IF (TG_OP IN ('INSERT', 'UPDATE') AND NEW.received_quantity + v_received_already > v_ordered) THEN
        RAISE EXCEPTION 'RECONCILIATION VIOLATION: Current receipt (%) + Existing receipts (%) would exceed Ordered Qty (%) for this material line item.', 
            NEW.received_quantity, v_received_already, v_ordered;
    END IF;

    -- 3. SYNC: Update the PO Line Item 'received_quantity'
    -- ONLY happens if the parent GRN is 'approved'
    UPDATE public.asset_purchase_items
    SET 
        received_quantity = COALESCE((
            SELECT SUM(agi.received_quantity)
            FROM public.asset_grn_items agi
            JOIN public.asset_grns ag ON ag.id = agi.grn_id
            WHERE agi.purchase_item_id = v_item_id AND ag.status = 'approved'
        ), 0),
        updated_at = now()
    WHERE id = v_item_id;

    -- 4. PO STATUS AUTO-SYNC: Mark 'received' if fully fulfilled by APPROVED entries
    IF NOT EXISTS (
        SELECT 1 FROM public.asset_purchase_items 
        WHERE purchase_id = v_po_id AND quantity > received_quantity
    ) THEN
        UPDATE public.asset_purchases SET status = 'received' WHERE id = v_po_id AND status != 'cancelled';
    ELSE
        -- If it was received but now has balance (e.g. GRN cancelled), move back to approved
        UPDATE public.asset_purchases SET status = 'approved' WHERE id = v_po_id AND status = 'received';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
