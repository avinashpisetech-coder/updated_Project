-- v185_update_grn_hydration_with_master_fields.sql
-- Description: Update GRN Hydration logic to populate new Asset Master fields from PO/GRN context.

CREATE OR REPLACE FUNCTION public.receive_grn_and_hydrate_stock(
    p_purchase_id       uuid,
    p_grn_number        text,
    p_received_date     date,
    p_challan_number    text,
    p_challan_date      date,
    p_inward_number     text,
    p_status           text,
    p_notes            text,
    p_items            jsonb -- Array of {purchase_item_id, quantity, sub_type_id, brand, model, is_master_carton, asset_prefix, linked_indents: [{id, store_id, department_id, project_id, allocated_quantity}]}
)
RETURNS uuid AS $$
DECLARE
    v_grn_id uuid;
    v_operator_id uuid;
    v_item record;
    v_purchase_item record;
    v_indent record;
    v_qty_to_hydrate int;
    v_indent_qty_to_fill int;
    v_asset_id uuid;
    v_asset_code text;
    v_asset_counter int := 1;
    v_final_sub_type_id uuid;
    
    -- PO context fields
    v_supplier_id uuid;
    v_po_raw_amt numeric;
    v_po_tax_amt numeric;
    v_po_grand_total numeric;
    v_cert_company_id uuid;
    v_po_date date;
BEGIN
    v_operator_id := auth.uid();

    -- 0. Fetch PO Context
    SELECT 
        ap.supplier_id, 
        ap.total_raw_amount, 
        ap.gst_amount, 
        ap.grand_total,
        ap.purchase_date,
        p.company_id
    INTO 
        v_supplier_id, 
        v_po_raw_amt, 
        v_po_tax_amt, 
        v_po_grand_total,
        v_po_date,
        v_cert_company_id
    FROM public.asset_purchases ap
    LEFT JOIN public.projects p ON ap.project_id = p.id
    WHERE ap.id = p_purchase_id;

    -- 1. Create GRN Header
    INSERT INTO public.asset_grns (
        purchase_id, grn_number, received_date, challan_number, challan_date, 
        inward_number, status, notes, received_by
    ) VALUES (
        p_purchase_id, p_grn_number, p_received_date, p_challan_number, p_challan_date, 
        p_inward_number, p_status, p_notes, v_operator_id
    ) RETURNING id INTO v_grn_id;

    -- 2. Process Items
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
        
        -- A. Record GRN Line Item
        INSERT INTO public.asset_grn_items (
            grn_id, purchase_item_id, received_quantity
        ) VALUES (
            v_grn_id, v_item.purchase_item_id, v_item.quantity
        );

        -- Update PO Item received quantity
        UPDATE public.asset_purchase_items 
        SET received_quantity = received_quantity + v_item.quantity
        WHERE id = v_item.purchase_item_id;

        -- B. Fetch core item reference for type lookup
        SELECT * INTO v_purchase_item FROM public.asset_purchase_items WHERE id = v_item.purchase_item_id;

        -- C. SMART SUB-TYPE LOOKUP
        v_final_sub_type_id := v_item.sub_type_id;
        IF v_final_sub_type_id IS NULL THEN
            SELECT id INTO v_final_sub_type_id 
            FROM public.asset_sub_types 
            WHERE type_id = v_purchase_item.asset_type_id 
            ORDER BY created_at ASC
            LIMIT 1;

            IF v_final_sub_type_id IS NULL THEN
                SELECT id INTO v_final_sub_type_id FROM public.asset_sub_types LIMIT 1;
            END IF;
        END IF;

        -- D. Stock Hydration Loop
        v_qty_to_hydrate := v_item.quantity;
        
        IF v_item.linked_indents IS NOT NULL THEN
            FOR v_indent IN SELECT * FROM jsonb_to_recordset(v_item.linked_indents) AS y(
                id uuid, store_id uuid, department_id uuid, project_id uuid, allocated_quantity int
            ) LOOP
                IF v_qty_to_hydrate <= 0 THEN EXIT; END IF;

                v_indent_qty_to_fill := LEAST(v_qty_to_hydrate, v_indent.allocated_quantity);
                
                FOR i IN 1..v_indent_qty_to_fill LOOP
                    -- Asset Code Generation
                    IF v_item.is_master_carton AND v_item.asset_prefix IS NOT NULL AND v_item.asset_prefix <> '' THEN
                        v_asset_code := v_item.asset_prefix || LPAD((v_asset_counter)::text, 4, '0');
                        v_asset_counter := v_asset_counter + 1;
                    ELSE
                        v_asset_code := NULL;
                    END IF;

                    INSERT INTO public.assets (
                        sub_type_id, brand, model, status, condition, 
                        purchase_date, unit_cost, 
                        project_id, store_id, department_id, 
                        indent_id, asset_code, received_status,
                        purchase_id, 
                        supplier_id,
                        certifying_company_id,
                        asset_name,
                        po_amount,
                        tax_amount,
                        gross_po_value,
                        net_asset_value,
                        grn_id
                    ) VALUES (
                        v_final_sub_type_id, v_item.brand, v_item.model, 'in_stock', 'new',
                        p_received_date, v_purchase_item.unit_price,
                        v_indent.project_id, v_indent.store_id, v_indent.department_id,
                        v_indent.id, v_asset_code, 'pending',
                        p_purchase_id,
                        v_supplier_id,
                        v_cert_company_id,
                        v_purchase_item.asset_name,
                        v_po_raw_amt,
                        v_po_tax_amt,
                        v_po_grand_total,
                        v_po_grand_total, -- net asset value initially is grand total
                        v_grn_id
                    ) RETURNING id INTO v_asset_id;

                    INSERT INTO public.stock_movements (
                        asset_id, type, direction, quantity, performed_by, notes
                    ) VALUES (
                        v_asset_id, 'purchase_inward', 'in', 1, v_operator_id, 'Hydrated via Indent Fulfillment from GRN: ' || p_grn_number
                    );
                END LOOP;

                -- Update Indent Status if fulfilled
                UPDATE public.asset_indents 
                SET status = 'fulfilled' 
                WHERE id = v_indent.id;

                v_qty_to_hydrate := v_qty_to_hydrate - v_indent_qty_to_fill;
            END LOOP;
        END IF;

        IF v_qty_to_hydrate > 0 THEN
            FOR i IN 1..v_qty_to_hydrate LOOP
                IF v_item.is_master_carton AND v_item.asset_prefix IS NOT NULL AND v_item.asset_prefix <> '' THEN
                    v_asset_code := v_item.asset_prefix || LPAD((v_asset_counter)::text, 4, '0');
                    v_asset_counter := v_asset_counter + 1;
                ELSE
                    v_asset_code := NULL;
                END IF;

                INSERT INTO public.assets (
                    sub_type_id, brand, model, status, condition, 
                    purchase_date, unit_cost, 
                    asset_code, received_status,
                    purchase_id,
                    supplier_id,
                    certifying_company_id,
                    asset_name,
                    po_amount,
                    tax_amount,
                    gross_po_value,
                    net_asset_value,
                    grn_id
                ) VALUES (
                    v_final_sub_type_id, v_item.brand, v_item.model, 'in_stock', 'new',
                    p_received_date, v_purchase_item.unit_price,
                    v_asset_code, 'pending',
                    p_purchase_id,
                    v_supplier_id,
                    v_cert_company_id,
                    v_purchase_item.asset_name,
                    v_po_raw_amt,
                    v_po_tax_amt,
                    v_po_grand_total,
                    v_po_grand_total,
                    v_grn_id
                ) RETURNING id INTO v_asset_id;

                INSERT INTO public.stock_movements (
                    asset_id, type, direction, quantity, performed_by, notes
                ) VALUES (
                    v_asset_id, 'purchase_inward', 'in', 1, v_operator_id, 'Hydrated to General Pool from GRN: ' || p_grn_number
                );
            END LOOP;
        END IF;

    END LOOP;

    RETURN v_grn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
