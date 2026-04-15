-- v074_add_category_distribution_to_analytics.sql
-- Description: Expand get_advanced_analytics RPC to include category-wise raised vs resolved metrics.

CREATE OR REPLACE FUNCTION public.get_advanced_analytics(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_dept_id UUID;
    v_result JSONB;
BEGIN
    -- Get user context
    SELECT role, department_id INTO v_role, v_dept_id 
    FROM public.profiles WHERE id = p_profile_id;

    -- Build core result set using modular CTEs
    WITH filtered_tickets AS (
        SELECT t.*
        FROM public.tickets t
        WHERE v_role = 'super_admin'
           OR (v_role = 'dept_admin' AND (
                t.requester_id IN (SELECT id FROM public.profiles WHERE department_id = v_dept_id)
                OR t.assigned_to_id IN (SELECT id FROM public.profiles WHERE department_id = v_dept_id)
            ))
           OR (v_role = 'module_agent' AND t.module_id IN (
                SELECT module_id FROM public.profile_module_access 
                WHERE profile_id = p_profile_id AND can_view = true
            ))
           OR (v_role = 'end_user' AND (t.requester_id = p_profile_id OR t.created_by_id = p_profile_id))
    ),
    csat_calculation AS (
        SELECT round(avg(satisfaction_rating) * 20, 1) as score -- Normalize to 100%
        FROM filtered_tickets 
        WHERE satisfaction_rating IS NOT NULL
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
    priority_counts AS (
        SELECT jsonb_object_agg(priority, count) as data
        FROM (SELECT priority, count(*) FROM filtered_tickets GROUP BY priority) s
    ),
    status_counts AS (
        SELECT jsonb_object_agg(status, count) as data
        FROM (SELECT status, count(*) FROM filtered_tickets GROUP BY status) s
    ),
    category_distribution AS (
        SELECT jsonb_agg(jsonb_build_object(
            'name', COALESCE(c.name, 'Uncategorised Signals'), 
            'raised', s.raised::int,
            'resolved', s.resolved::int
        )) as data
        FROM (
            SELECT 
                category_id, 
                count(*) as raised,
                count(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved
            FROM filtered_tickets 
            GROUP BY category_id
            ORDER BY raised DESC
            LIMIT 10
        ) s
        LEFT JOIN public.ticket_categories c ON c.id = s.category_id
    ),
    department_distribution AS (
        SELECT jsonb_agg(jsonb_build_object('name', d.name, 'count', s.count)) as data
        FROM (
            SELECT p.department_id, count(*) 
            FROM filtered_tickets t
            JOIN public.profiles p ON p.id = t.requester_id
            GROUP BY p.department_id
        ) s
        JOIN public.departments d ON d.id = s.department_id
    ),
    agent_intel AS (
        SELECT jsonb_agg(jsonb_build_object(
            'name', p.full_name,
            'total_assigned', s.total,
            'avg_rating', s.rating,
            'status_breakdown', s.statuses
        )) as data
        FROM (
            SELECT 
                assigned_to_id, 
                count(*) as total,
                round(avg(satisfaction_rating), 1) as rating,
                jsonb_object_agg(status, count) as statuses
            FROM (
                SELECT assigned_to_id, status, satisfaction_rating, count(*) OVER(PARTITION BY assigned_to_id, status) as count
                FROM filtered_tickets 
                WHERE assigned_to_id IS NOT NULL 
            ) i
            GROUP BY assigned_to_id
        ) s
        JOIN public.profiles p ON p.id = s.assigned_to_id
    )
    SELECT jsonb_build_object(
        'timestamp', now(),
        'scope', v_role,
        'total_tickets', (SELECT count(*) FROM filtered_tickets),
        'active_load', (SELECT count(*) FROM filtered_tickets WHERE status NOT IN ('resolved', 'closed', 'cancelled')),
        'unassigned_count', (SELECT count(*) FROM filtered_tickets WHERE assigned_to_id IS NULL AND status = 'new'),
        'csat_score', COALESCE((SELECT score FROM csat_calculation), 0),
        'avg_response_min', COALESCE((SELECT avg_resp_min FROM speed_metrics), 0),
        'avg_resolution_hours', COALESCE((SELECT avg_res_hours FROM speed_metrics), 0),
        'channel_distribution', COALESCE((SELECT data FROM channel_parity), '{}'::jsonb),
        'priority_distribution', COALESCE((SELECT data FROM priority_counts), '{}'::jsonb),
        'status_distribution', COALESCE((SELECT data FROM status_counts), '{}'::jsonb),
        'category_distribution', COALESCE((SELECT data FROM category_distribution), '[]'::jsonb),
        'department_distribution', COALESCE((SELECT data FROM department_distribution), '[]'::jsonb),
        'agent_intel', COALESCE((SELECT data FROM agent_intel), '[]'::jsonb),
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
