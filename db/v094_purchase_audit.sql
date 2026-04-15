-- v094_purchase_audit.sql
-- Description: Implement a comprehensive Audit Trail for all procurement transactions (Purchases & Items).

-- 1. Extend Audit Ledger Access for Purchases
DO $$
DECLARE
    t text;
    procurement_tables text[] := ARRAY['asset_purchases', 'asset_purchase_items'];
BEGIN
    FOREACH t IN ARRAY procurement_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_log_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_log_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_master_change()', t, t);
    END LOOP;
END;
$$;

-- 2. Refine the RLS Policy for broadened audit visibility
DROP POLICY IF EXISTS "IT Ledger Access" ON public.asset_master_logs;
CREATE POLICY "IT Ledger Access" ON public.asset_master_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'admin', 'agent'))
);
