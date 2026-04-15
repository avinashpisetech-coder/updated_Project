-- v077_restore_and_enhance_analytics.sql
-- Description: Restore comprehensive analytics fields and filter support for Intelligence Hub (v1) and Executive Dashboard (v2).
-- This version merges the feature set of v072 with the live monitoring of v076.

DROP FUNCTION IF EXISTS public.get_advanced_analytics(UUID);
DROP FUNCTION IF EXISTS public.get_advanced_analytics(UUID, JSONB);
DROP FUNCTION IF EXISTS public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_advanced_analytics(
    p_profile_id UUID,
    p_filters JSONB DEFAULT '{}'::jsonb,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_dept_id UUID;
    v_result JSONB;
    
    -- Filter extraction
    v_f_depts UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'dept_ids', '[]'::jsonb))::UUID);
    v_f_modules UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'module_ids', '[]'::jsonb))::UUID);
    v_f_categories UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'category_ids', '[]'::jsonb))::UUID);
    v_f_users UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'user_ids', '[]'::jsonb))::UUID);
    v_f_statuses TEXT[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'statuses', '[]'::jsonb)));
BEGIN
    -- Get user context
    SELECT role::text, department_id INTO v_role, v_dept_id 
    FROM public.profiles WHERE id = p_profile_id;

    -- 1. Scoped and Filtered Tickets CTE
    WITH filtered_tickets AS (
        SELECT t.*
        FROM public.tickets t
        LEFT JOIN public.profiles rp ON rp.id = t.requester_id
        WHERE (
            -- Role Scoping
            v_role = 'super_admin'
            OR (v_role = 'dept_admin' AND (
                t.requester_id IN (SELECT pr.id FROM public.profiles pr WHERE pr.department_id = v_dept_id)
                OR t.assigned_to_id IN (SELECT pr.id FROM public.profiles pr WHERE pr.department_id = v_dept_id)
                OR t.created_by_id IN (SELECT pr.id FROM public.profiles pr WHERE pr.department_id = v_dept_id)
            ))
            OR (v_role IN ('module_agent', 'end_user') AND (
                t.requester_id = p_profile_id 
                OR t.assigned_to_id = p_profile_id 
                OR t.created_by_id = p_profile_id
            ))
        )
        -- Temporal filtration
        AND (p_start_date IS NULL OR t.created_at >= p_start_date)
        AND (p_end_date IS NULL OR t.created_at <= p_end_date)
        -- Multi-selection filters (Applied ONLY if provided)
        AND (v_f_depts = '{}'::UUID[] OR rp.department_id = ANY(v_f_depts))
        AND (v_f_modules = '{}'::UUID[] OR t.module_id = ANY(v_f_modules))
        AND (v_f_categories = '{}'::UUID[] OR t.category_id = ANY(v_f_categories))
        AND (v_f_users = '{}'::UUID[] OR t.requester_id = ANY(v_f_users) OR t.assigned_to_id = ANY(v_f_users))
        AND (v_f_statuses = '{}'::TEXT[] OR LOWER(t.status::text) = ANY(ARRAY(SELECT LOWER(s) FROM unnest(v_f_statuses) s)))
    ),
    -- Aggregations
    status_master AS (
        SELECT unnest(ARRAY['new', 'assigned', 'in_progress', 'pending_user', 'pending_dept', 'pending_third_party', 'scheduled', 'escalated', 'resolved', 'closed', 'cancelled'])::text as status
    ),
    status_counts AS (
        SELECT 
            m.status,
            count(t.id) as status_count
        FROM status_master m
        LEFT JOIN filtered_tickets t ON m.status = t.status::text
        GROUP BY m.status
    ),
    status_aggregation AS (
        SELECT 
            status,
            status_count,
            sum(status_count) OVER() as grand_total
        FROM status_counts
    ),
    priority_aggregation AS (
        SELECT 
            priority::text,
            count(*) as priority_count
        FROM filtered_tickets
        GROUP BY priority
    ),
    category_distribution AS (
        SELECT jsonb_agg(jsonb_build_object(
            'name', COALESCE(c.name, 'Uncategorised'), 
            'count', s.count::int, -- for v1 Mini charts if needed
            'raised', s.raised::int,
            'resolved', s.resolved::int
        )) as data
        FROM (
            SELECT 
                category_id, 
                count(*) as count,
                count(*) as raised,
                count(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved
            FROM filtered_tickets 
            GROUP BY category_id
            ORDER BY raised DESC
            LIMIT 15
        ) s
        LEFT JOIN public.ticket_categories c ON c.id = s.category_id
    ),
    module_distribution AS (
        SELECT jsonb_agg(jsonb_build_object('name', m.name, 'count', s.count)) as data
        FROM (
            SELECT module_id, count(*) 
            FROM filtered_tickets 
            GROUP BY module_id
        ) s
        JOIN public.modules m ON m.id = s.module_id
    ),
    dept_distribution AS (
        SELECT jsonb_agg(jsonb_build_object(
            'name', d.name, 
            'raised', COALESCE(s.raised, 0),
            'resolved', COALESCE(s.resolved, 0),
            'active', COALESCE(s.active, 0)
        ) ORDER BY COALESCE(s.raised, 0) DESC) as data
        FROM public.departments d
        LEFT JOIN (
            SELECT 
                p.department_id, 
                count(*) as raised,
                count(*) FILTER (WHERE t.status IN ('resolved', 'closed')) as resolved,
                count(*) FILTER (WHERE t.status NOT IN ('resolved', 'closed', 'cancelled')) as active
            FROM filtered_tickets t
            JOIN public.profiles p ON p.id = t.requester_id
            GROUP BY p.department_id
        ) s ON s.department_id = d.id
    ),
    update_pulse AS (
        -- Datewise breakdown of last status updates
        SELECT jsonb_agg(jsonb_build_object('date', label, 'count', count)) as data
        FROM (
            SELECT 
                CASE 
                    WHEN updated_at > now() - interval '14 days' THEN date_trunc('day', updated_at)::text
                    ELSE 'Older'
                END as label,
                count(*) as count
            FROM filtered_tickets 
            GROUP BY 1
            ORDER BY label DESC
        ) s
    ),
    yearwise_performance AS (
        SELECT jsonb_agg(jsonb_build_object('year', yr, 'raised', raised, 'resolved', resolved)) as data
        FROM (
            SELECT 
                EXTRACT(YEAR FROM created_at)::text as yr,
                count(*) as raised,
                count(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved
            FROM filtered_tickets 
            GROUP BY 1 ORDER BY 1 ASC
        ) s
    ),
    monthwise_performance AS (
        SELECT jsonb_agg(jsonb_build_object('month', mo, 'raised', raised, 'resolved', resolved)) as data
        FROM (
            SELECT 
                date_trunc('month', created_at)::date as mo,
                count(*) as raised,
                count(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved
            FROM filtered_tickets 
            WHERE created_at > now() - interval '1 year'
            GROUP BY 1 ORDER BY 1 ASC
        ) s
    ),
    agent_intel AS (
        SELECT jsonb_agg(jsonb_build_object(
            'name', p.full_name,
            'raised', COALESCE(r.count, 0),
            'assigned', COALESCE(a.total, 0),
            'resolved', COALESCE(a.resolved, 0),
            'avg_rating', COALESCE(a.rating, 0),
            'status_breakdown', COALESCE(a.statuses, '{}'::jsonb)
        )) as data
        FROM public.profiles p
        LEFT JOIN (
            SELECT requester_id, count(*) as count FROM filtered_tickets GROUP BY requester_id
        ) r ON r.requester_id = p.id
        LEFT JOIN (
            SELECT 
                assigned_to_id, 
                sum(count) as total,
                sum(count) FILTER (WHERE status IN ('resolved', 'closed')) as resolved,
                round(avg(avg_rating), 1) as rating,
                jsonb_object_agg(status::text, count) as statuses
            FROM (
                SELECT 
                    assigned_to_id, 
                    status::text as status, 
                    count(*) as count,
                    avg(satisfaction_rating) as avg_rating
                FROM filtered_tickets 
                WHERE assigned_to_id IS NOT NULL 
                GROUP BY assigned_to_id, status
            ) i
            GROUP BY assigned_to_id
        ) a ON a.assigned_to_id = p.id
        WHERE 
            (v_role = 'super_admin') 
            OR (v_role = 'dept_admin' AND p.department_id = v_dept_id)
            OR (v_role IN ('module_agent', 'end_user') AND p.id = p_profile_id)
            OR (COALESCE(r.count, 0) > 0 OR COALESCE(a.total, 0) > 0)
    ),
    -- Live Metrics from v076
    scoped_profiles AS (
        SELECT pr.*
        FROM public.profiles pr
        WHERE v_role = 'super_admin'
           OR (v_role = 'dept_admin' AND pr.department_id = v_dept_id)
           OR (v_role IN ('module_agent', 'end_user') AND pr.id = p_profile_id)
    ),
    user_stats AS (
        SELECT 
            count(*) as total,
            count(*) FILTER (WHERE status = 'active') as active,
            count(*) FILTER (WHERE status != 'active') as inactive
        FROM scoped_profiles
    ),
    live_users_list AS (
        SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'full_name', full_name,
            'avatar_url', avatar_url,
            'role', role,
            'is_live', true
        )) as data
        FROM (
            SELECT id, full_name, avatar_url, role
            FROM scoped_profiles
            WHERE last_login_at > now() - interval '15 minutes'
            ORDER BY last_login_at DESC
            LIMIT 10
        ) lu
    )
    SELECT jsonb_build_object(
        'timestamp', now(),
        'scope', v_role,
        'total_tickets', COALESCE((SELECT max(grand_total) FROM status_aggregation), 0),
        'active_load', (SELECT count(*) FROM filtered_tickets WHERE status NOT IN ('resolved', 'closed', 'cancelled')),
        'active_load_perc', round(((SELECT count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled')) FROM filtered_tickets)::numeric / NULLIF((SELECT count(*) FROM filtered_tickets), 0) * 100), 1),
        'unassigned_count', (SELECT count(*) FROM filtered_tickets WHERE assigned_to_id IS NULL AND status = 'new'),
        'csat_score', (SELECT round(avg(satisfaction_rating) * 20, 1) FROM filtered_tickets WHERE satisfaction_rating IS NOT NULL),
        'csat_pending_count', (SELECT count(*) FILTER (WHERE satisfaction_rating IS NULL AND status IN ('resolved', 'closed')) FROM filtered_tickets),
        'status_distribution', COALESCE((SELECT jsonb_object_agg(status, status_count) FROM status_aggregation), '{}'::jsonb),
        'priority_distribution', COALESCE((SELECT jsonb_object_agg(priority, priority_count) FROM priority_aggregation), '{}'::jsonb),
        'category_distribution', COALESCE((SELECT data FROM category_distribution), '[]'::jsonb),
        'module_distribution', COALESCE((SELECT data FROM module_distribution), '[]'::jsonb),
        'department_distribution', COALESCE((SELECT data FROM dept_distribution), '[]'::jsonb),
        'update_distribution', COALESCE((SELECT data FROM update_pulse), '[]'::jsonb),
        'yearwise_performance', COALESCE((SELECT data FROM yearwise_performance), '[]'::jsonb),
        'monthwise_performance', COALESCE((SELECT data FROM monthwise_performance), '[]'::jsonb),
        'agent_intel', COALESCE((SELECT data FROM agent_intel), '[]'::jsonb),
        'user_stats', (SELECT jsonb_build_object('total', total, 'active', active, 'inactive', inactive) FROM user_stats),
        'live_users', COALESCE((SELECT data FROM live_users_list), '[]'::jsonb),
        'filter_options', jsonb_build_object(
            'departments', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.departments),
            'modules', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.modules),
            'categories', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.ticket_categories),
            'users', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', full_name)) FROM public.profiles),
            'statuses', ARRAY['new', 'assigned', 'in_progress', 'pending_user', 'pending_dept', 'pending_third_party', 'scheduled', 'escalated', 'resolved', 'closed', 'cancelled']
        ),
        'volume_trend', (
            SELECT jsonb_agg(jsonb_build_object('date', day, 'count', count))
            FROM (
                SELECT date_trunc('day', created_at)::date as day, count(*) 
                FROM filtered_tickets 
                WHERE created_at > now() - interval '30 days'
                GROUP BY 1 ORDER BY 1
            ) s
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
