-- remove_assets_and_optimize.sql
-- Description: Drops all asset-related database objects and adds missing performance indexes to the ticketing module.

-- 1. DETACH TICKETING FROM ASSETS
-- Remove the foreign key but keep the column data for historical reference in the backup
ALTER TABLE IF EXISTS public.tickets DROP CONSTRAINT IF EXISTS tickets_asset_id_fkey;

-- 2. DROP ASSET TABLES (Order of dependency)
DROP TABLE IF EXISTS public.asset_gate_pass_items CASCADE;
DROP TABLE IF EXISTS public.asset_gate_passes CASCADE;
DROP TABLE IF EXISTS public.asset_requisition_items CASCADE;
DROP TABLE IF EXISTS public.asset_requisitions CASCADE;
DROP TABLE IF EXISTS public.asset_stores CASCADE;
DROP TABLE IF EXISTS public.asset_deployment_amendments CASCADE;
DROP TABLE IF EXISTS public.asset_deployment_items CASCADE;
DROP TABLE IF EXISTS public.asset_deployments CASCADE;
DROP TABLE IF EXISTS public.asset_deployment_logs CASCADE;
DROP TABLE IF EXISTS public.asset_handover_items CASCADE;
DROP TABLE IF EXISTS public.asset_handovers CASCADE;
DROP TABLE IF EXISTS public.asset_handover_logs CASCADE;
DROP TABLE IF EXISTS public.asset_return_items CASCADE;
DROP TABLE IF EXISTS public.asset_returns CASCADE;
DROP TABLE IF EXISTS public.asset_return_logs CASCADE;
DROP TABLE IF EXISTS public.software_assignment_logs CASCADE;
DROP TABLE IF EXISTS public.software_license_logs CASCADE;
DROP TABLE IF EXISTS public.software_deployment_logs CASCADE;
DROP TABLE IF EXISTS public.software_deployment_items CASCADE;
DROP TABLE IF EXISTS public.software_deployments CASCADE;
DROP TABLE IF EXISTS public.asset_disposal_logs CASCADE;
DROP TABLE IF EXISTS public.asset_disposal_items CASCADE;
DROP TABLE IF EXISTS public.asset_disposals CASCADE;
DROP TABLE IF EXISTS public.asset_pm_schedules CASCADE;
DROP TABLE IF EXISTS public.asset_maintenance_sequences CASCADE;
DROP TABLE IF EXISTS public.asset_insurance CASCADE;
DROP TABLE IF EXISTS public.asset_modifications CASCADE;
DROP TABLE IF EXISTS public.asset_grn_items CASCADE;
DROP TABLE IF EXISTS public.asset_grns CASCADE;
DROP TABLE IF EXISTS public.asset_invoices CASCADE;
DROP TABLE IF EXISTS public.asset_purchase_items CASCADE;
DROP TABLE IF EXISTS public.asset_purchases CASCADE;
DROP TABLE IF EXISTS public.asset_purchase_sequences CASCADE;
DROP TABLE IF EXISTS public.asset_budgets CASCADE;
DROP TABLE IF EXISTS public.asset_suppliers CASCADE;
DROP TABLE IF EXISTS public.asset_types CASCADE;
DROP TABLE IF EXISTS public.asset_uom CASCADE;
DROP TABLE IF EXISTS public.asset_tax_groups CASCADE;
DROP TABLE IF EXISTS public.asset_taxes CASCADE;
DROP TABLE IF EXISTS public.asset_hsn_codes CASCADE;
DROP TABLE IF EXISTS public.asset_catalog CASCADE;
DROP TABLE IF EXISTS public.onboarding_asset_items CASCADE;
DROP TABLE IF EXISTS public.onboarding_asset_config CASCADE;
DROP TABLE IF EXISTS public.activity_task_definitions CASCADE;
DROP TABLE IF EXISTS public.activity_templates CASCADE;
DROP TABLE IF EXISTS public.asset_acknowledgements CASCADE;
DROP TABLE IF EXISTS public.asset_photos CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.asset_activity_logs CASCADE;
DROP TABLE IF EXISTS public.asset_master_logs CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.asset_sub_types CASCADE;

-- 3. DROP ASSET TYPES & ENUMS
DROP TYPE IF EXISTS public.asset_status CASCADE;
DROP TYPE IF EXISTS public.asset_condition CASCADE;
DROP TYPE IF EXISTS public.movement_type CASCADE;
DROP TYPE IF EXISTS public.movement_direction CASCADE;
DROP TYPE IF EXISTS public.return_reason CASCADE;

-- 4. TICKETING PERFORMANCE OPTIMIZATION (Missing Indexes)
-- These indexes help speed up common dashboard filters and list views
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_id ON public.tickets (requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to_id ON public.tickets (assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_is_confidential ON public.tickets (is_confidential);

-- ANALYZE to refresh statistics for the query planner
ANALYZE public.tickets;
ANALYZE public.profiles;
