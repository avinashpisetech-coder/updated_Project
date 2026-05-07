-- v224_optimize_activity_feed_rpc.sql
-- Description: Optimize unified dashboard activities for better performance using better joins.

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
        COALESCE(ta.metadata->>'title', ta.metadata->>'status', ta.metadata->>'content', ta.action_type) as content, 
        COALESCE(ta.metadata->>'new_status', ta.metadata->>'assignee_count', '') as new_value, 
        ta.created_at, 
        p.full_name as actor_full_name, 
        p.avatar_url as actor_avatar_url,
        tk.title as task_title,
        tk.project_id,
        wp.workspace_id
      FROM public.task_activity_logs ta
      JOIN public.tasks tk ON ta.task_id = tk.id
      JOIN public.workspace_projects wp ON tk.project_id = wp.id
      LEFT JOIN public.profiles p ON ta.created_by = p.id
      WHERE (
        v_is_admin
        OR tk.created_by = v_user_id
        -- Use a JOIN instead of EXISTS for potentially better planning
        OR tk.id IN (SELECT task_id FROM public.task_assignees WHERE profile_id = v_user_id)
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
