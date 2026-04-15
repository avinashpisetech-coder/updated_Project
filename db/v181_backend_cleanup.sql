-- Performance & Cleanup: Pruning unused modules and syncing permission matrix
BEGIN;

-- 1. Remove defunct modules from registry
DELETE FROM public.modules 
WHERE slug IN ('requisitions', 'service-desk', 'erp-masters');

-- 2. Prune orphaned permissions
-- This removes permissions that are no longer referenced in the current unified interface
DELETE FROM public.permissions 
WHERE resource IN ('requisitions', 'service-desk', 'tickets');

-- 3. Cleanup redundant RPC references (Optional/Informational)
-- In a real environment, we would DROP FUNCTION if identified as legacy.
-- For now, focusing on data-driven cleanup.

COMMIT;
