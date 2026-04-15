-- v110_grn_lifecycle_policy.sql
-- Description: Hard lifecycle enforcement for GRNs.
-- 1. Blocks HARD DELETE of 'completed' GRNs (must cancel instead).
-- 2. Ensures 'cancelled' GRNs are excluded from stock reconciliation (This is already handled by v109's 'completed' filter).

CREATE OR REPLACE FUNCTION public.procurement_grn_lifecycle_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow DELETE if the GRN is still 'pending'
    IF (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        RAISE EXCEPTION 'LIFECYCLE VIOLATION: To remove stock intake from a completed GRN, you must CANCEL the GRN status. Hard deletion is blocked for audited records.';
    END IF;

    -- If status changes TO 'cancelled', we might want to also flag the assets as rejected or similar
    -- But since we use real-time reconciliation in v109/frontend, simply changing status is enough.
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_grn_lifecycle_guard ON public.asset_grns;
CREATE TRIGGER tr_grn_lifecycle_guard BEFORE DELETE ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.procurement_grn_lifecycle_guard();
