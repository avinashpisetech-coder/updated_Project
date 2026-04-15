-- v075_refactor_dashboard_scoping.sql
-- Description: Refactor get_advanced_analytics and get_system_activities_v2 to strictly follow the new role-based scoping rules.
-- Rules:
-- 1. Super Admin: Global data (unfiltered)
-- 2. Dept Admin: Scope to department_id
-- 3. Agent/End User: t.requester_id = profile_id OR t.assigned_to_id = profile_id

-- REFACTOR: get_advanced_analytics
CREATE OR REPLACE FUNCTION public.get_advanced_analytics(p_profile_id UUID, p_filters JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_dept_id UUID;
    v_result JSONB;
BEGIN
    -- Get user context
    SELECT role::text, department_id INTO v_role, v_dept_id 
    FROM public.profiles WHERE id = p_profile_id;

    -- Build core result set using modular CTEs
    WITH scoped_tickets AS (
        SELECT t.*
        FROM public.tickets t
        WHERE v_role = 'super_admin'
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
    ),
    status_aggregation AS (
        -- SINGLE GROUP BY for Status Distribution to ensure Total matches sum
        SELECT 
            status,
            count(*) as status_count,
            sum(count(*)) OVER() as grand_total
        FROM scoped_tickets
        GROUP BY status
    ),
    priority_aggregation AS (
        SELECT 
            priority,
            count(*) as priority_count
        FROM scoped_tickets
        GROUP BY priority
    ),
    status_json AS (
        SELECT jsonb_object_agg(status, status_count) as data, max(grand_total) as total
        FROM status_aggregation
    ),
    priority_json AS (
        SELECT jsonb_object_agg(priority, priority_count) as data
        FROM priority_aggregation
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
            FROM scoped_tickets 
            GROUP BY category_id
            ORDER BY raised DESC
            LIMIT 10
        ) s
        LEFT JOIN public.ticket_categories c ON c.id = s.category_id
    )
    SELECT jsonb_build_object(
        'timestamp', now(),
        'scope', v_role,
        'total_tickets', COALESCE((SELECT total FROM status_json), 0),
        'status_distribution', COALESCE((SELECT data FROM status_json), '{}'::jsonb),
        'priority_distribution', COALESCE((SELECT data FROM priority_json), '{}'::jsonb),
        'category_distribution', COALESCE((SELECT data FROM category_distribution), '[]'::jsonb),
        'active_load', (SELECT count(*) FROM scoped_tickets WHERE status NOT IN ('resolved', 'closed')),
        'csat_score', (SELECT round(avg(satisfaction_rating) * 20, 1) FROM scoped_tickets WHERE satisfaction_rating IS NOT NULL),
        'volume_trend', (
            SELECT jsonb_agg(jsonb_build_object('date', day, 'count', count))
            FROM (
                SELECT date_trunc('day', created_at)::date as day, count(*) 
                FROM scoped_tickets 
                WHERE created_at > now() - interval '30 days'
                GROUP BY 1 ORDER BY 1
            ) s
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- REFACTOR: get_system_activities_v2
CREATE OR REPLACE FUNCTION public.get_system_activities_v2(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  ticket_id uuid,
  activity_type text,
  content text,
  new_value text,
  created_at timestamptz,
  actor_full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_dept_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  SELECT role::text, department_id INTO v_user_role, v_dept_id 
  FROM public.profiles pr WHERE pr.id = v_user_id;

  RETURN QUERY
  SELECT 
    tal.id, tal.ticket_id, tal.activity_type::text, tal.content, tal.new_value, tal.created_at, p.full_name
  FROM public.ticket_activity_log tal
  JOIN public.tickets t ON tal.ticket_id = t.id
  LEFT JOIN public.profiles p ON tal.actor_id = p.id
  WHERE 
    v_user_role = 'super_admin'
    OR (v_user_role = 'dept_admin' AND (
        t.requester_id IN (SELECT pr2.id FROM public.profiles pr2 WHERE pr2.department_id = v_dept_id)
        OR t.assigned_to_id IN (SELECT pr2.id FROM public.profiles pr2 WHERE pr2.department_id = v_dept_id)
        OR t.created_by_id IN (SELECT pr2.id FROM public.profiles pr2 WHERE pr2.department_id = v_dept_id)
    ))
    OR (v_user_role IN ('module_agent', 'end_user') AND (
        t.requester_id = v_user_id 
        OR t.assigned_to_id = v_user_id 
        OR t.created_by_id = v_user_id
    ))
  ORDER BY tal.created_at DESC
  LIMIT p_limit;
END;
$$;
