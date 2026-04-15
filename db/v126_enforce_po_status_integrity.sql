-- v126_enforce_po_status_integrity.sql
-- Description: Harden PO status registry with amendment-aware labeling and integrity constraints.
-- Fix: Map legacy statuses ('pending', 'draft_amended', etc.) to the new set BEFORE adding the constraint.

BEGIN;

-------------------------------------------------------------------------------
-- 1. CLEAN SLATE: Drop all existing status constraints to prevent interference
-------------------------------------------------------------------------------
DO $$ 
DECLARE 
    v_constraint_name text;
BEGIN
    FOR v_constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.asset_purchases'::regclass AND contype = 'c' AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.asset_purchases DROP CONSTRAINT ' || v_constraint_name;
    END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 2. DATA MIGRATION: Map all legacy statuses to the new standardized set
-------------------------------------------------------------------------------
-- First pass: Map known legacy terms
UPDATE public.asset_purchases 
SET status = CASE 
    WHEN status IS NULL OR TRIM(status) = '' THEN 'draft'
    WHEN LOWER(status) = 'pending' THEN 'draft'
    WHEN LOWER(status) = 'draft_amended' THEN 'Amend & Draft'
    WHEN LOWER(status) = 'pending_amendment' THEN 'Amend & Submitted'
    ELSE status 
END;

-- Second pass: Ensure exact casing and handle any outliers
UPDATE public.asset_purchases
SET status = 'draft'
WHERE status NOT IN (
    'draft', 'submitted', 'approved', 'received', 'cancelled',
    'Amend & Draft', 'Amend & Submitted', 'Amend & Approved'
);

-------------------------------------------------------------------------------
-- 3. SCHEMA HARDENING: Enforce NOT NULL and valid status transitions
-------------------------------------------------------------------------------
ALTER TABLE public.asset_purchases 
ALTER COLUMN status SET DEFAULT 'draft',
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.asset_purchases 
ADD CONSTRAINT po_status_check 
CHECK (status IN (
    'draft', 'submitted', 'approved', 'received', 'cancelled',
    'Amend & Draft', 'Amend & Submitted', 'Amend & Approved'
));

-------------------------------------------------------------------------------
-- 4. RPC RE-ENGINEERING: Make create_purchase_order AMENDMENT-AWARE & CLEAN
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase_order(
    p_po_number         text,
    p_supplier_id       uuid,
    p_project_id        uuid DEFAULT NULL,
    p_purchase_date     date DEFAULT CURRENT_DATE,
    p_total_raw_amount  numeric DEFAULT 0,
    p_total_cgst        numeric DEFAULT 0,
    p_total_sgst        numeric DEFAULT 0,
    p_total_igst        numeric DEFAULT 0,
    p_grand_total       numeric DEFAULT 0,
    p_status            text DEFAULT 'draft',
    p_notes             text DEFAULT '',
    p_items             jsonb DEFAULT '[]'::jsonb,
    p_reference         text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_purchase_id uuid;
    v_item jsonb;
    v_final_status text;
    v_actual_type_id uuid;
    v_catalog_id uuid;
BEGIN
    -- Normalize Status
    v_final_status := LOWER(COALESCE(NULLIF(TRIM(p_status), ''), 'draft'));
    IF v_final_status = 'pending' THEN v_final_status := 'draft'; END IF;

    -- 1. Insert Header
    INSERT INTO public.asset_purchases (
        po_number, supplier_id, project_id, purchase_date,
        total_raw_amount, cgst_amount, sgst_amount, igst_amount, 
        gst_amount, grand_total, status, notes, reference
    ) VALUES (
        p_po_number, p_supplier_id, p_project_id, p_purchase_date,
        p_total_raw_amount, p_total_cgst, p_total_sgst, p_total_igst,
        (p_total_cgst + p_total_sgst + p_total_igst), p_grand_total,
        v_final_status, p_notes, p_reference
    ) RETURNING id INTO v_purchase_id;

    -- 2. Insert Items with Dynamic Type Lookup
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_actual_type_id := (v_item->>'assetTypeId')::uuid;
        v_catalog_id := (v_item->>'catalogId')::uuid;

        -- SMART LOOKUP: catalog -> sub_type -> type
        IF v_actual_type_id IS NULL AND v_catalog_id IS NOT NULL THEN
            SELECT ast.type_id INTO v_actual_type_id 
            FROM public.asset_catalog ac
            JOIN public.asset_sub_types ast ON ac.sub_type_id = ast.id
            WHERE ac.id = v_catalog_id;
        END IF;

        -- Absolute Fallback
        IF v_actual_type_id IS NULL THEN
            v_actual_type_id := (SELECT id FROM public.asset_types WHERE name ILIKE '%IT%' LIMIT 1);
        END IF;
        
        IF v_actual_type_id IS NULL THEN
            v_actual_type_id := (SELECT id FROM public.asset_types LIMIT 1);
        END IF;

        INSERT INTO public.asset_purchase_items (
            purchase_id, asset_type_id, asset_name, model_number,
            quantity, unit_price, total_price, remarks, item_purchase_date
        ) VALUES (
            v_purchase_id, v_actual_type_id, (v_item->>'name'), (v_item->>'model'),
            (v_item->>'quantity')::numeric, (v_item->>'unitPrice')::numeric,
            (v_item->>'totalPrice')::numeric, (v_item->>'remarks'), (v_item->>'purchaseDate')::date
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$ LANGUAGE plpgsql;

-------------------------------------------------------------------------------
-- 5. RPC RE-ENGINEERING: Make update_purchase_order_v2 AMENDMENT-AWARE & CLEAN
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_purchase_order_v2(
    p_id uuid,
    p_po_number text,
    p_supplier_id uuid,
    p_project_id uuid,
    p_purchase_date date,
    p_po_type text,
    p_branch text,
    p_reference text,
    p_notes text,
    p_status text,
    p_amendment_number integer,
    p_other_charges numeric,
    p_items jsonb
) RETURNS void AS $$
DECLARE
    v_item jsonb;
    v_item_ids uuid[];
    v_actual_type_id uuid;
    v_catalog_id uuid;
    v_final_status text;
BEGIN
    -- AUTOMATIC AMENDMENT PREFIXING
    v_final_status := COALESCE(NULLIF(TRIM(p_status), ''), 'draft');
    IF v_final_status = 'pending' THEN v_final_status := 'draft'; END IF;
    
    IF p_amendment_number > 0 THEN
        IF v_final_status IN ('draft', 'submitted', 'approved') AND NOT (v_final_status LIKE 'Amend & %') THEN
            v_final_status := 'Amend & ' || v_final_status;
        END IF;
    END IF;

    -- 1. Update Header
    UPDATE public.asset_purchases
    SET po_number = p_po_number,
        supplier_id = p_supplier_id,
        project_id = p_project_id,
        purchase_date = p_purchase_date,
        po_type = p_po_type,
        branch = p_branch,
        reference = p_reference,
        notes = p_notes,
        status = v_final_status,
        amendment_number = p_amendment_number,
        other_charges = p_other_charges,
        updated_at = now()
    WHERE id = p_id;

    -- 2. Identify materials to keep
    v_item_ids := ARRAY(
        SELECT (x->>'id')::uuid 
        FROM jsonb_array_elements(p_items) x 
        WHERE (x->>'id') IS NOT NULL 
          AND (x->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );

    -- 3. Delete safe materials (NOT in payload AND NOT in GRN)
    DELETE FROM public.asset_purchase_items 
    WHERE purchase_id = p_id 
      AND id NOT IN (SELECT unnest(v_item_ids))
      AND id NOT IN (SELECT purchase_item_id FROM public.asset_grn_items);

    -- 4. Sync line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        IF (v_item->>'id') IS NOT NULL AND (v_item->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            UPDATE public.asset_purchase_items
            SET unit_price = (v_item->>'unitPrice')::numeric,
                total_price = (v_item->>'totalPrice')::numeric,
                remarks = (v_item->>'remarks'),
                asset_type_id = COALESCE((v_item->>'assetTypeId')::uuid, asset_type_id),
                updated_at = now()
            WHERE id = (v_item->>'id')::uuid AND purchase_id = p_id;
        ELSE
            -- Treat as new item
            v_actual_type_id := (v_item->>'assetTypeId')::uuid;
            v_catalog_id := (v_item->>'catalogId')::uuid;

            -- SMART LOOKUP: catalog -> sub_type -> type
            IF v_actual_type_id IS NULL AND v_catalog_id IS NOT NULL THEN
                SELECT ast.type_id INTO v_actual_type_id 
                FROM public.asset_catalog ac
                JOIN public.asset_sub_types ast ON ac.sub_type_id = ast.id
                WHERE ac.id = v_catalog_id;
            END IF;

            -- Absolute Fallback
            IF v_actual_type_id IS NULL THEN
                v_actual_type_id := (SELECT id FROM public.asset_types WHERE name ILIKE '%IT%' LIMIT 1);
            END IF;
            
            IF v_actual_type_id IS NULL THEN
                v_actual_type_id := (SELECT id FROM public.asset_types LIMIT 1);
            END IF;

            INSERT INTO public.asset_purchase_items (
                purchase_id, asset_type_id, asset_name, model_number, 
                quantity, unit_price, total_price, remarks, item_purchase_date
            ) VALUES (
                p_id, v_actual_type_id, (v_item->>'name'), (v_item->>'model'),
                (v_item->>'quantity')::numeric, (v_item->>'unitPrice')::numeric, 
                (v_item->>'totalPrice')::numeric, (v_item->>'remarks'), COALESCE((v_item->>'purchaseDate')::date, p_purchase_date)
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;
