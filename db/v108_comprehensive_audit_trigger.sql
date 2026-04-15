-- v108_comprehensive_audit_trigger.sql
-- Description: Implement a fully automated, systemic audit trail for the Procurement Lifecycle.
-- This ensures that every status change, creation, and receipt is logged regardless of the entry point.

CREATE OR REPLACE FUNCTION public.log_procurement_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_purchase_id uuid;
    v_action text;
    v_desc text;
BEGIN
    -- 1. Determine Source and Context
    IF (TG_TABLE_NAME = 'asset_purchases') THEN
        v_purchase_id := NEW.id;
        IF (TG_OP = 'INSERT') THEN
            v_action := 'PO_CREATED';
            v_desc := 'Purchase Order ' || NEW.po_number || ' generated in system.';
        ELSIF (TG_OP = 'UPDATE') THEN
            IF (OLD.status != NEW.status) THEN
                v_action := 'PO_STATUS_UPDATED';
                v_desc := 'PO Status transitioned from ' || UPPER(OLD.status) || ' to ' || UPPER(NEW.status);
            ELSE
                v_action := 'PO_AMENDED';
                v_desc := 'Purchase Order metadata updated.';
            END IF;
        END IF;
    ELSIF (TG_TABLE_NAME = 'asset_grns') THEN
        v_purchase_id := NEW.purchase_id;
        IF (TG_OP = 'INSERT') THEN
            v_action := 'GRN_POSTED';
            v_desc := 'Goods Receipt Note ' || NEW.grn_number || ' posted for inward stock.';
        ELSIF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
            v_action := 'GRN_STATUS_UPDATED';
            v_desc := 'GRN ' || NEW.grn_number || ' status changed to ' || UPPER(NEW.status);
        END IF;
    ELSIF (TG_TABLE_NAME = 'asset_invoices') THEN
        v_purchase_id := NEW.purchase_id;
        IF (TG_OP = 'INSERT') THEN
            v_action := 'INVOICE_GENERATED';
            v_desc := 'Supplier Invoice ' || NEW.invoice_number || ' registered.';
        END IF;
    END IF;

    -- 2. Commit to Audit Registry
    IF (v_action IS NOT NULL) THEN
        INSERT INTO public.asset_activity_logs (
            purchase_id,
            action_type,
            description,
            performed_by,
            created_at
        ) VALUES (
            v_purchase_id,
            v_action,
            v_desc,
            auth.uid(),
            now()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Triggers
DROP TRIGGER IF EXISTS tr_audit_po ON public.asset_purchases;
CREATE TRIGGER tr_audit_po AFTER INSERT OR UPDATE ON public.asset_purchases
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_activity();

DROP TRIGGER IF EXISTS tr_audit_grn ON public.asset_grns;
CREATE TRIGGER tr_audit_grn AFTER INSERT OR UPDATE ON public.asset_grns
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_activity();

DROP TRIGGER IF EXISTS tr_audit_invoice ON public.asset_invoices;
CREATE TRIGGER tr_audit_invoice AFTER INSERT ON public.asset_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_procurement_activity();
