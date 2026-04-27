-- v192_performance_optimization.sql
-- Description: Optimize dashboard analytics and activity feed for high-density data.
-- Improvements: Refactored visibility logic, added missing indexes, and unified activity fetching.

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON public.task_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON public.task_activity_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_created_at ON public.ticket_activity_log (created_at DESC);

-- 2. Optimized Activity Feed RPC (Unified)
-- Merges Ticket and Task activities into a single high-performance stream
CREATE OR REPLACE FUNCTION public.get_unified_dashboard_activities(p_limit integer DEFAULT 15)
RETURNS TABLE (
  id uuid,
  ticket_id uuid,
  task_id uuid,
  activity_type text,
  content text,
  new_value text,
  created_at timestamptz,
  actor_full_name text,
  actor_avatar_url text,
  task_title text,
  project_id uuid,
  workspace_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  v_is_admin := public.is_admin_safe_v2(v_user_id);

  RETURN QUERY
  WITH combined_activities AS (
    -- Ticket Activities
    (
      SELECT 
        tal.id, 
        tal.ticket_id, 
        NULL::uuid as task_id,
        tal.activity_type::text, 
        tal.content, 
        tal.new_value, 
        tal.created_at, 
        p.full_name as actor_full_name, 
        p.avatar_url as actor_avatar_url,
        NULL::text as task_title,
        NULL::uuid as project_id,
        NULL::uuid as workspace_id
      FROM public.ticket_activity_log tal
      JOIN public.tickets t ON tal.ticket_id = t.id
      LEFT JOIN public.profiles p ON tal.actor_id = p.id
      WHERE (
        v_is_admin
        OR t.requester_id = v_user_id
        OR t.assigned_to_id = v_user_id
        OR t.created_by_id = v_user_id
      )
      ORDER BY tal.created_at DESC
      LIMIT p_limit
    )
    UNION ALL
    -- Task Activities
    (
      SELECT 
        ta.id, 
        NULL::uuid as ticket_id,
        ta.task_id,
        ta.action_type as activity_type, 
        ta.content, 
        ta.new_value, 
        ta.created_at, 
        p.full_name as actor_full_name, 
        p.avatar_url as actor_avatar_url,
        tk.title as task_title,
        tk.project_id,
        wp.workspace_id
      FROM public.task_activity_logs ta
      JOIN public.tasks tk ON ta.task_id = tk.id
      JOIN public.workspace_projects wp ON tk.project_id = wp.id
      LEFT JOIN public.profiles p ON ta.actor_id = p.id
      -- Simple visibility for tasks: if you are in the project or assigned
      WHERE (
        v_is_admin
        OR EXISTS (
          SELECT 1 FROM public.project_members pm 
          WHERE pm.project_id = tk.project_id AND pm.profile_id = v_user_id
        )
        OR tk.created_by = v_user_id
      )
      ORDER BY ta.created_at DESC
      LIMIT p_limit
    )
  )
  SELECT * FROM combined_activities
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- 3. Refactored get_advanced_analytics for extreme performance
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
    v_is_admin boolean;
    
    -- Filter extraction
    v_f_depts UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'dept_ids', '[]'::jsonb))::UUID);
    v_f_modules UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'module_ids', '[]'::jsonb))::UUID);
    v_f_categories UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'category_ids', '[]'::jsonb))::UUID);
    v_f_users UUID[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'user_ids', '[]'::jsonb))::UUID);
    v_f_statuses TEXT[] := ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_filters->'statuses', '[]'::jsonb)));
BEGIN
    -- Get user context efficiently
    SELECT role::text, department_id INTO v_role, v_dept_id 
    FROM public.profiles WHERE id = p_profile_id;
    
    v_is_admin := public.is_admin_safe_v2(p_profile_id);

    -- 1. Scoped and Filtered Tickets CTE
    WITH filtered_tickets AS (
        SELECT t.*
        FROM public.tickets t
        -- Use inner join for department filtering if needed to avoid subqueries in WHERE
        LEFT JOIN public.profiles rp ON rp.id = t.requester_id
        WHERE (
            -- Role Scoping (Optimized)
            v_is_admin
            OR (v_role = 'dept_admin' AND EXISTS (
                SELECT 1 FROM public.profiles pr 
                WHERE pr.department_id = v_dept_id 
                AND pr.id IN (t.requester_id, t.assigned_to_id, t.created_by_id)
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
        -- Multi-selection filters
        AND (v_f_depts = '{}'::UUID[] OR rp.department_id = ANY(v_f_depts))
        AND (v_f_modules = '{}'::UUID[] OR t.module_id = ANY(v_f_modules))
        AND (v_f_categories = '{}'::UUID[] OR t.category_id = ANY(v_f_categories))
        AND (v_f_users = '{}'::UUID[] OR t.requester_id = ANY(v_f_users) OR t.assigned_to_id = ANY(v_f_users))
        AND (v_f_statuses = '{}'::TEXT[] OR LOWER(t.status::text) = ANY(ARRAY(SELECT LOWER(s) FROM unnest(v_f_statuses) s)))
    ),
    -- Aggregations (Keep existing logic but on optimized filtered_tickets)
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
            LIMIT 15
        ) s
        LEFT JOIN public.ticket_categories c ON c.id = s.category_id
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
    scoped_profiles AS (
        SELECT pr.*
        FROM public.profiles pr
        WHERE v_is_admin
           OR (v_role = 'dept_admin' AND pr.department_id = v_dept_id)
           OR (v_role IN ('module_agent', 'end_user') AND pr.id = p_profile_id)
    ),
    user_stats AS (
        SELECT 
            count(*) as total,
            count(*) FILTER (WHERE status = 'active') as active,
            count(*) FILTER (WHERE status != 'active') as inactive
        FROM scoped_profiles
    )
    SELECT jsonb_build_object(
        'timestamp', now(),
        'scope', v_role,
        'total_tickets', COALESCE((SELECT max(grand_total) FROM status_aggregation), 0),
        'active_load', (SELECT count(*) FROM filtered_tickets WHERE status NOT IN ('resolved', 'closed', 'cancelled')),
        'csat_score', (SELECT round(avg(satisfaction_rating) * 20, 1) FROM filtered_tickets WHERE satisfaction_rating IS NOT NULL),
        'status_distribution', COALESCE((SELECT jsonb_object_agg(status, status_count) FROM status_aggregation), '{}'::jsonb),
        'priority_distribution', COALESCE((SELECT jsonb_object_agg(priority, priority_count) FROM priority_aggregation), '{}'::jsonb),
        'category_distribution', COALESCE((SELECT data FROM category_distribution), '[]'::jsonb),
        'department_distribution', COALESCE((SELECT data FROM dept_distribution), '[]'::jsonb),
        'monthwise_performance', COALESCE((SELECT data FROM monthwise_performance), '[]'::jsonb),
        'user_stats', (SELECT jsonb_build_object('total', total, 'active', active, 'inactive', inactive) FROM user_stats),
        'filter_options', jsonb_build_object(
            'departments', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.departments),
            'modules', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.modules),
            'categories', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name)) FROM public.ticket_categories),
            'users', (SELECT jsonb_agg(jsonb_build_object('id', id, 'name', full_name)) FROM public.profiles LIMIT 50),
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

GRANT EXECUTE ON FUNCTION public.get_unified_dashboard_activities(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(UUID, JSONB, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
