-- v068_optimized_activity_rpc.sql
-- Description: Performance-hardened RPC to fetch recent system activities 
-- with built-in RBAC scoping for the total organizational system.

-- Using a NEW name (v2) to force the Supabase schema cache to refresh.
DROP FUNCTION IF EXISTS public.get_system_activities_v2(integer);

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
  -- 1. Identity & Context Resolution
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  SELECT role::text, department_id INTO v_user_role, v_dept_id 
  FROM public.profiles 
  WHERE public.profiles.id = v_user_id;

  -- 2. Scoped Branching Fetch
  -- We explicitly cast activity_type to ::text to match the RETURN TABLE signature.
  IF v_user_role IN ('super_admin', 'dept_admin_access') THEN
    RETURN QUERY
    SELECT 
      tal.id, tal.ticket_id, tal.activity_type::text, tal.content, tal.new_value, tal.created_at, p.full_name
    FROM public.ticket_activity_log tal
    LEFT JOIN public.profiles p ON tal.actor_id = p.id
    ORDER BY tal.created_at DESC
    LIMIT p_limit;

  ELSIF v_user_role = 'dept_admin' AND v_dept_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      tal.id, tal.ticket_id, tal.activity_type::text, tal.content, tal.new_value, tal.created_at, p.full_name
    FROM public.ticket_activity_log tal
    JOIN public.tickets t ON tal.ticket_id = t.id
    LEFT JOIN public.profiles p ON tal.actor_id = p.id
    WHERE t.requester_id IN (SELECT p_m.id FROM public.profiles p_m WHERE p_m.department_id = v_dept_id)
       OR t.assigned_to_id IN (SELECT p_a.id FROM public.profiles p_a WHERE p_a.department_id = v_dept_id)
    ORDER BY tal.created_at DESC
    LIMIT p_limit;

  ELSIF v_user_role = 'module_agent' THEN
    RETURN QUERY
    SELECT 
      tal.id, tal.ticket_id, tal.activity_type::text, tal.content, tal.new_value, tal.created_at, p.full_name
    FROM public.ticket_activity_log tal
    JOIN public.tickets t ON tal.ticket_id = t.id
    LEFT JOIN public.profiles p ON tal.actor_id = p.id
    WHERE t.module_id IN (
      SELECT pma.module_id FROM public.profile_module_access pma
      WHERE pma.profile_id = v_user_id AND (pma.can_view = true OR pma.can_update = true)
    )
    ORDER BY tal.created_at DESC
    LIMIT p_limit;

  ELSE
    RETURN QUERY
    SELECT 
      tal.id, tal.ticket_id, tal.activity_type::text, tal.content, tal.new_value, tal.created_at, p.full_name
    FROM public.ticket_activity_log tal
    JOIN public.tickets t ON tal.ticket_id = t.id
    LEFT JOIN public.profiles p ON tal.actor_id = p.id
    WHERE t.requester_id = v_user_id
    ORDER BY tal.created_at DESC
    LIMIT p_limit;
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_system_activities_v2(integer) TO authenticated;
