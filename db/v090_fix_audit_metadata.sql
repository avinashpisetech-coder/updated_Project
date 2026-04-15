-- v090_fix_audit_metadata.sql
-- Description: Ensure the Audit Ledger is correctly populated and visible to IT Administrators.

-- 1. Standardize Audit Identifier 
ALTER TABLE public.asset_master_logs 
RENAME COLUMN changed_by TO user_id;

-- 2. Standardize Role Registry for granular Audit Ledger access
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agent';

-- 3. Update the Logging Engine to use the new identity column
CREATE OR REPLACE FUNCTION public.log_master_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.asset_master_logs (table_name, record_id, action, old_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.asset_master_logs (table_name, record_id, action, old_data, new_data, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Broaden Permissions
GRANT ALL ON public.asset_master_logs TO authenticated;
GRANT ALL ON public.asset_master_logs TO service_role;

-- 5. Standardize RLS with defensive type casting for the identity matrix
DROP POLICY IF EXISTS "IT Ledger Access" ON public.asset_master_logs;
CREATE POLICY "IT Ledger Access" ON public.asset_master_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin', 'admin', 'agent'))
);
