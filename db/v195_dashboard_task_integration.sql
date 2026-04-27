-- v195_dashboard_task_integration.sql
-- Description: Update advanced analytics to include Task statistics and unified scoping.

CREATE OR REPLACE FUNCTION public.get_advanced_analytics(
    p_profile_id uuid,
    p_filters jsonb DEFAULT '{}'::jsonb,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
    v_dept_id uuid;
    v_is_admin boolean;
    v_f_depts uuid[];
    v_f_modules uuid[];
    v_f_categories uuid[];
    v_f_users uuid[];
    v_f_statuses text[];
BEGIN
    -- 1. Identify User Context
    SELECT role, department_id INTO v_role, v_dept_id FROM public.profiles WHERE id = p_profile_id;
    v_is_admin := public.is_admin_safe_v2(p_profile_id);

    -- 2. Parse Filters
    v_f_depts := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_filters->'dept_ids')::uuid), '{}'::uuid[]);
    v_f_modules := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_filters->'module_ids')::uuid), '{}'::uuid[]);
    v_f_categories := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_filters->'category_ids')::uuid), '{}'::uuid[]);
    v_f_users := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_filters->'user_ids')::uuid), '{}'::uuid[]);
    v_f_statuses := COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_filters->'statuses')::text), '{}'::text[]);

    RETURN (
        WITH filtered_tickets AS (
            SELECT t.*
            FROM public.tickets t
            JOIN public.profiles rp ON rp.id = t.requester_id
            WHERE (
                v_is_admin 
                OR (v_role = 'dept_admin' AND (
                    rp.department_id = v_dept_id
                    OR t.requester_id IN (SELECT id FROM profiles WHERE department_id = v_dept_id)
                    OR t.assigned_to_id IN (SELECT id FROM profiles WHERE department_id = v_dept_id)
                ))
                OR (v_role IN ('module_agent', 'end_user') AND (
                    t.requester_id = p_profile_id 
                    OR t.assigned_to_id = p_profile_id 
                    OR t.created_by_id = p_profile_id
                ))
            )
            AND (p_start_date IS NULL OR t.created_at >= p_start_date)
            AND (p_end_date IS NULL OR t.created_at <= p_end_date)
            AND (v_f_depts = '{}'::uuid[] OR rp.department_id = ANY(v_f_depts))
            AND (v_f_modules = '{}'::uuid[] OR t.module_id = ANY(v_f_modules))
            AND (v_f_categories = '{}'::uuid[] OR t.category_id = ANY(v_f_categories))
            AND (v_f_users = '{}'::uuid[] OR t.requester_id = ANY(v_f_users) OR t.assigned_to_id = ANY(v_f_users))
            AND (v_f_statuses = '{}'::text[] OR LOWER(t.status::text) = ANY(ARRAY(SELECT LOWER(s) FROM unnest(v_f_statuses) s)))
        ),
        status_counts AS (
            SELECT status::text, count(*) as count FROM filtered_tickets GROUP BY status
        ),
        priority_counts AS (
            SELECT priority::text, count(*) as count FROM filtered_tickets GROUP BY priority
        ),
        task_stats AS (
            SELECT 
                count(*) as total,
                count(*) FILTER (WHERE status = 'TODO') as todo,
                count(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress,
                count(*) FILTER (WHERE status = 'COMPLETE') as completed
            FROM public.tasks tk
            WHERE v_is_admin
               OR tk.created_by = p_profile_id
               OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = tk.id AND ta.profile_id = p_profile_id)
        ),
        user_stats AS (
            SELECT 
                count(*) as total,
                count(*) FILTER (WHERE status = 'active') as active
            FROM public.profiles
            WHERE v_is_admin OR (v_role = 'dept_admin' AND department_id = v_dept_id) OR id = p_profile_id
        )
        SELECT jsonb_build_object(
            'timestamp', now(),
            'scope', v_role,
            'total_tickets', (SELECT count(*) FROM filtered_tickets),
            'status_distribution', COALESCE((SELECT jsonb_object_agg(status, count) FROM status_counts), '{}'::jsonb),
            'priority_distribution', COALESCE((SELECT jsonb_object_agg(priority, count) FROM priority_counts), '{}'::jsonb),
            'task_stats', (SELECT jsonb_build_object('total', total, 'todo', todo, 'in_progress', in_progress, 'completed', completed) FROM task_stats),
            'user_stats', (SELECT jsonb_build_object('total', total, 'active', active) FROM user_stats),
            'live_users', (SELECT jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url, 'role', role)) FROM public.profiles WHERE status = 'active' LIMIT 5)
        )
    );
END;
$$;
