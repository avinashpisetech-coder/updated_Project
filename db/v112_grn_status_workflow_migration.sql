-- v112_grn_status_workflow_migration.sql
-- Description: Expand the allowed status values for GRNs to support the Receive -> Approve workflow.

DO $$
BEGIN
    -- 1. Drop the legacy check constraint if it exists
    ALTER TABLE IF EXISTS public.asset_grns DROP CONSTRAINT IF EXISTS asset_grns_status_check;

    -- 2. Add the expanded workflow constraint
    ALTER TABLE public.asset_grns ADD CONSTRAINT asset_grns_status_check 
        CHECK (status IN ('pending', 'received', 'approved', 'cancelled'));

    -- 3. Migration: Update any 'completed' records to 'approved' for consistency with v111+
    UPDATE public.asset_grns SET status = 'approved' WHERE status = 'completed';

END $$;
