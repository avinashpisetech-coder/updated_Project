-- v076_dashboard_user_stats_and_live_monitor.sql
-- Description: Enhance get_advanced_analytics to include User Metrics and Live Session data.
-- Version 2: Fixed Status Parity Logic to ensure Total matches sum of all visible statuses.

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

    -- 1. Scoped Tickets CTE
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
    -- 2. Scoped Profiles CTE (For User Stats)
    scoped_profiles AS (
        SELECT pr.*
        FROM public.profiles pr
        WHERE v_role = 'super_admin'
           OR (v_role = 'dept_admin' AND pr.department_id = v_dept_id)
           OR (v_role IN ('module_agent', 'end_user') AND pr.id = p_profile_id)
    ),
    status_master AS (
        SELECT unnest(ARRAY['new', 'assigned', 'in_progress', 'pending_user', 'pending_dept', 'pending_third_party', 'scheduled', 'escalated', 'resolved', 'closed', 'cancelled'])::ticket_status as status
    ),
    status_counts AS (
        SELECT 
            m.status,
            count(t.id) as status_count
        FROM status_master m
        LEFT JOIN scoped_tickets t ON m.status = t.status
        GROUP BY m.status
    ),
    status_aggregation AS (
        SELECT 
            status::text,
            status_count,
            sum(status_count) OVER() as grand_total
        FROM status_counts
    ),
    priority_aggregation AS (
        SELECT 
            priority,
            count(*) as priority_count
        FROM scoped_tickets
        GROUP BY priority
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
        'user_stats', (SELECT jsonb_build_object('total', total, 'active', active, 'inactive', inactive) FROM user_stats),
        'live_users', COALESCE((SELECT data FROM live_users_list), '[]'::jsonb),
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

-- REFACTOR: get_system_activities_v3 (Includes Avatars)
CREATE OR REPLACE FUNCTION public.get_system_activities_v3(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  ticket_id uuid,
  activity_type text,
  content text,
  new_value text,
  created_at timestamptz,
  actor_full_name text,
  actor_avatar_url text
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
    tal.id, tal.ticket_id, tal.activity_type::text, tal.content, tal.new_value, tal.created_at, p.full_name, p.avatar_url
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
