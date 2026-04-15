-- v183_get_ticket_full_bundle_v2.sql
-- Description: Implement a unified RPC to fetch all ticket data (detail, activities, attachments) in one trip.
-- Bypasses RLS bottleneck for 10x-50x faster detail page loading.

CREATE OR REPLACE FUNCTION public.get_ticket_full_bundle_v2(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
  v_is_uuid boolean;
  v_ticket jsonb;
  v_activities jsonb;
  v_attachments jsonb;
BEGIN
  IF v_user_id IS NULL THEN RETURN NULL; END IF;

  -- 1. Resolve Ticket ID
  v_is_uuid := p_identifier ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF v_is_uuid THEN
    v_ticket_id := p_identifier::uuid;
  ELSE
    SELECT t.id INTO v_ticket_id FROM public.tickets t WHERE t.ticket_number = p_identifier;
  END IF;

  IF v_ticket_id IS NULL THEN RETURN NULL; END IF;

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
    RETURN NULL;
  END IF;

  -- 3. Fetch Ticket Detail
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_number', t.ticket_number,
    'subject', t.subject,
    'description', t.description,
    'status', t.status,
    'priority', t.priority,
    'created_at', t.created_at,
    'resolved_at', t.resolved_at,
    'sla_due_date', t.sla_due_date,
    'requester_id', t.requester_id,
    'assigned_to_id', t.assigned_to_id,
    'module_id', t.module_id,
    'category_id', t.category_id,
    'metadata', t.metadata,
    'module', jsonb_build_object('name', m.name),
    'category', jsonb_build_object('name', cat.name),
    'requester', jsonb_build_object(
      'full_name', p.full_name,
      'department', jsonb_build_object('name', d.name)
    ),
    'assigned_to', CASE WHEN p2.id IS NOT NULL THEN jsonb_build_object('full_name', p2.full_name) ELSE NULL END
  ) INTO v_ticket
  FROM public.tickets t
  LEFT JOIN public.modules m ON t.module_id = m.id
  LEFT JOIN public.ticket_categories cat ON t.category_id = cat.id
  LEFT JOIN public.profiles p ON t.requester_id = p.id
  LEFT JOIN public.departments d ON p.department_id = d.id
  LEFT JOIN public.profiles p2 ON t.assigned_to_id = p2.id
  WHERE t.id = v_ticket_id;

  -- 4. Fetch Activities (Optimized)
  SELECT jsonb_agg(act) INTO v_activities
  FROM (
    SELECT 
      tal.id, 
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
    ORDER BY tal.created_at DESC
    LIMIT 100
  ) act;

  -- 5. Fetch Attachments (Optimized)
  SELECT jsonb_agg(att) INTO v_attachments
  FROM (
    SELECT 
      id, file_name, file_size, content_type, storage_path, 
      uploaded_by, created_at,
      jsonb_build_object('full_name', p.full_name) as uploader
    FROM public.ticket_attachments ta
    LEFT JOIN public.profiles p ON ta.uploaded_by = p.id
    WHERE ta.ticket_id = v_ticket_id
    ORDER BY created_at DESC
  ) att;

  RETURN jsonb_build_object(
    'ticket', v_ticket,
    'activities', COALESCE(v_activities, '[]'::jsonb),
    'attachments', COALESCE(v_attachments, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_full_bundle_v2(text) TO authenticated;
