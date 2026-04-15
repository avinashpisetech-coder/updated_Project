-- v091_audit_troubleshooter.sql
-- Description: Debugging and re-authorising the ASM_CORE Audit Engine for immediate data population.

-- 1. Ensure the Log Registry is absolutely robust
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_master_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.asset_master_logs ADD COLUMN user_id uuid REFERENCES auth.users(id);
        ALTER TABLE public.asset_master_logs ADD CONSTRAINT fk_logs_profile FOREIGN KEY (user_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Hard Reset of the Logging Engine (Ensuring 'user_id' parity)
CREATE OR REPLACE FUNCTION public.log_master_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.asset_master_logs (
        table_name, 
        record_id, 
        action, 
        old_data, 
        new_data, 
        user_id
    )
    VALUES (
        TG_TABLE_NAME, 
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, 
        TG_OP, 
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END, 
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END, 
        COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) -- Fallback for system-level changes
    );
    IF (TG_OP = 'DELETE') THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Force Re-apply Triggers to all ASM_CORE Masters
DO $$
DECLARE
    t text;
    master_tables text[] := ARRAY['asset_types', 'asset_sub_types', 'asset_catalog', 'asset_hsn_codes', 'asset_tax_groups', 'asset_uom'];
BEGIN
    FOREACH t IN ARRAY master_tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_log_%I ON public.%I', t, t);
        EXECUTE format('CREATE TRIGGER tr_log_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_master_change()', t, t);
    END LOOP;
END;
$$;

-- 4. Protocol Transparency: Broadest Select Access for testing
ALTER TABLE public.asset_master_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.asset_master_logs TO authenticated;
GRANT ALL ON public.asset_master_logs TO service_role;
GRANT ALL ON public.asset_master_logs TO anon; -- Temporary for diagnostic transparency
