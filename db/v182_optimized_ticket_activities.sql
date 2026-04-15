-- v182_optimized_ticket_activities.sql
-- Description: Implement an optimized RPC to fetch activities for a specific ticket.
-- Bypasses heavy RLS joined scans for performance improvement.

CREATE OR REPLACE FUNCTION public.get_ticket_activities_v2(p_identifier text)
RETURNS TABLE (
  id uuid,
  ticket_id uuid,
  actor_id uuid,
  activity_type text,
  content text,
  created_at timestamptz,
  metadata jsonb,
  old_value text,
  new_value text,
  is_internal boolean,
  actor jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
  v_is_uuid boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;

  -- 1. Resolve Ticket ID
  v_is_uuid := p_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF v_is_uuid THEN
    v_ticket_id := p_identifier::uuid;
  ELSE
    SELECT t.id INTO v_ticket_id FROM public.tickets t WHERE t.ticket_number = p_identifier;
  END IF;

  IF v_ticket_id IS NULL THEN RETURN; END IF;

  -- 2. Check Visibility (Reuse v160 security logic)
  IF NOT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = v_ticket_id
    AND (
      public.is_admin_safe_v2(v_user_id)
      OR t.requester_id = v_user_id
      OR t.created_by_id = v_user_id
      OR t.assigned_to_id = v_user_id
      OR t.affected_person_id = v_user_id
      OR (t.metadata->'team_members') @> jsonb_build_array(v_user_id::text)
    )
  ) THEN
    RETURN;
  END IF;

  -- 3. Return Activities
  RETURN QUERY
  SELECT 
    tal.id, 
    tal.ticket_id, 
    tal.actor_id, 
    tal.activity_type::text, 
    tal.content, 
    tal.created_at, 
    tal.metadata, 
    tal.old_value, 
    tal.new_value, 
    tal.is_internal,
    jsonb_build_object('full_name', p.full_name) as actor
  FROM public.ticket_activity_log tal
  LEFT JOIN public.profiles p ON tal.actor_id = p.id
  WHERE tal.ticket_id = v_ticket_id
  ORDER BY tal.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_activities_v2(text) TO authenticated;
