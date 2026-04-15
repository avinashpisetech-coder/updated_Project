-- v115_FINAL_ATOMIC_RECONCILIATOR.sql
-- Description: The ONE AND ONLY TRUTH script for Procurement Reconciliation, Workflows, and Auditing.
-- This script consolidates everything into a single, idempotent file for easy execution.

-------------------------------------------------------------------------------
-- 1. PURGE EVERY LEGACY TRIGGER (CLEAN SLATE)
-------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_log_asset_purchases ON public.asset_purchases;
DROP TRIGGER IF EXISTS tr_log_asset_purchase_items ON public.asset_purchase_items;
DROP TRIGGER IF EXISTS tr_log_asset_grns ON public.asset_grns;
DROP TRIGGER IF EXISTS tr_log_asset_grn_items ON public.asset_grn_items;
DROP TRIGGER IF EXISTS tr_sync_po_status ON public.asset_purchase_items;
DROP TRIGGER IF EXISTS tr_recalc_po_receipts ON public.asset_grn_items;
DROP TRIGGER IF EXISTS tr_validate_grn_qty ON public.asset_grn_items;
DROP TRIGGER IF EXISTS tr_recalc_on_grn_status ON public.asset_grns;
DROP TRIGGER IF EXISTS tr_backfill_receipts ON public.asset_purchase_items;
DROP TRIGGER IF EXISTS tr_validate_po_approval ON public.asset_grns;
DROP TRIGGER IF EXISTS tr_audit_po ON public.asset_purchases;
DROP TRIGGER IF EXISTS tr_audit_grn ON public.asset_grns;
DROP TRIGGER IF EXISTS tr_audit_invoice ON public.asset_invoices;
DROP TRIGGER IF EXISTS tr_sync_guard_receipts ON public.asset_grn_items;
DROP TRIGGER IF EXISTS tr_scoped_audit_po ON public.asset_purchases;
DROP TRIGGER IF EXISTS tr_scoped_audit_grn ON public.asset_grns;
DROP TRIGGER IF EXISTS tr_grn_lifecycle_guard ON public.asset_grns;

-------------------------------------------------------------------------------
-- 2. SCHEMA ADJUSTMENTS (WORKFLOW & AUDITING)
-------------------------------------------------------------------------------
-- A. Expand GRN Status check constraint to include multi-department workflow
ALTER TABLE IF EXISTS public.asset_grns DROP CONSTRAINT IF EXISTS asset_grns_status_check;
ALTER TABLE public.asset_grns ADD CONSTRAINT asset_grns_status_check 
    CHECK (status IN ('pending', 'received', 'approved', 'cancelled'));

-- B. Sync legacy 'completed' status to 'approved' for consistency
UPDATE public.asset_grns SET status = 'approved' WHERE status = 'completed';

-- C. Scoped Audit Columns
ALTER TABLE public.asset_activity_logs ADD COLUMN IF NOT EXISTS grn_id uuid REFERENCES public.asset_grns(id) ON DELETE CASCADE;
ALTER TABLE public.asset_activity_logs ADD COLUMN IF NOT EXISTS scope text DEFAULT 'PO' CHECK (scope IN ('PO', 'GRN', 'INVOICE'));

-------------------------------------------------------------------------------
-- 3. MASTER ATOMIC SYNC LOGIC (RECONCILIATION & BRICK WALL GUARD)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_and_guard_procurement_receipts()
RETURNS TRIGGER AS $$
DECLARE
    v_ordered INTEGER;
    v_received_already INTEGER;
    v_po_id uuid;
    v_item_id uuid;
BEGIN
    -- Context: Operating on asset_grn_items (Internal trigger for quantity math)
    v_item_id := COALESCE(NEW.purchase_item_id, OLD.purchase_item_id);

    -- 1. Get current PO item state (Ordered vs Received)
    SELECT quantity, purchase_id INTO v_ordered, v_po_id
    FROM public.asset_purchase_items
    WHERE id = v_item_id;

    -- Calculate how much has been received globally by other APPROVED GRNs
    SELECT COALESCE(SUM(received_quantity), 0) INTO v_received_already
    FROM public.asset_grn_items agi
    JOIN public.asset_grns ag ON ag.id = agi.grn_id
    WHERE agi.purchase_item_id = v_item_id 
      AND ag.status = 'approved'
      AND agi.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- 2. ENFORCEMENT: Prevent over-receipt (The Brick Wall)
    IF (TG_OP IN ('INSERT', 'UPDATE') AND NEW.received_quantity + v_received_already > v_ordered) THEN
        RAISE EXCEPTION 'RECONCILIATION VIOLATION: Current receipt (%) + Existing approved receipts (%) would exceed Ordered Qty (%) for this material line item. Intake blocked.', 
            NEW.received_quantity, v_received_already, v_ordered;
    END IF;

    -- 3. SYNC: Update the PO Line Item 'received_quantity' (Only counts APPROVED)
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

    -- 4. PO STATUS AUTO-SYNC: Mark 'received' if fully fulfilled by approved receipts
    IF NOT EXISTS (
        SELECT 1 FROM public.asset_purchase_items 
        WHERE purchase_id = v_po_id AND quantity > received_quantity
    ) THEN
        UPDATE public.asset_purchases SET status = 'received' WHERE id = v_po_id AND status != 'cancelled';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_sync_guard_receipts AFTER INSERT OR UPDATE OR DELETE ON public.asset_grn_items
FOR EACH ROW EXECUTE FUNCTION public.sync_and_guard_procurement_receipts();

-------------------------------------------------------------------------------
-- 4. GRN STATUS SYNC (MOVE FROM RECEIVED TO APPROVED)
-------------------------------------------------------------------------------
-- This ensures that when a GRN header status changes to 'approved', the math kicks in for all its items.
CREATE OR REPLACE FUNCTION public.sync_po_on_grn_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status != NEW.status) THEN
        -- Recalculate ALL items in this GRN since status changed
        UPDATE public.asset_purchase_items api
        SET received_quantity = COALESCE((
            SELECT SUM(agi.received_quantity)
            FROM public.asset_grn_items agi
            JOIN public.asset_grns ag ON ag.id = agi.grn_id
            WHERE agi.purchase_item_id = api.id AND ag.status = 'approved'
        ), 0)
        WHERE id IN (SELECT purchase_item_id FROM public.asset_grn_items WHERE grn_id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_recalc_on_grn_status AFTER UPDATE OF status ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.sync_po_on_grn_status_change();

-------------------------------------------------------------------------------
-- 5. SCOPED SYSTEMIC AUDIT LOGGING
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_procurement_scoped_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_scope text;
    v_purchase_id uuid;
    v_grn_id uuid;
    v_action text;
    v_desc text;
BEGIN
    IF (TG_TABLE_NAME = 'asset_purchases') THEN
        v_scope := 'PO';
        v_purchase_id := NEW.id;
        IF (TG_OP = 'INSERT') THEN
            v_action := 'PO_CREATED';
            v_desc := 'Purchase Order Protocol Initialized: ' || NEW.po_number;
        ELSIF (OLD.status != NEW.status) THEN
            v_action := 'PO_STATUS_CHANGE';
            v_desc := 'PO State changed from ' || UPPER(OLD.status) || ' to ' || UPPER(NEW.status);
        ELSE
            v_action := 'PO_AMENDED';
            v_desc := 'Purchase Metadata (Vendor/Items/Logistics) updated.';
        END IF;
    ELSIF (TG_TABLE_NAME = 'asset_grns') THEN
        v_scope := 'GRN';
        v_purchase_id := NEW.purchase_id;
        v_grn_id := NEW.id;
        IF (TG_OP = 'INSERT') THEN
            v_action := 'GRN_POSTED';
            v_desc := 'Inward Receipt generated: ' || NEW.grn_number;
        ELSIF (OLD.status != NEW.status) THEN
            v_action := 'GRN_STATUS_CHANGE';
            v_desc := 'GRN State changed from ' || UPPER(OLD.status) || ' to ' || UPPER(NEW.status);
        ELSE
             v_action := 'GRN_AUDITED';
             v_desc := 'Goods Receipt metadata (Challan/Dates/Qty) audited and updated.';
        END IF;
    END IF;

    IF (v_action IS NOT NULL) THEN
        INSERT INTO public.asset_activity_logs (
            purchase_id, grn_id, scope, action_type, description, performed_by, created_at
        ) VALUES (
            v_purchase_id, v_grn_id, v_scope, v_action, v_desc, auth.uid(), now()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_scoped_audit_po AFTER INSERT OR UPDATE ON public.asset_purchases
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_scoped_activity();

CREATE TRIGGER tr_scoped_audit_grn AFTER INSERT OR UPDATE ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_scoped_activity();

-------------------------------------------------------------------------------
-- 6. GRN LIFECYCLE SAFEGUARD
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.procurement_grn_lifecycle_guard()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE' AND OLD.status = 'approved') THEN
        RAISE EXCEPTION 'LIFECYCLE VIOLATION: To remove stock intake from an approved/completed GRN, you must CANCEL the GRN status for auditing purposes. Hard deletion is blocked.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_grn_lifecycle_guard BEFORE DELETE ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.procurement_grn_lifecycle_guard();

-------------------------------------------------------------------------------
-- 7. REPAIR: BACKFILL CURRENT STATE
-------------------------------------------------------------------------------
DO $$
BEGIN
    -- Synchronize everything based on Approved GRNs
    UPDATE public.asset_purchase_items api
    SET received_quantity = COALESCE((
        SELECT SUM(agi.received_quantity)
        FROM public.asset_grn_items agi
        JOIN public.asset_grns ag ON ag.id = agi.grn_id
        WHERE agi.purchase_item_id = api.id AND ag.status = 'approved'
    ), 0);

    UPDATE public.asset_purchases ap
    SET status = 'received'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.asset_purchase_items 
        WHERE purchase_id = ap.id AND quantity > received_quantity
    ) AND status != 'cancelled'
      AND (SELECT COUNT(*) FROM public.asset_purchase_items WHERE purchase_id = ap.id) > 0;

    -- 8. BACKFILL MISSING AUDIT LOGS (HISTORICAL PARITY)
    -- Default existing logs to PO if scope is missing
    UPDATE public.asset_activity_logs SET scope = 'PO' WHERE scope IS NULL;

    -- Insert missing 'PO_CREATED' logs
    INSERT INTO public.asset_activity_logs (purchase_id, scope, action_type, description, created_at)
    SELECT id, 'PO'::text, 'PO_CREATED'::text, 'Historical Protocol Initialized: ' || po_number, created_at
    FROM public.asset_purchases
    WHERE id NOT IN (SELECT purchase_id FROM public.asset_activity_logs WHERE action_type = 'PO_CREATED');

    -- Insert missing 'GRN_POSTED' logs
    INSERT INTO public.asset_activity_logs (purchase_id, grn_id, scope, action_type, description, created_at)
    SELECT purchase_id, id, 'GRN'::text, 'GRN_POSTED'::text, 'Historical Inward Receipt: ' || grn_number, created_at
    FROM public.asset_grns
    WHERE id NOT IN (SELECT grn_id FROM public.asset_activity_logs WHERE action_type = 'GRN_POSTED' AND grn_id IS NOT NULL);

END $$;
