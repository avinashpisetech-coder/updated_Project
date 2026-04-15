-- v097_purchase_update_and_grn_amendment.sql
-- Description: Implement enterprise-grade update mechanisms for Purchase Orders and Goods Receipts with financial auto-backfill.

-------------------------------------------------------------------------------
-- 1. FINANCIAL AUTO-CALCULATION TRIGGER
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_purchase_financial_recalc()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure financial columns are never 0 if taxes should be applied
    IF NEW.grand_total = NEW.total_raw_amount AND NEW.total_raw_amount > 0 THEN
        NEW.cgst_amount := NEW.total_raw_amount * 0.09;
        NEW.sgst_amount := NEW.total_raw_amount * 0.09;
        NEW.grand_total := NEW.total_raw_amount + NEW.cgst_amount + NEW.sgst_amount + NEW.other_charges;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_financial_calc ON public.asset_purchases;
CREATE TRIGGER trg_purchase_financial_calc
BEFORE INSERT OR UPDATE ON public.asset_purchases
FOR EACH ROW EXECUTE FUNCTION public.fn_purchase_financial_recalc();

-------------------------------------------------------------------------------
-- 2. PO AMENDMENT RPC
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_purchase_order(
    p_id                uuid,
    p_purchase_date     date,
    p_notes             text,
    p_status            text,
    p_other_charges      numeric,
    p_items             jsonb 
) RETURNS boolean AS $$
DECLARE
    v_item jsonb;
    v_total_base numeric := 0;
BEGIN
    -- 1. Update Header
    UPDATE public.asset_purchases 
    SET 
        purchase_date = p_purchase_date,
        notes = p_notes,
        status = p_status,
        other_charges = p_other_charges,
        updated_at = now()
    WHERE id = p_id;

    -- 2. Update Items 
    DELETE FROM public.asset_purchase_items WHERE purchase_id = p_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.asset_purchase_items (
            purchase_id, asset_type_id, asset_name, model_number,
            quantity, unit_price, total_price
        ) VALUES (
            p_id,
            (v_item->>'assetTypeId')::uuid,
            (v_item->>'name')::text,
            (v_item->>'model')::text,
            (v_item->>'quantity')::integer,
            (v_item->>'unitPrice')::numeric,
            (v_item->>'totalPrice')::numeric
        );
        v_total_base := v_total_base + (v_item->>'totalPrice')::numeric;
    END LOOP;

    -- 3. Force Refresh Header Financials
    UPDATE public.asset_purchases 
    SET total_raw_amount = v_total_base
    WHERE id = p_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 3. GRN AMENDMENT RPC
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_grn(
    p_id                uuid,
    p_received_date     date,
    p_notes             text,
    p_challan_number    text,
    p_challan_date      date,
    p_inward_number     text
) RETURNS boolean AS $$
BEGIN
    UPDATE public.asset_grns 
    SET 
        received_date = p_received_date,
        notes = p_notes,
        challan_number = p_challan_number,
        challan_date = p_challan_date,
        inward_number = p_inward_number,
        updated_at = now()
    WHERE id = p_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
