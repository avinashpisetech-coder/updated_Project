-- v092_populate_audit_baseline.sql
-- Description: Baselines the entire ASM_CORE Master Hub by populating the Audit Ledger with all existing configuration data.

-- 1. Identity Baseline Protocol
-- We will use NULL for the initial population to clearly distinguish historical data and avoid FK violations.
DO $$ 
BEGIN
    -- A. TYPES BASELINE
    INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id, created_at)
    SELECT 'asset_types', id, 'INSERT', to_jsonb(t), NULL, created_at
    FROM public.asset_types t
    ON CONFLICT DO NOTHING;

    -- B. SUB-TYPES BASELINE
    INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id, created_at)
    SELECT 'asset_sub_types', id, 'INSERT', to_jsonb(st), NULL, created_at
    FROM public.asset_sub_types st
    ON CONFLICT DO NOTHING;

    -- C. TAX CLUSTER BASELINE
    INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id, created_at)
    SELECT 'asset_tax_groups', id, 'INSERT', to_jsonb(tg), NULL, created_at
    FROM public.asset_tax_groups tg
    ON CONFLICT DO NOTHING;

    -- D. HSN CODIFICATION BASELINE
    INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id, created_at)
    SELECT 'asset_hsn_codes', id, 'INSERT', to_jsonb(h), NULL, created_at
    FROM public.asset_hsn_codes h
    ON CONFLICT DO NOTHING;

    -- E. ASSET CATALOG BASELINE
    INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id, created_at)
    SELECT 'asset_catalog', id, 'INSERT', to_jsonb(ac), NULL, created_at
    FROM public.asset_catalog ac
    ON CONFLICT DO NOTHING;

    -- F. UOM INDEX BASELINE
    INSERT INTO public.asset_master_logs (table_name, record_id, action, new_data, user_id, created_at)
    SELECT 'asset_uom', id, 'INSERT', to_jsonb(u), NULL, created_at
    FROM public.asset_uom u
    ON CONFLICT DO NOTHING;

END $$;
