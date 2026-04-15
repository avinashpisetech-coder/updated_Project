-- v119_procurement_specification_patch.sql
-- Description: FINAL REPAIR for missing logistical columns and Material Remarks support.

BEGIN;

-- 1. REPAIR: Adding missing logistical governance columns to Purchase Orders
ALTER TABLE public.asset_purchases 
ADD COLUMN IF NOT EXISTS po_type          text DEFAULT 'Domestic',
ADD COLUMN IF NOT EXISTS branch           text DEFAULT 'HO_HEAD_OFFICE',
ADD COLUMN IF NOT EXISTS reference        text,
ADD COLUMN IF NOT EXISTS fiscal_year      text DEFAULT '2024-25',
ADD COLUMN IF NOT EXISTS amendment_number integer DEFAULT 0;

-- 2. AUDIT ENHANCEMENT: Adding material-level specifications (Remarks)
ALTER TABLE public.asset_purchase_items 
ADD COLUMN IF NOT EXISTS remarks text;

-- 3. BUDGET GUARD: Initializing spending tracking for the new fiscal year
-- (Assuming budgets are already defined in asset_budgets)

-- 4. RPC UPGRADE: Redeploying update_purchase_order_v2 with REMARKS support
CREATE OR REPLACE FUNCTION public.update_purchase_order_v2(
    p_id                uuid,
    p_purchase_date     date,
    p_notes             text,
    p_status            text,
    p_amendment_number  integer,
    p_other_charges     numeric,
    p_items             jsonb,
    p_supplier_id       uuid,
    p_project_id        uuid DEFAULT NULL,
    p_po_number         text DEFAULT NULL,
    p_po_type          text DEFAULT 'Domestic',
    p_branch            text DEFAULT 'HO_HEAD_OFFICE',
    p_reference         text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
    v_item jsonb;
    v_total_base numeric := 0;
BEGIN
    -- 1. Update Header Metadata (Full Spectrum including Reference & Amendment)
    UPDATE public.asset_purchases 
    SET 
        purchase_date = p_purchase_date,
        notes = p_notes,
        status = p_status,
        amendment_number = p_amendment_number,
        other_charges = p_other_charges,
        supplier_id = p_supplier_id,
        project_id = p_project_id,
        po_number = COALESCE(p_po_number, po_number),
        po_type = COALESCE(p_po_type, po_type),
        branch = COALESCE(p_branch, branch),
        reference = COALESCE(p_reference, reference),
        updated_at = now()
    WHERE id = p_id;

    -- 2. Synchronize Line Items (Atomic Reset with Remarks support)
    DELETE FROM public.asset_purchase_items WHERE purchase_id = p_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.asset_purchase_items (
            purchase_id, 
            asset_type_id, 
            asset_name, 
            model_number,
            quantity, 
            unit_price, 
            total_price,
            remarks,
            item_purchase_date
        ) VALUES (
            p_id,
            (v_item->>'assetTypeId')::uuid,
            (v_item->>'name')::text,
            (v_item->>'model')::text,
            (v_item->>'quantity')::integer,
            (v_item->>'unitPrice')::numeric,
            (v_item->>'totalPrice')::numeric,
            (v_item->>'remarks')::text,
            COALESCE((v_item->>'purchaseDate')::date, p_purchase_date)
        );
        v_total_base := v_total_base + (v_item->>'totalPrice')::numeric;
    END LOOP;

    -- 3. Update Financial Aggregate
    UPDATE public.asset_purchases 
    SET 
        total_raw_amount = v_total_base,
        cgst_amount = (v_total_base * 0.09),
        sgst_amount = (v_total_base * 0.09),
        grand_total = (v_total_base * 1.18) + COALESCE(p_other_charges, 0)
    WHERE id = p_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
