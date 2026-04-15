-- v088_asset_master_auditing.sql
-- Description: Implement a comprehensive Audit Trail for all ASM_CORE master configurations.

-------------------------------------------------------------------------------
-- 1. MASTER AUDIT LOG REGISTRY
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_master_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name          text NOT NULL, -- e.g. 'asset_types', 'asset_hsn_codes'
    record_id           uuid NOT NULL,
    action              text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data            jsonb,
    new_data            jsonb,
    changed_by          uuid REFERENCES auth.users(id),
    created_at          timestamptz DEFAULT now()
);

-- 2. DYNAMIC LOGGING FUNCTION
CREATE OR REPLACE FUNCTION public.log_master_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.asset_master_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.asset_master_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APPLY TRIGGERS TO ALL MASTERS
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

-------------------------------------------------------------------------------
-- 4. RLS POLICIES
-------------------------------------------------------------------------------

ALTER TABLE public.asset_master_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read master logs" ON public.asset_master_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
);
