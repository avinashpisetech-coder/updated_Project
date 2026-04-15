-- v144_audit_deployments.sql
-- Description: Enable high-fidelity auditing for Deployment Header and Line Items.

BEGIN;

-- 1. Apply Audit Trigger to Deployment Master
DROP TRIGGER IF EXISTS tr_log_asset_deployments ON public.asset_deployments;
CREATE TRIGGER tr_log_asset_deployments
    AFTER INSERT OR UPDATE OR DELETE ON public.asset_deployments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_master_change();

-- 2. Apply Audit Trigger to Deployment Items
DROP TRIGGER IF EXISTS tr_log_asset_deployment_items ON public.asset_deployment_items;
CREATE TRIGGER tr_log_asset_deployment_items
    AFTER INSERT OR UPDATE OR DELETE ON public.asset_deployment_items
    FOR EACH ROW
    EXECUTE FUNCTION public.log_master_change();

-- 3. Proactively push initial 'PROTOCOL_BOOTSTRAP' logs for existing records (if any)
-- This ensures the audit trail isn't empty for current transactions.
INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, changed_by)
SELECT 
    'asset_deployments', 
    id, 
    'INSERT', 
    to_jsonb(d), 
    auth.uid()
FROM public.asset_deployments d
ON CONFLICT DO NOTHING;

COMMIT;
