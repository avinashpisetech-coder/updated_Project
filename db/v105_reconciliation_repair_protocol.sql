-- v105_reconciliation_repair_protocol.sql
-- Description: Critical repair to fix the reconciliation gap. Corrects 'Received' counts from existing GRNs and implements missing DB-level restrictions.

-------------------------------------------------------------------------------
-- 1. REPAIR: RECALCULATE RECEIVED QUANTITIES
-------------------------------------------------------------------------------
-- This block fixes existing records shown in the user's screenshots where GRNs exist but PO shows 0 received.

DO $$
BEGIN
    RAISE NOTICE 'Starting reconciliation repair for Procurement Registry...';

    -- Temporarily disable triggers to avoid FK issues with audit logs during manual repair
    ALTER TABLE public.asset_purchase_items DISABLE TRIGGER USER;
    ALTER TABLE public.asset_purchases DISABLE TRIGGER USER;

    -- 1. Update individual line items
    UPDATE public.asset_purchase_items api
    SET received_quantity = COALESCE((
        SELECT SUM(agi.received_quantity)
        FROM public.asset_grn_items agi
        JOIN public.asset_grns ag ON ag.id = agi.grn_id
        WHERE agi.purchase_item_id = api.id AND ag.status = 'completed'
    ), 0);

    -- 2. Sync PO Header statuses based on new calculations
    UPDATE public.asset_purchases ap
    SET status = 'received',
        updated_at = now()
    WHERE (
        SELECT SUM(quantity) <= SUM(received_quantity)
        FROM public.asset_purchase_items 
        WHERE purchase_id = ap.id
    ) AND status != 'cancelled'
      AND (SELECT COUNT(*) FROM public.asset_purchase_items WHERE purchase_id = ap.id) > 0;

    -- Re-enable triggers
    ALTER TABLE public.asset_purchase_items ENABLE TRIGGER USER;
    ALTER TABLE public.asset_purchases ENABLE TRIGGER USER;

    RAISE NOTICE 'Repair completed. PO Received counts are now in parity with GRN registries.';
END $$;

-------------------------------------------------------------------------------
-- 2. ENFORCEMENT: PREVENT OVER-RECEIPT (RECONCILIATION GUARD)
-------------------------------------------------------------------------------
-- Adds a hard database-level restriction to prevent receiving more than ordered.

CREATE OR REPLACE FUNCTION public.validate_grn_quantity_protocol()
RETURNS TRIGGER AS $$
DECLARE
    v_ordered INTEGER;
    v_received_already INTEGER;
BEGIN
    -- Get current state from PO item
    SELECT quantity, received_quantity INTO v_ordered, v_received_already
    FROM public.asset_purchase_items
    WHERE id = NEW.purchase_item_id;

    -- On Update of an existing GRN item, we subtract the 'old' amount from 'already received' to get the baseline
    IF (TG_OP = 'UPDATE') THEN
        v_received_already := v_received_already - OLD.received_quantity;
    END IF;

    -- Check if New Receipt + Existing Receipts > Ordered
    IF (v_received_already + NEW.received_quantity > v_ordered) THEN
        RAISE EXCEPTION 'PROTOCOL VIOLATION: Total received quantity (%) exceeds ordered quantity (%) for this material line item.', 
            (v_received_already + NEW.received_quantity), v_ordered;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_grn_qty ON public.asset_grn_items;
CREATE TRIGGER tr_validate_grn_qty BEFORE INSERT OR UPDATE ON public.asset_grn_items
FOR EACH ROW EXECUTE FUNCTION public.validate_grn_quantity_protocol();

-------------------------------------------------------------------------------
-- 3. AUTOMATIC SYNC: TRIGGER ON GRN STATUS CHANGE
-------------------------------------------------------------------------------
-- Ensures PO Received quantity is always up-to-date even when GRNs are modified or cancelled.

CREATE OR REPLACE FUNCTION public.recalculate_po_line_receipts()
RETURNS TRIGGER AS $$
DECLARE
    v_po_id UUID;
    v_item_id UUID;
BEGIN
    -- Determine which PO item to recalculate
    v_item_id := COALESCE(NEW.purchase_item_id, OLD.purchase_item_id);

    -- Perform the recalculation for the affected line item
    UPDATE public.asset_purchase_items api
    SET 
        received_quantity = COALESCE((
            SELECT SUM(agi.received_quantity)
            FROM public.asset_grn_items agi
            JOIN public.asset_grns ag ON ag.id = agi.grn_id
            WHERE agi.purchase_item_id = api.id AND ag.status = 'completed'
        ), 0),
        updated_at = now()
    WHERE api.id = v_item_id
    RETURNING purchase_id INTO v_po_id;

    -- Update PO Status if all items fulfilled
    UPDATE public.asset_purchases ap
    SET status = CASE 
        WHEN NOT EXISTS (SELECT 1 FROM public.asset_purchase_items WHERE purchase_id = ap.id AND quantity > received_quantity) THEN 'received'::text
        ELSE status -- Keep current status otherwise
    END
    WHERE ap.id = v_po_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for when GRN items are inserted/deleted/updated
DROP TRIGGER IF EXISTS tr_recalc_po_receipts ON public.asset_grn_items;
CREATE TRIGGER tr_recalc_po_receipts AFTER INSERT OR DELETE OR UPDATE ON public.asset_grn_items
FOR EACH ROW EXECUTE FUNCTION public.recalculate_po_line_receipts();

-- Trigger for when GRN status changes (e.g. Completed -> Cancelled)
CREATE OR REPLACE FUNCTION public.recalculate_all_po_items_on_grn_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status != OLD.status) THEN
        UPDATE public.asset_purchase_items api
        SET 
            received_quantity = COALESCE((
                SELECT SUM(agi.received_quantity)
                FROM public.asset_grn_items agi
                JOIN public.asset_grns ag ON ag.id = agi.grn_id
                WHERE agi.purchase_item_id = api.id AND ag.status = 'completed'
            ), 0),
            updated_at = now()
        WHERE api.purchase_id = NEW.purchase_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_recalc_on_grn_status ON public.asset_grns;
CREATE TRIGGER tr_recalc_on_grn_status AFTER UPDATE OF status ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.recalculate_all_po_items_on_grn_status_change();

-------------------------------------------------------------------------------
-- 4. PO ITEM BACKFILL: AUTOMATIC RECOVERY ON UPSERT
-------------------------------------------------------------------------------
-- Critical fix for 'Technical Gap': If a PO item is deleted and recreated (during PO Edit),
-- it should immediately look for existing "completed" GRN items that were associated with its metadata.
-- Wait, actually we use 'Upsert' now in v104, but if we change an ID or insert a new record, this trigger handles it.

CREATE OR REPLACE FUNCTION public.backfill_receipt_history_on_item_upsert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.received_quantity = COALESCE((
        SELECT SUM(agi.received_quantity)
        FROM public.asset_grn_items agi
        JOIN public.asset_grns ag ON ag.id = agi.grn_id
        WHERE agi.purchase_item_id = NEW.id AND ag.status = 'completed'
    ), 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_backfill_receipts ON public.asset_purchase_items;
CREATE TRIGGER tr_backfill_receipts BEFORE INSERT OR UPDATE ON public.asset_purchase_items
FOR EACH ROW EXECUTE FUNCTION public.backfill_receipt_history_on_item_upsert();
