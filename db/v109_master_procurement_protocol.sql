-- v109_master_procurement_protocol.sql
-- Description: FINAL MASTER PROTOCOL for Atomic Procurement Reconciliation and Scoped Auditing.
-- This script replaces all previous reconciliation/audit triggers with a single, high-performance logic block.

-------------------------------------------------------------------------------
-- 1. PURGE INTERFERING LOGGING (CLEAN SLATE)
-------------------------------------------------------------------------------
-- Disabling the generic 'log_master_change' trigger from the procurement registry to prevent FK failures.

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

-------------------------------------------------------------------------------
-- 2. SCOPED AUDIT REGISTRY ENHANCEMENT
-------------------------------------------------------------------------------
-- Add GRN reference to activities for scoped trail visibility.

ALTER TABLE public.asset_activity_logs ADD COLUMN IF NOT EXISTS grn_id uuid REFERENCES public.asset_grns(id) ON DELETE CASCADE;
ALTER TABLE public.asset_activity_logs ADD COLUMN IF NOT EXISTS scope text DEFAULT 'PO' CHECK (scope IN ('PO', 'GRN', 'INVOICE'));

-------------------------------------------------------------------------------
-- 3. MASTER RECONCILIATION & GUARD TRIGGER
-------------------------------------------------------------------------------
-- This trigger enforces the quantity brick wall and handles ALL RECEIVED logic.

CREATE OR REPLACE FUNCTION public.sync_and_guard_procurement_receipts()
RETURNS TRIGGER AS $$
DECLARE
    v_ordered INTEGER;
    v_received_already INTEGER;
    v_po_id uuid;
    v_item_id uuid;
BEGIN
    -- Context: Operating on asset_grn_items
    v_item_id := COALESCE(NEW.purchase_item_id, OLD.purchase_item_id);

    -- 1. Get current PO item state (Ordered vs Received)
    -- We ignore the current transaction's weight to calculate the baseline
    SELECT quantity, purchase_id INTO v_ordered, v_po_id
    FROM public.asset_purchase_items
    WHERE id = v_item_id;

    SELECT COALESCE(SUM(received_quantity), 0) INTO v_received_already
    FROM public.asset_grn_items agi
    JOIN public.asset_grns ag ON ag.id = agi.grn_id
    WHERE agi.purchase_item_id = v_item_id 
      AND ag.status = 'approved'
      AND agi.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- 2. ENFORCEMENT: Prevent over-receipt (The Brick Wall)
    IF (TG_OP IN ('INSERT', 'UPDATE') AND NEW.received_quantity + v_received_already > v_ordered) THEN
        RAISE EXCEPTION 'RECONCILIATION VIOLATION: Current receipt (%) + Existing receipts (%) would exceed Ordered Qty (%) for this material line item.', 
            NEW.received_quantity, v_received_already, v_ordered;
    END IF;

    -- 3. SYNC: Update the PO Line Item 'received_quantity'
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

    -- 4. PO STATUS AUTO-SYNC: Mark 'received' if fully fulfilled
    IF NOT EXISTS (
        SELECT 1 FROM public.asset_purchase_items 
        WHERE purchase_id = v_po_id AND quantity > received_quantity
    ) THEN
        UPDATE public.asset_purchases SET status = 'received' WHERE id = v_po_id AND status != 'cancelled';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_guard_receipts ON public.asset_grn_items;
CREATE TRIGGER tr_sync_guard_receipts AFTER INSERT OR UPDATE OR DELETE ON public.asset_grn_items
FOR EACH ROW EXECUTE FUNCTION public.sync_and_guard_procurement_receipts();

-------------------------------------------------------------------------------
-- 4. SCOPED SYSTEMIC AUDIT TRAIL
-------------------------------------------------------------------------------
-- Automated logging that stays in the correct scope (PO vs GRN).

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
            v_desc := 'Inward Receipt generated for document: ' || NEW.grn_number;
        ELSIF (OLD.status != NEW.status) THEN
            v_action := 'GRN_STATUS_CHANGE';
            v_desc := 'GRN State changed from ' || UPPER(OLD.status) || ' to ' || UPPER(NEW.status);
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

DROP TRIGGER IF EXISTS tr_scoped_audit_po ON public.asset_purchases;
CREATE TRIGGER tr_scoped_audit_po AFTER INSERT OR UPDATE ON public.asset_purchases
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_scoped_activity();

DROP TRIGGER IF EXISTS tr_scoped_audit_grn ON public.asset_grns;
CREATE TRIGGER tr_scoped_audit_grn AFTER INSERT OR UPDATE ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_scoped_activity();

-------------------------------------------------------------------------------
-- 5. REPAIR: BACKFILL CURRENT STATE
-------------------------------------------------------------------------------
-- Force immediate reconciliation of all past records during this migration.

DO $$
BEGIN
    -- Synchronize PO item levels
    UPDATE public.asset_purchase_items api
    SET received_quantity = COALESCE((
        SELECT SUM(agi.received_quantity)
        FROM public.asset_grn_items agi
        JOIN public.asset_grns ag ON ag.id = agi.grn_id
        WHERE agi.purchase_item_id = api.id AND ag.status = 'approved'
    ), 0);

    -- Synchronize PO header statuses
    UPDATE public.asset_purchases ap
    SET status = 'received'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.asset_purchase_items 
        WHERE purchase_id = ap.id AND quantity > received_quantity
    ) AND status != 'cancelled'
      AND (SELECT COUNT(*) FROM public.asset_purchase_items WHERE purchase_id = ap.id) > 0;
END $$;
