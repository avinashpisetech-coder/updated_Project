-- v106_procurement_registry_reset.sql
-- Description: NUCLEAR RESET of all Procurement Transactional Registries (POs, GRNs, Invoices, Logs).
-- This script PRESERVES Master configurations (Suppliers, Asset Types, Budgets) but clears all transactions.

DO $$
BEGIN
    RAISE NOTICE 'Starting Nuclear Reset of Procurement Registries...';

    -- 1. Clear Activity Logs (Procurement Audit Trail)
    TRUNCATE public.asset_activity_logs CASCADE;

    -- 2. Clear Goods Receipt Notes (Cascade handles line items)
    TRUNCATE public.asset_grns CASCADE;

    -- 3. Clear Invoices
    TRUNCATE public.asset_invoices CASCADE;

    -- 4. Clear Asset Records linked to Purchases (Inventory Hydration)
    DELETE FROM public.assets WHERE purchase_id IS NOT NULL;

    -- 5. Clear Purchase Orders (Cascade handles line items)
    TRUNCATE public.asset_purchases CASCADE;

    -- 6. Reset Sequential Numbering (If any manual overrides need to be cleared)
    -- We'll let the existing sequential logic handle it for NEW entries.

    RAISE NOTICE 'Reset finalized. All Procurement transactional data has been purged. System ready for scenario recreation.';
END $$;
