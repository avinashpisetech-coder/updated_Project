-- v107_enforce_po_approval_for_grn.sql
-- Description: Implement a hard protocol guard where GRNs can ONLY be generated against 'approved' Purchase Orders.

CREATE OR REPLACE FUNCTION public.validate_po_approval_for_grn()
RETURNS TRIGGER AS $$
DECLARE
    v_po_status text;
BEGIN
    -- Check status of the parent PO
    SELECT status INTO v_po_status 
    FROM public.asset_purchases 
    WHERE id = NEW.purchase_id;

    IF v_po_status != 'approved' AND v_po_status != 'received' THEN
        RAISE EXCEPTION 'PROTOCOL VIOLATION: GRN creation is blocked. The Purchase Order must have an "approved" status before receiving materials. Current status: %', v_po_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on the GRN Header level for immediate rejection
DROP TRIGGER IF EXISTS tr_validate_po_approval ON public.asset_grns;
CREATE TRIGGER tr_validate_po_approval BEFORE INSERT ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.validate_po_approval_for_grn();
