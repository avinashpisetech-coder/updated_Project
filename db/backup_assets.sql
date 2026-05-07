-- backup_assets.sql
-- Run this script to export all asset-related data before removal.
-- NOTE: If using Supabase dashboard, you can also export each table to CSV manually.
-- If using psql, you can run: \copy (SELECT * FROM table_name) TO 'table_name.csv' WITH CSV HEADER;

/*
-- MASTER DATA & CONFIG
-- \copy (SELECT * FROM public.asset_sub_types) TO 'asset_sub_types.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_types) TO 'asset_types.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_uom) TO 'asset_uom.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_tax_groups) TO 'asset_tax_groups.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_taxes) TO 'asset_taxes.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_hsn_codes) TO 'asset_hsn_codes.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_catalog) TO 'asset_catalog.csv' WITH CSV HEADER;

-- CORE ASSETS
-- \copy (SELECT * FROM public.assets) TO 'assets.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_photos) TO 'asset_photos.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_activity_logs) TO 'asset_activity_logs.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_master_logs) TO 'asset_master_logs.csv' WITH CSV HEADER;

-- STOCK & MOVEMENTS
-- \copy (SELECT * FROM public.stock_movements) TO 'stock_movements.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_handovers) TO 'asset_handovers.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_handover_items) TO 'asset_handover_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_handover_logs) TO 'asset_handover_logs.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_deployments) TO 'asset_deployments.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_deployment_items) TO 'asset_deployment_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_deployment_logs) TO 'asset_deployment_logs.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_deployment_amendments) TO 'asset_deployment_amendments.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_returns) TO 'asset_returns.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_return_items) TO 'asset_return_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_return_logs) TO 'asset_return_logs.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_acknowledgements) TO 'asset_acknowledgements.csv' WITH CSV HEADER;

-- PROCUREMENT & GRN
-- \copy (SELECT * FROM public.asset_suppliers) TO 'asset_suppliers.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_purchases) TO 'asset_purchases.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_purchase_items) TO 'asset_purchase_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_purchase_sequences) TO 'asset_purchase_sequences.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_grns) TO 'asset_grns.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_grn_items) TO 'asset_grn_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_invoices) TO 'asset_invoices.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_budgets) TO 'asset_budgets.csv' WITH CSV HEADER;

-- STORES & REQUISITIONS
-- \copy (SELECT * FROM public.asset_stores) TO 'asset_stores.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_requisitions) TO 'asset_requisitions.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_requisition_items) TO 'asset_requisition_items.csv' WITH CSV HEADER;

-- GATE PASS
-- \copy (SELECT * FROM public.asset_gate_passes) TO 'asset_gate_passes.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_gate_pass_items) TO 'asset_gate_pass_items.csv' WITH CSV HEADER;

-- MAINTENANCE & INSURANCE
-- \copy (SELECT * FROM public.asset_pm_schedules) TO 'asset_pm_schedules.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_maintenance_sequences) TO 'asset_maintenance_sequences.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_insurance) TO 'asset_insurance.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_modifications) TO 'asset_modifications.csv' WITH CSV HEADER;

-- DISPOSAL
-- \copy (SELECT * FROM public.asset_disposals) TO 'asset_disposals.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_disposal_items) TO 'asset_disposal_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.asset_disposal_logs) TO 'asset_disposal_logs.csv' WITH CSV HEADER;

-- ONBOARDING & ACTIVITY
-- \copy (SELECT * FROM public.onboarding_asset_config) TO 'onboarding_asset_config.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.onboarding_asset_items) TO 'onboarding_asset_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.activity_templates) TO 'activity_templates.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.activity_task_definitions) TO 'activity_task_definitions.csv' WITH CSV HEADER;

-- SOFTWARE SAM
-- \copy (SELECT * FROM public.software_deployments) TO 'software_deployments.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.software_deployment_items) TO 'software_deployment_items.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.software_deployment_logs) TO 'software_deployment_logs.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.software_license_logs) TO 'software_license_logs.csv' WITH CSV HEADER;
-- \copy (SELECT * FROM public.software_assignment_logs) TO 'software_assignment_logs.csv' WITH CSV HEADER;
*/
