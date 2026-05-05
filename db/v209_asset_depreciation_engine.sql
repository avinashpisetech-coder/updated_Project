-- v209_asset_depreciation_engine.sql
-- Description: Implement Postgres logic for real-time asset depreciation calculation.

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_asset_valuation(p_asset_id uuid)
RETURNS TABLE (
    original_cost numeric,
    current_value numeric,
    accumulated_depreciation numeric,
    months_elapsed int,
    is_fully_depreciated boolean
) 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_cost numeric;
    v_method public.depreciation_method;
    v_rate numeric; -- Annual rate (e.g., 20.00 for 20%)
    v_salvage numeric;
    v_purchase_date date;
    v_months int;
    v_years_elapsed numeric;
    v_depreciation numeric := 0;
    v_current numeric;
BEGIN
    SELECT 
        COALESCE(purchase_cost, 0), 
        COALESCE(depreciation_method, 'straight_line'),
        COALESCE(depreciation_rate, 0),
        COALESCE(salvage_value, 0),
        COALESCE(invoice_date, created_at::date)
    INTO v_cost, v_method, v_rate, v_salvage, v_purchase_date
    FROM public.assets
    WHERE id = p_asset_id;

    v_months := EXTRACT(YEAR FROM age(now(), v_purchase_date)) * 12 + EXTRACT(MONTH FROM age(now(), v_purchase_date));
    v_years_elapsed := v_months::numeric / 12.0;

    IF v_cost = 0 OR v_rate = 0 OR v_method = 'none' THEN
        RETURN QUERY SELECT v_cost, v_cost, 0::numeric, v_months, false;
        RETURN;
    END IF;

    IF v_method = 'straight_line' THEN
        -- SLM: (Cost - Salvage) * (Rate/100) * Years
        v_depreciation := (v_cost - v_salvage) * (v_rate / 100.0) * v_years_elapsed;
    ELSIF v_method = 'declining_balance' THEN
        -- WDV: Cost * (1 - Rate/100)^Years
        v_current := v_cost * power((1.0 - (v_rate / 100.0)), v_years_elapsed);
        v_depreciation := v_cost - v_current;
    END IF;

    -- Cap depreciation at Cost - Salvage
    IF v_depreciation > (v_cost - v_salvage) THEN
        v_depreciation := v_cost - v_salvage;
    END IF;

    v_current := v_cost - v_depreciation;

    RETURN QUERY SELECT 
        v_cost, 
        round(v_current, 2), 
        round(v_depreciation, 2), 
        v_months, 
        v_current <= v_salvage;
END;
$$;

COMMIT;
