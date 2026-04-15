-- v143_cleanup_deployments.sql
-- Description: Delete all deployment transactions and reset the deployment number sequence.
-- This is a one-time cleanup script as requested by the user.

BEGIN;

-- 1. Delete all deployment items first (due to FK constraints, though ON DELETE CASCADE is present)
-- We'll just delete from the master table and let CASCADE handle it, 
-- but explicitly deleting children can be safer in some environments.
DELETE FROM public.asset_deployment_amendments;
DELETE FROM public.asset_deployment_items;
DELETE FROM public.asset_deployments;

-- 2. Reset the sequence for deployment numbers
ALTER SEQUENCE public.asset_deployment_number_seq RESTART WITH 1;

COMMIT;

-- Verification
SELECT 'Deployment Master Count' as table_name, count(*) FROM public.asset_deployments
UNION ALL
SELECT 'Deployment Items Count', count(*) FROM public.asset_deployment_items
UNION ALL
SELECT 'Deployment Amendments Count', count(*) FROM public.asset_deployment_amendments;
