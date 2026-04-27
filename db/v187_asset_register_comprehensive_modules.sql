-- v187_asset_register_comprehensive_modules.sql
-- Description: Implement Insurance, Modifications, and snapshotting columns for the modernized Asset Register.
-- Also decouples GRN creation from Stock Hydration to allow 'Approval-Based Ingestion'.

BEGIN;

-------------------------------------------------------------------------------
-- 1. TABLE EXTENSIONS (SNAPSHOTS)
-------------------------------------------------------------------------------

ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS po_number       text,
ADD COLUMN IF NOT EXISTS grn_number      text,
ADD COLUMN IF NOT EXISTS indent_number   text,
ADD COLUMN IF NOT EXISTS uom_id          uuid REFERENCES public.asset_uom(id),
ADD COLUMN IF NOT EXISTS catalog_id      uuid REFERENCES public.asset_catalog(id),
ADD COLUMN IF NOT EXISTS salvage_value   numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_number  text;

-------------------------------------------------------------------------------
-- 2. ASSET INSURANCE MODULE
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_insurance (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    policy_number       text NOT NULL,
    provider_name       text NOT NULL,
    insurance_type      text, -- e.g. 'Comprehensive', 'Theft', etc.
    start_date          date NOT NULL,
    expiry_date         date NOT NULL,
    premium_amount      numeric(15,2) DEFAULT 0,
    insured_value       numeric(15,2) DEFAULT 0,
    document_path       text,
    status              text DEFAULT 'active', -- 'active', 'expired', 'cancelled'
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    created_by          uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_asset_insurance_asset_id ON public.asset_insurance(asset_id);

-------------------------------------------------------------------------------
-- 3. ASSET MODIFICATIONS/UPGRADES MODULE
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_modifications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    modification_date   date NOT NULL,
    modification_type   text NOT NULL, -- e.g. 'RAM Upgrade', 'SSD Replacement', 'Software License'
    description         text,
    cost                numeric(15,2) DEFAULT 0,
    performed_by        text, -- Name of technician or vendor
    approval_reference  text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    created_by          uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_asset_modifications_asset_id ON public.asset_modifications(asset_id);

-------------------------------------------------------------------------------
-- 4. GRN HYDRATION REFACTORING
-------------------------------------------------------------------------------

-- Function to only register the GRN without creating physical assets
CREATE OR REPLACE FUNCTION public.save_grn_protocol(
    p_purchase_id       uuid,
    p_grn_number        text,
    p_received_date     date,
    p_challan_number    text,
    p_challan_date      date,
    p_inward_number     text,
    p_status           text,
    p_notes            text,
    p_items            jsonb -- Same structure as v185
)
RETURNS uuid AS $$
DECLARE
    v_grn_id uuid;
    v_operator_id uuid;
    v_item record;
BEGIN
    v_operator_id := auth.uid();

    -- 1. Create GRN Header
    INSERT INTO public.asset_grns (
        purchase_id, grn_number, received_date, challan_number, challan_date, 
        inward_number, status, notes, received_by
    ) VALUES (
        p_purchase_id, p_grn_number, p_received_date, p_challan_number, p_challan_date, 
        p_inward_number, p_status, p_notes, v_operator_id
    ) RETURNING id INTO v_grn_id;

    -- 2. Record GRN Line Items (Metadata only)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        purchase_item_id uuid, 
        quantity int,
        sub_type_id uuid,
        brand text,
        model text,
        is_master_carton boolean,
        asset_prefix text,
        linked_indents jsonb
    ) LOOP
        INSERT INTO public.asset_grn_items (
            grn_id, purchase_item_id, received_quantity, 
            metadata -- Store the hydration data for later approval
        ) VALUES (
            v_grn_id, v_item.purchase_item_id, v_item.quantity,
            jsonb_build_object(
                'sub_type_id', v_item.sub_type_id,
                'brand', v_item.brand,
                'model', v_item.model,
                'is_master_carton', v_item.is_master_carton,
                'asset_prefix', v_item.asset_prefix,
                'linked_indents', v_item.linked_indents
            )
        );
    END LOOP;

    RETURN v_grn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle approval and asset registration
CREATE OR REPLACE FUNCTION public.approve_grn_and_register_assets(
    p_grn_id uuid
)
RETURNS void AS $$
DECLARE
    v_grn record;
    v_po record;
    v_item record;
    v_indent record;
    v_qty_to_hydrate int;
    v_indent_qty_to_fill int;
    v_asset_id uuid;
    v_asset_code text;
    v_asset_counter int := 1;
    v_operator_id uuid;
    v_purchase_item record;
    v_final_sub_type_id uuid;
    v_uom_id uuid;
BEGIN
    v_operator_id := auth.uid();

    -- 1. Fetch GRN and PO Context
    SELECT * INTO v_grn FROM public.asset_grns WHERE id = p_grn_id;
    IF v_grn.status = 'approved' THEN RAISE EXCEPTION 'GRN already approved and hydrated.'; END IF;

    SELECT 
        ap.po_number, ap.supplier_id, ap.total_raw_amount, ap.gst_amount, ap.grand_total, ap.purchase_date, p.company_id
    INTO v_po
    FROM public.asset_purchases ap
    LEFT JOIN public.projects p ON ap.project_id = p.id
    WHERE ap.id = v_grn.purchase_id;

    -- 2. Process each GRN Item
    FOR v_item IN SELECT * FROM public.asset_grn_items WHERE grn_id = p_grn_id LOOP
        
        -- Fetch hydration metadata
        SELECT * INTO v_purchase_item FROM public.asset_purchase_items WHERE id = v_item.purchase_item_id;
        
        v_final_sub_type_id := (v_item.metadata->>'sub_type_id')::uuid;
        IF v_final_sub_type_id IS NULL THEN
            SELECT id INTO v_final_sub_type_id FROM public.asset_sub_types WHERE type_id = v_purchase_item.asset_type_id LIMIT 1;
        END IF;

        -- Fetch UOM from catalog if available in metadata
        v_uom_id := (v_item.metadata->>'uom_id')::uuid;
        IF v_uom_id IS NULL AND v_final_sub_type_id IS NOT NULL THEN
             -- Fallback to catalog or sub_type default if exists
             SELECT uom_id INTO v_uom_id FROM public.asset_catalog WHERE sub_type_id = v_final_sub_type_id LIMIT 1;
        END IF;

        v_qty_to_hydrate := v_item.received_quantity;

        -- A. Handle Indent-Linked Hydration
        IF v_item.metadata->'linked_indents' IS NOT NULL THEN
            FOR v_indent IN SELECT * FROM jsonb_to_recordset(v_item.metadata->'linked_indents') AS y(
                id uuid, store_id uuid, department_id uuid, project_id uuid, allocated_quantity int
            ) LOOP
                IF v_qty_to_hydrate <= 0 THEN EXIT; END IF;
                v_indent_qty_to_fill := LEAST(v_qty_to_hydrate, v_indent.allocated_quantity);

                FOR i IN 1..v_indent_qty_to_fill LOOP
                    -- Asset Code Generation
                    IF (v_item.metadata->>'is_master_carton')::boolean AND v_item.metadata->>'asset_prefix' <> '' THEN
                        v_asset_code := v_item.metadata->>'asset_prefix' || LPAD((v_asset_counter)::text, 4, '0');
                        v_asset_counter := v_asset_counter + 1;
                    ELSE
                        v_asset_code := NULL;
                    END IF;

                    INSERT INTO public.assets (
                        sub_type_id, brand, model, status, condition, purchase_date, unit_cost, 
                        project_id, store_id, department_id, indent_id, asset_code, received_status,
                        purchase_id, supplier_id, certifying_company_id, asset_name,
                        po_amount, tax_amount, gross_po_value, net_asset_value, grn_id,
                        po_number, grn_number, uom_id
                    ) VALUES (
                        v_final_sub_type_id, v_item.metadata->>'brand', v_item.metadata->>'model', 'in_stock', 'new', 
                        v_grn.received_date, v_purchase_item.unit_price,
                        v_indent.project_id, v_indent.store_id, v_indent.department_id, v_indent.id, v_asset_code, 'pending',
                        v_grn.purchase_id, v_po.supplier_id, v_po.company_id, v_purchase_item.asset_name,
                        v_po.total_raw_amount, v_po.gst_amount, v_po.grand_total, v_po.grand_total, v_grn.id,
                        v_po.po_number, v_grn.grn_number, v_uom_id
                    ) RETURNING id INTO v_asset_id;

                    INSERT INTO public.stock_movements (
                        asset_id, type, direction, quantity, performed_by, notes
                    ) VALUES (
                        v_asset_id, 'purchase_inward', 'in', 1, v_operator_id, 'Hydrated via Indent Fulfillment of Approved GRN: ' || v_grn.grn_number
                    );
                END LOOP;
                v_qty_to_hydrate := v_qty_to_hydrate - v_indent_qty_to_fill;
            END LOOP;
        END IF;

        -- B. Handle General Pool Hydration
        IF v_qty_to_hydrate > 0 THEN
            FOR i IN 1..v_qty_to_hydrate LOOP
                IF (v_item.metadata->>'is_master_carton')::boolean AND v_item.metadata->>'asset_prefix' <> '' THEN
                    v_asset_code := v_item.metadata->>'asset_prefix' || LPAD((v_asset_counter)::text, 4, '0');
                    v_asset_counter := v_asset_counter + 1;
                ELSE
                    v_asset_code := NULL;
                END IF;

                INSERT INTO public.assets (
                    sub_type_id, brand, model, status, condition, purchase_date, unit_cost, 
                    asset_code, received_status, purchase_id, supplier_id, certifying_company_id, asset_name,
                    po_amount, tax_amount, gross_po_value, net_asset_value, grn_id,
                    po_number, grn_number, uom_id
                ) VALUES (
                    v_final_sub_type_id, v_item.metadata->>'brand', v_item.metadata->>'model', 'in_stock', 'new', 
                    v_grn.received_date, v_purchase_item.unit_price,
                    v_asset_code, 'pending', v_grn.purchase_id, v_po.supplier_id, v_po.company_id, v_purchase_item.asset_name,
                    v_po.total_raw_amount, v_po.gst_amount, v_po.grand_total, v_po.grand_total, v_grn.id,
                    v_po.po_number, v_grn.grn_number, v_uom_id
                ) RETURNING id INTO v_asset_id;

                INSERT INTO public.stock_movements (
                    asset_id, type, direction, quantity, performed_by, notes
                ) VALUES (
                    v_asset_id, 'purchase_inward', 'in', 1, v_operator_id, 'Hydrated to General Pool from Approved GRN: ' || v_grn.grn_number
                );
            END LOOP;
        END IF;

    END LOOP;

    -- 3. Update Status and Update PO item received qty
    UPDATE public.asset_grns SET status = 'approved', updated_at = now() WHERE id = p_grn_id;
    
    FOR v_item IN SELECT * FROM public.asset_grn_items WHERE grn_id = p_grn_id LOOP
        UPDATE public.asset_purchase_items 
        SET received_quantity = received_quantity + v_item.received_quantity
        WHERE id = v_item.purchase_item_id;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
