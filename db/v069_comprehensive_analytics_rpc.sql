-- v069_comprehensive_analytics_rpc.sql
-- Description: Advanced analytics RPC with role-based scope filtering.
-- This provides a unified data source for the Reports & Intelligence Dashboard.

DROP FUNCTION IF EXISTS public.get_advanced_analytics(p_profile_id UUID);

CREATE OR REPLACE FUNCTION public.get_advanced_analytics(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Essential for role-based system-wide calculations
SET search_path = public
AS $$
DECLARE
    v_role public.user_role;
    v_dept_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Get user context securely
    SELECT role, department_id INTO v_role, v_dept_id 
    FROM public.profiles WHERE id = p_profile_id;

    -- 2. Build the result set using CTEs for modular aggregation
    WITH filtered_tickets AS (
        SELECT t.*
        FROM public.tickets t
        WHERE 
            -- ROLE-BASED ISOLATION LOGIC
            -- Super Admin: Global visibility across all modules and departments
            v_role = 'super_admin'
            
            -- Dept Admin: Visibility into tickets where requester OR assigned agent belongs to their department
            OR (v_role = 'dept_admin' AND (
                t.requester_id IN (SELECT id FROM public.profiles WHERE department_id = v_dept_id)
                OR t.assigned_to_id IN (SELECT id FROM public.profiles WHERE department_id = v_dept_id)
            ))
            
            -- Module Agent: Visibility limited to modules they are explicitly granted access to
            OR (v_role = 'module_agent' AND t.module_id IN (
                SELECT module_id FROM public.profile_module_access 
                WHERE profile_id = p_profile_id AND can_view = true
            ))
            
            -- End User: Strict isolation to their own tickets only
            OR (v_role = 'end_user' AND (
                t.requester_id = p_profile_id 
                OR t.created_by_id = p_profile_id 
                OR t.affected_person_id = p_profile_id
                OR t.assigned_to_id = p_profile_id
            ))
    ),
    priority_counts AS (
        -- Group by priority enum
        SELECT jsonb_object_agg(priority, count) as data
        FROM (
            SELECT priority, count(*) 
            FROM filtered_tickets 
            GROUP BY priority
        ) s
    ),
    status_counts AS (
        -- Group by status enum
        SELECT jsonb_object_agg(status, count) as data
        FROM (
            SELECT status, count(*) 
            FROM filtered_tickets 
            GROUP BY status
        ) s
    ),
    category_counts AS (
        -- Top 10 categories by volume
        SELECT jsonb_agg(jsonb_build_object('name', c.name, 'count', s.count)) as data
        FROM (
            SELECT category_id, count(*) 
            FROM filtered_tickets 
            GROUP BY category_id
            ORDER BY count(*) DESC
            LIMIT 10
        ) s
        JOIN public.ticket_categories c ON c.id = s.category_id
    ),
    sla_stats AS (
        -- Real-time SLA health check
        SELECT jsonb_build_object(
            'on_track', count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled') AND (sla_due_date IS NULL OR sla_due_date > now())),
            'near_breach', count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled') AND sla_due_date <= now() + interval '4 hours' AND sla_due_date > now()),
            'breached', count(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled') AND sla_due_date <= now())
        ) as data
        FROM filtered_tickets
    ),
    volume_trend AS (
        -- Last 30 days daily submission volume
        SELECT jsonb_agg(jsonb_build_object('date', day, 'count', count)) as data
        FROM (
            SELECT date_trunc('day', created_at)::date as day, count(*) 
            FROM filtered_tickets 
            WHERE created_at > now() - interval '30 days'
            GROUP BY 1 
            ORDER BY 1
        ) s
    ),
    department_distribution AS (
        -- Volume per department
        SELECT jsonb_agg(jsonb_build_object('name', d.name, 'count', s.count)) as data
        FROM (
            SELECT p.department_id, count(*) 
            FROM filtered_tickets t
            JOIN public.profiles p ON p.id = t.requester_id
            GROUP BY p.department_id
        ) s
        JOIN public.departments d ON d.id = s.department_id
    ),
    user_distribution AS (
        -- Top 10 requesters
        SELECT jsonb_agg(jsonb_build_object('name', p.full_name, 'count', s.count)) as data
        FROM (
            SELECT requester_id, count(*) 
            FROM filtered_tickets 
            GROUP BY requester_id
            ORDER BY count(*) DESC
            LIMIT 10
        ) s
        JOIN public.profiles p ON p.id = s.requester_id
    ),
    raised_vs_solved AS (
        -- Simple parity metric
        SELECT jsonb_build_object(
            'raised', count(*),
            'solved', count(*) FILTER (WHERE status IN ('resolved', 'closed'))
        ) as data
        FROM filtered_tickets
    ),
    agent_workload AS (
        -- User-wise assigned vs status breakdown
        SELECT jsonb_agg(jsonb_build_object(
            'name', p.full_name,
            'total_assigned', s.total,
            'status_breakdown', s.statuses
        )) as data
        FROM (
            SELECT 
                assigned_to_id, 
                count(*) as total,
                jsonb_object_agg(status, count) as statuses
            FROM (
                SELECT assigned_to_id, status, count(*) 
                FROM filtered_tickets 
                WHERE assigned_to_id IS NOT NULL 
                GROUP BY assigned_to_id, status
            ) i
            GROUP BY assigned_to_id
        ) s
        JOIN public.profiles p ON p.id = s.assigned_to_id
    ),
    module_share AS (
        -- Volume distribution across modules
        SELECT jsonb_agg(jsonb_build_object('name', m.name, 'count', s.count)) as data
        FROM (
            SELECT module_id, count(*) 
            FROM filtered_tickets 
            GROUP BY module_id
        ) s
        JOIN public.modules m ON m.id = s.module_id
    )
    SELECT jsonb_build_object(
        'timestamp', now(),
        'scope', v_role,
        'total_tickets', (SELECT count(*) FROM filtered_tickets),
        'active_load', (SELECT count(*) FROM filtered_tickets WHERE status NOT IN ('resolved', 'closed', 'cancelled')),
        'priority_distribution', COALESCE((SELECT data FROM priority_counts), '{}'::jsonb),
        'status_distribution', COALESCE((SELECT data FROM status_counts), '{}'::jsonb),
        'category_distribution', COALESCE((SELECT data FROM category_counts), '[]'::jsonb),
        'department_distribution', COALESCE((SELECT data FROM department_distribution), '[]'::jsonb),
        'user_distribution', COALESCE((SELECT data FROM user_distribution), '[]'::jsonb),
        'raised_vs_solved', (SELECT data FROM raised_vs_solved),
        'agent_workload', COALESCE((SELECT data FROM agent_workload), '[]'::jsonb),
        'module_distribution', COALESCE((SELECT data FROM module_share), '[]'::jsonb),
        'sla_stats', (SELECT data FROM sla_stats),
        'volume_trend', COALESCE((SELECT data FROM volume_trend), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID) TO authenticated;
