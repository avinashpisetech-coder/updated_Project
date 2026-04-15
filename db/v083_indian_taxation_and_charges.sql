-- v083_indian_taxation_and_charges.sql
-- Description: Implement Indian state-wise taxation logic (CGST/SGST/IGST) and additional charges support.

-- 1. Add state-location awareness to masters
ALTER TABLE public.asset_suppliers 
ADD COLUMN IF NOT EXISTS state text DEFAULT 'Maharashtra'; -- Defaulting to a common tech hub state or keeping it nullable

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS state text DEFAULT 'Maharashtra';

-- 2. Extend Purchase Transactions with granular financial breakdown
ALTER TABLE public.asset_purchases
ADD COLUMN IF NOT EXISTS other_charges numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS cgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS sgst_amount numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS igst_amount numeric(15,2) DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS is_interstate boolean DEFAULT false;

-- 3. Update create_purchase_order RPC to handle new fields
CREATE OR REPLACE FUNCTION public.create_purchase_order(
    p_po_number text,
    p_supplier_id uuid,
    p_project_id uuid,
    p_purchase_date date,
    p_total_raw_amount numeric,
    p_gst_percentage numeric,
    p_gst_amount numeric,
    p_grand_total numeric,
    p_status text,
    p_notes text,
    p_items jsonb, -- array of objects with {name, model, assetTypeId, quantity, unitPrice, totalPrice}
    p_other_charges numeric DEFAULT 0,
    p_cgst_amount numeric DEFAULT 0,
    p_sgst_amount numeric DEFAULT 0,
    p_igst_amount numeric DEFAULT 0,
    p_is_interstate boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
    v_purchase_id uuid;
    v_item jsonb;
BEGIN
    -- 1. Insert Header
    INSERT INTO public.asset_purchases (
        po_number, 
        supplier_id, 
        project_id, 
        purchase_date, 
        total_raw_amount, 
        gst_percentage, 
        gst_amount, 
        grand_total, 
        status, 
        notes,
        other_charges,
        cgst_amount,
        sgst_amount,
        igst_amount,
        is_interstate
    ) VALUES (
        p_po_number, 
        p_supplier_id, 
        p_project_id, 
        p_purchase_date, 
        p_total_raw_amount, 
        p_gst_percentage, 
        p_gst_amount, 
        p_grand_total, 
        p_status, 
        p_notes,
        p_other_charges,
        p_cgst_amount,
        p_sgst_amount,
        p_igst_amount,
        p_is_interstate
    ) RETURNING id INTO v_purchase_id;

    -- 2. Insert Line Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.asset_purchase_items (
            purchase_id,
            name,
            model,
            asset_type_id,
            quantity,
            unit_price,
            total_price
        ) VALUES (
            v_purchase_id,
            v_item->>'name',
            v_item->>'model',
            (v_item->>'assetTypeId')::uuid,
            (v_item->>'quantity')::integer,
            (v_item->>'unitPrice')::numeric,
            (v_item->>'totalPrice')::numeric
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
