-- v141_itam_automated_provisioning.sql
-- Description: Core execution engine for Automated Hardware Provisioning, Stock Control, and Dispatch Logs.

-------------------------------------------------------------------------------
-- 1. SCHEMA ENHANCEMENT (Stock Control Flag)
-------------------------------------------------------------------------------

ALTER TABLE public.asset_sub_types 
    ADD COLUMN IF NOT EXISTS allow_negative_stock boolean DEFAULT false;

-- Add comment for administrative clarity
COMMENT ON COLUMN public.asset_sub_types.allow_negative_stock IS 'If TRUE, Dispatch Protocol will allow handover even with 0 stock, triggering an Auto-Indent.';

-------------------------------------------------------------------------------
-- 2. LOGIC ENGINE: EXECUTE_DISPATCH_PROTOCOL
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.execute_dispatch_protocol(
    p_on_behalf_of      uuid,
    p_project_id        uuid,
    p_dept_id           uuid,
    p_store_id          uuid,
    p_justification     text,
    p_items             jsonb -- Array of {sub_type_id, quantity, remark, attachment_refs}
) RETURNS text AS $$
DECLARE
    v_requisition_id uuid;
    v_req_num text;
    v_item jsonb;
    v_sub_type_id uuid;
    v_requested_qty int;
    v_in_stock_qty int;
    v_allow_negative boolean;
    v_handover_items jsonb := '[]'::jsonb;
    v_assets uuid[];
    v_asset_id uuid;
    v_fulfilled_any boolean := false;
    v_indent_count int := 0;
BEGIN
    -- 1. Generate Requisition Number
    v_req_num := 'REQ-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.asset_handover_number_seq')::text, 5, '0');

    -- 2. Create Requisition Header
    INSERT INTO public.asset_requisitions (
        requisition_number, requested_by, on_behalf_of, project_id, department_id, store_id, justification, status
    ) VALUES (
        v_req_num, auth.uid(), p_on_behalf_of, p_project_id, p_dept_id, p_store_id, p_justification, 'pending_approval'
    ) RETURNING id INTO v_requisition_id;

    -- 3. Process Manifest Units
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_sub_type_id := (v_item->>'sub_type_id')::uuid;
        v_requested_qty := (v_item->>'quantity')::int;
        
        -- 3.1 Fetch Control Metadata
        SELECT allow_negative_stock INTO v_allow_negative FROM public.asset_sub_types WHERE id = v_sub_type_id;
        
        -- 3.2 Check Real-time Stock
        SELECT count(*) INTO v_in_stock_qty 
        FROM public.assets 
        WHERE sub_type_id = v_sub_type_id 
          AND status = 'in_stock' 
          AND store_id = p_store_id;

        -- 3.3 Create Requisition Item
        INSERT INTO public.asset_requisition_items (
            requisition_id, sub_type_id, quantity, specifications, status
        ) VALUES (
            v_requisition_id, 
            v_sub_type_id, 
            v_requested_qty, 
            jsonb_build_object(
                'remark', v_item->>'remark',
                'attachment_refs', v_item->'attachment_refs',
                'initial_stock_check', v_in_stock_qty
            ),
            CASE WHEN v_in_stock_qty >= v_requested_qty THEN 'allocated' ELSE 'pending' END
        );

        -- 3.4 Logic: Automated Fulfillment or Indent Trigger
        IF v_in_stock_qty < v_requested_qty THEN
            IF NOT v_allow_negative THEN
                -- If NO Negative Stock: Just raise a manual indent warning (status is pending)
                NULL; 
            ELSE
                -- If YES Negative Stock: Create Auto Indent
                INSERT INTO public.asset_indents (
                    indent_number, requisition_item_id, sub_type_id, quantity, status, project_id, store_id, department_id, resolution_type
                ) VALUES (
                    'IND-AUTO-' || v_req_num || '-' || v_indent_count,
                    (SELECT id FROM public.asset_requisition_items WHERE requisition_id = v_requisition_id AND sub_type_id = v_sub_type_id ORDER BY created_at DESC LIMIT 1),
                    v_sub_type_id,
                    v_requested_qty - v_in_stock_qty,
                    'pending',
                    p_project_id,
                    p_store_id,
                    p_dept_id,
                    'auto_triggered'
                );
                v_indent_count := v_indent_count + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_req_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
