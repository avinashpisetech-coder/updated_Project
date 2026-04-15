-- v116_po_amendment_registry.sql
-- Description: Deploy the structural foundation for PO Amendment Versioning and Protocol Revisions.

DO $$
BEGIN
    -- 1. Add revision counter to the master purchase table
    ALTER TABLE public.asset_purchases ADD COLUMN IF NOT EXISTS amendment_number INTEGER DEFAULT 0;

    -- 2. Create the snapshot registry for historical versioning
    CREATE TABLE IF NOT EXISTS public.asset_purchase_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_id UUID REFERENCES public.asset_purchases(id) ON DELETE CASCADE,
        amendment_number INTEGER NOT NULL,
        snapshot JSONB NOT NULL, -- Contains full PO metadata and line items
        version_label TEXT NOT NULL, -- e.g., 'PO/FY26-27/0001/AMD/1'
        created_at TIMESTAMPTZ DEFAULT now(),
        created_by UUID REFERENCES auth.users(id)
    );

    -- 3. Update the allowed status list to include 'draft_amended' and 'pending_amendment'
    ALTER TABLE public.asset_purchases DROP CONSTRAINT IF EXISTS asset_purchases_status_check;
    ALTER TABLE public.asset_purchases ADD CONSTRAINT asset_purchases_status_check 
        CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'received', 'draft_amended', 'pending_amendment'));

END $$;

-------------------------------------------------------------------------------
-- FUNCTION: capture_po_snapshot
-- Stores the current state of a PO and its items into the versioning table.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.capture_po_snapshot(p_id uuid)
RETURNS void AS $$
DECLARE
    v_po RECORD;
    v_items JSONB;
    v_display_no TEXT;
    v_rev INTEGER;
BEGIN
    -- 1. Get PO metadata
    SELECT * INTO v_po FROM public.asset_purchases WHERE id = p_id;
    v_rev := v_po.amendment_number;
    
    -- 2. Construct Display Number
    v_display_no := v_po.po_number;
    IF (v_rev > 0) THEN
        v_display_no := v_display_no || '/AMD/' || v_rev;
    END IF;

    -- 3. Aggregate items into JSONB
    SELECT jsonb_agg(to_jsonb(api.*)) INTO v_items 
    FROM public.asset_purchase_items api 
    WHERE api.purchase_id = p_id;

    -- 4. Commit snapshot
    INSERT INTO public.asset_purchase_versions (
        purchase_id, amendment_number, version_label, snapshot, created_by
    ) VALUES (
        p_id, v_rev, v_display_no, 
        jsonb_build_object('metadata', to_jsonb(v_po), 'items', v_items),
        auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- TRIGGER: tr_auto_snapshot_on_approval
-- Automatically captures a version as soon as a PO is approved.
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_po_versioning()
RETURNS TRIGGER AS $$
BEGIN
    -- If status moves TO 'approved', capture the snapshot AFTER the update
    -- This ensures we have a record of every "Final" version.
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        -- We wait for the commit to finish or use a procedure call?
        -- Inside a trigger, we can just call our function.
        PERFORM public.capture_po_snapshot(NEW.id);
    END IF;

    -- Logic for incrementing amendment_number:
    -- If an 'approved' PO is moved to 'draft_amended', increment the count.
    IF (OLD.status = 'approved' AND NEW.status = 'draft_amended') THEN
        NEW.amendment_number := OLD.amendment_number + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_po_versioning ON public.asset_purchases;
CREATE TRIGGER tr_po_versioning
    BEFORE UPDATE OF status ON public.asset_purchases
    FOR EACH ROW EXECUTE FUNCTION public.handle_po_versioning();
