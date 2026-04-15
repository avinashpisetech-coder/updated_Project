-- v072_fix_analytics_rpc_permissions.sql
-- Description: Restores missing analytical fields and execution permissions for get_advanced_analytics RPC.
-- This ensures the UI (DashboardClient) receives all expected signals and can actually call the function.

-- 0. Drop ALL legacy versions to prevent candidacy ambiguity
DROP FUNCTION IF EXISTS public.get_advanced_analytics(UUID);
DROP FUNCTION IF EXISTS public.get_advanced_analytics(UUID, JSONB);

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
    v_role public.user_role;
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
    SELECT role, department_id INTO v_role, v_dept_id 
    FROM public.profiles WHERE id = p_profile_id;

    -- 2. Build core result set using modular CTEs + multi-filter logic
    WITH filtered_tickets AS (
        SELECT t.*
        FROM public.tickets t
        LEFT JOIN public.profiles rp ON rp.id = t.requester_id
        WHERE (
            -- Role Isolation logic
            v_role = 'super_admin'
            OR (v_role = 'dept_admin' AND (
                t.requester_id IN (SELECT id FROM public.profiles WHERE department_id = v_dept_id)
                OR t.assigned_to_id IN (SELECT id FROM public.profiles WHERE department_id = v_dept_id)
            ))
            OR (v_role = 'module_agent' AND t.module_id IN (
                SELECT module_id FROM public.profile_module_access 
                WHERE profile_id = p_profile_id AND can_view = true
            ))
            OR (v_role = 'end_user' AND (t.requester_id = p_profile_id OR t.created_by_id = p_profile_id))
        )
        -- Temporal filtration
        AND (p_start_date IS NULL OR t.created_at >= p_start_date)
        AND (p_end_date IS NULL OR t.created_at <= p_end_date)
        -- Multi-selection filters (Applied ONLY if provided)
        AND (v_f_depts = '{}'::UUID[] OR rp.department_id = ANY(v_f_depts))
        AND (v_f_modules = '{}'::UUID[] OR t.module_id = ANY(v_f_modules))
        AND (v_f_categories = '{}'::UUID[] OR t.category_id = ANY(v_f_categories))
        AND (v_f_users = '{}'::UUID[] OR t.requester_id = ANY(v_f_users) OR t.assigned_to_id = ANY(v_f_users))
        AND (v_f_statuses = '{}'::TEXT[] OR LOWER(t.status::text) = ANY(v_f_statuses))
    ),
    csat_calculation AS (
        SELECT 
            round(avg(satisfaction_rating) * 20, 1) as score,
            count(*) FILTER (WHERE satisfaction_rating IS NULL AND LOWER(status::text) IN ('resolved', 'closed')) as pending_count,
            round(
                (count(*) FILTER (WHERE satisfaction_rating IS NULL AND LOWER(status::text) IN ('resolved', 'closed')))::numeric / 
                NULLIF(count(*) FILTER (WHERE LOWER(status::text) IN ('resolved', 'closed')), 0) * 100,
                1
            ) as pending_perc
        FROM filtered_tickets 
        WHERE LOWER(status::text) IN ('resolved', 'closed')
    ),
    speed_metrics AS (
        SELECT 
            avg(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)::int as avg_resp_min,
            avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::int as avg_res_hours
        FROM filtered_tickets
        WHERE first_response_at IS NOT NULL OR resolved_at IS NOT NULL
    ),
    channel_parity AS (
        SELECT jsonb_object_agg(origin, count) as data
        FROM (SELECT origin, count(*) FROM filtered_tickets GROUP BY origin) s
    ),
    module_distribution AS (
        -- This is the "scopewise" distribution requested
        SELECT jsonb_agg(jsonb_build_object('name', m.name, 'count', s.count)) as data
        FROM (
            SELECT module_id, count(*) 
            FROM filtered_tickets 
            GROUP BY module_id
        ) s
        JOIN public.modules m ON m.id = s.module_id
    ),
    priority_counts AS (
        SELECT jsonb_object_agg(priority, count) as data
        FROM (SELECT priority, count(*) FROM filtered_tickets GROUP BY priority) s
    ),
    status_counts AS (
        SELECT jsonb_object_agg(status, count) as data
        FROM (SELECT status, count(*) FROM filtered_tickets GROUP BY status) s
    ),
    update_pulse AS (
        -- Datewise breakdown of last status updates (full parity)
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
        -- Yearwise raised vs resolved
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
        -- Monthwise raised vs resolved
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
    category_counts AS (
        SELECT jsonb_agg(jsonb_build_object('name', c.name, 'count', s.count)) as data
        FROM (
            SELECT category_id, count(*) 
            FROM filtered_tickets 
            GROUP BY category_id
            ORDER BY count(*) DESC
        ) s
        JOIN public.ticket_categories c ON c.id = s.category_id
    ),
    dept_performance AS (
        -- Department wise comparison: ALL departments even with 0 tickets (SORTED)
        SELECT jsonb_agg(jsonb_build_object(
            'name', i.name, 
            'raised', i.raised,
            'resolved', i.resolved,
            'active', i.active
        )) as data
        FROM (
            SELECT 
                d.name, 
                COALESCE(s.raised, 0) as raised,
                COALESCE(s.resolved, 0) as resolved,
                COALESCE(s.active, 0) as active
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
            ORDER BY raised DESC
        ) i
    ),
    agent_intel AS (
        -- Service Performance Registry: Scope-based profile performance (Raised vs Resolved)
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
                count(*) as total,
                count(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved,
                round(avg(satisfaction_rating), 1) as rating,
                jsonb_object_agg(status, count) as statuses
            FROM (
                SELECT assigned_to_id, status, satisfaction_rating, count(*) OVER(PARTITION BY assigned_to_id, status) as count
                FROM filtered_tickets 
                WHERE assigned_to_id IS NOT NULL 
            ) i
            GROUP BY assigned_to_id
        ) a ON a.assigned_to_id = p.id
        WHERE 
            -- Correctly scope users in the performance registry
            (v_role = 'super_admin') -- Show all for admin
            OR (v_role = 'dept_admin' AND p.department_id = v_dept_id) -- Show department users for dept_admin
            OR (v_role = 'end_user' AND p.id = p_profile_id) -- Show self (and handled tickets performance) for end user
            OR (r.count > 0 OR a.total > 0)
    ),
    sla_stats AS (
        SELECT jsonb_build_object(
            'on_track', count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled') AND (sla_due_date IS NULL OR sla_due_date > now())),
            'near_breach', count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled') AND sla_due_date <= now() + interval '4 hours' AND sla_due_date > now()),
            'breached', count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled') AND sla_due_date <= now())
        ) as data
        FROM filtered_tickets
    )
    SELECT jsonb_build_object(
        'timestamp', now(),
        'scope', v_role,
        'total_tickets', (SELECT count(*) FROM filtered_tickets),
        'active_load', (SELECT count(*) FROM filtered_tickets WHERE LOWER(status::text) NOT IN ('resolved', 'closed', 'cancelled')),
        'active_load_perc', round(((SELECT count(*) FILTER (WHERE LOWER(status::text) NOT IN ('resolved', 'closed', 'cancelled')) FROM filtered_tickets)::numeric / NULLIF((SELECT count(*) FROM filtered_tickets), 0) * 100), 1),
        'unassigned_count', (SELECT count(*) FROM filtered_tickets WHERE assigned_to_id IS NULL AND status = 'new'),
        'csat_score', COALESCE((SELECT score FROM csat_calculation), 0),
        'csat_pending_count', COALESCE((SELECT pending_count FROM csat_calculation), 0),
        'csat_pending_perc', COALESCE((SELECT pending_perc FROM csat_calculation), 0),
        'avg_response_min', COALESCE((SELECT avg_resp_min FROM speed_metrics), 0),
        'avg_resolution_hours', COALESCE((SELECT avg_res_hours FROM speed_metrics), 0),
        'module_distribution', COALESCE((SELECT data FROM module_distribution), '[]'::jsonb),
        'channel_distribution', COALESCE((SELECT data FROM channel_parity), '{}'::jsonb),
        'priority_distribution', COALESCE((SELECT data FROM priority_counts), '{}'::jsonb),
        'status_distribution', COALESCE((SELECT data FROM status_counts), '{}'::jsonb),
        'update_distribution', COALESCE((SELECT data FROM update_pulse), '[]'::jsonb),
        'category_distribution', COALESCE((SELECT data FROM category_counts), '[]'::jsonb),
        'department_distribution', COALESCE((SELECT data FROM dept_performance), '[]'::jsonb),
        'filter_options', jsonb_build_object(
            'departments', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.departments),
            'modules', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.modules),
            'categories', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.ticket_categories),
            'users', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', full_name)) FROM public.profiles),
            'statuses', (SELECT jsonb_agg(DISTINCT LOWER(status::text)) FROM public.tickets)
        ),
        'yearwise_performance', COALESCE((SELECT data FROM yearwise_performance), '[]'::jsonb),
        'monthwise_performance', COALESCE((SELECT data FROM monthwise_performance), '[]'::jsonb),
        'agent_intel', COALESCE((SELECT data FROM agent_intel), '[]'::jsonb),
        'raised_vs_solved', jsonb_build_object(
            'raised', (SELECT count(*) FROM filtered_tickets),
            'solved', (SELECT count(*) FROM filtered_tickets WHERE status IN ('resolved', 'closed'))
        ),
        'sla_stats', (SELECT data FROM sla_stats),
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

-- Critical: Regrant execute permissions lost during DROP/CREATE
-- Use the specific 4-parameter signature with defaults included
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
