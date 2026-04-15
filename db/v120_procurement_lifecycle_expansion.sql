-- v120_procurement_lifecycle_expansion.sql
-- Description: Expand the Status Check Constraint to support Drafts and Amendments.

BEGIN;

-- 1. Remove legacy constraint
ALTER TABLE public.asset_purchases DROP CONSTRAINT IF EXISTS asset_purchases_status_check;

-- 2. Deploy COMPREHENSIVE lifecycle check
ALTER TABLE public.asset_purchases ADD CONSTRAINT asset_purchases_status_check 
    CHECK (status IN (
        'draft', 
        'submitted', 
        'pending', 
        'approved', 
        'received', 
        'cancelled', 
        'draft_amended', 
        'pending_amendment'
    ));

-- 3. Default missing statuses to 'draft' or 'pending' if needed
UPDATE public.asset_purchases SET status = 'pending' WHERE status IS NULL;

COMMIT;
