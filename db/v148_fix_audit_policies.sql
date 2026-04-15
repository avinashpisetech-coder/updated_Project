-- v148_fix_audit_policies.sql
-- Description: Fix missing RLS policies for Asset Return Logs to ensure the chronology is recorded correctly.

BEGIN;

-- 1. Asset Return Logs Policies
DROP POLICY IF EXISTS "Anyone can insert return logs" ON public.asset_return_logs;
CREATE POLICY "Anyone can insert return logs" ON public.asset_return_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Ensure handover logs also have it (Safety double-check)
DROP POLICY IF EXISTS "Anyone can insert handover logs" ON public.asset_handover_logs;
CREATE POLICY "Anyone can insert handover logs" ON public.asset_handover_logs
    FOR INSERT TO authenticated WITH CHECK (true);

COMMIT;
