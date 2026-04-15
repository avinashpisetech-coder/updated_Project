-- v079_asset_analytics_rpcs.sql
-- Analytical and status helper functions for the Asset Management module

-- 1. Asset Summary Stats
CREATE OR REPLACE FUNCTION public.get_asset_summary_stats()
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'available', COUNT(*) FILTER (WHERE status = 'in_stock'),
        'assigned', COUNT(*) FILTER (WHERE status = 'assigned'),
        'repair', COUNT(*) FILTER (WHERE status = 'under_repair'),
        'damaged', COUNT(*) FILTER (WHERE status IN ('damaged', 'written_off'))
    ) INTO result
    FROM public.assets;
    
    RETURN COALESCE(result, '{ "total": 0, "available": 0, "assigned": 0, "repair": 0, "damaged": 0 }'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 2. Low Stock Alerts
-- Aligned to §7.3 of PRD: "alert fires when Available falls below threshold"
CREATE OR REPLACE FUNCTION public.get_low_stock_alerts()
RETURNS TABLE (
    sub_type_name text,
    threshold int,
    current_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.name as sub_type_name,
        st.low_stock_threshold as threshold,
        COUNT(a.id) FILTER (WHERE a.status = 'in_stock') as current_count
    FROM public.asset_sub_types st
    LEFT JOIN public.assets a ON a.sub_type_id = st.id
    WHERE st.is_active = true
    GROUP BY st.id, st.name, st.low_stock_threshold
    HAVING COUNT(a.id) FILTER (WHERE a.status = 'in_stock') <= st.low_stock_threshold;
END;
$$ LANGUAGE plpgsql;
