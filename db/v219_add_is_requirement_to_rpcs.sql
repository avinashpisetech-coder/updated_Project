-- v219_add_is_requirement_to_rpcs.sql
-- Description: Add is_requirement field to ticket-related RPCs for correct linking.

BEGIN;

-- 1. Update get_ticket_full_bundle_v2
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

  -- 2. Check Visibility
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
    'is_requirement', t.is_requirement, -- ADDED
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
      ta.id, ta.file_name, ta.file_size, ta.content_type, ta.storage_path, 
      ta.uploaded_by, ta.created_at,
      jsonb_build_object('full_name', p.full_name) as uploader
    FROM public.ticket_attachments ta
    LEFT JOIN public.profiles p ON ta.uploaded_by = p.id
    WHERE ta.ticket_id = v_ticket_id
    ORDER BY ta.created_at DESC
  ) att;

  RETURN jsonb_build_object(
    'ticket', v_ticket,
    'activities', COALESCE(v_activities, '[]'::jsonb),
    'attachments', COALESCE(v_attachments, '[]'::jsonb)
  );
END;
$$;

-- 2. Update get_tickets_matrix_v2
DROP FUNCTION IF EXISTS public.get_tickets_matrix_v2(text, text, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_tickets_matrix_v2(
  p_query text DEFAULT '',
  p_status text DEFAULT 'all',
  p_sort_field text DEFAULT 'created_at',
  p_sort_dir text DEFAULT 'desc',
  p_offset int DEFAULT 0,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  ticket_number text,
  subject text,
  status text,
  priority text,
  created_at timestamptz,
  resolved_at timestamptz,
  sla_due_date timestamptz,
  is_requirement boolean, -- ADDED
  module_name text,
  category_name text,
  requester_name text,
  department_name text,
  total_count bigint
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
  WITH filtered_tickets AS (
    SELECT 
      t.*,
      m.name as m_name,
      cat.name as cat_name,
      p.full_name as req_name,
      d.name as dept_name
    FROM public.tickets t
    LEFT JOIN public.modules m ON t.module_id = m.id
    LEFT JOIN public.ticket_categories cat ON t.category_id = cat.id
    LEFT JOIN public.profiles p ON t.requester_id = p.id
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE (
      v_is_admin
      OR t.requester_id = v_user_id
      OR t.created_by_id = v_user_id
      OR t.assigned_to_id = v_user_id
      OR t.affected_person_id = v_user_id
      OR (t.metadata->'team_members') @> jsonb_build_array(v_user_id::text)
    )
    AND (
      p_query = '' 
      OR t.subject ILIKE '%' || p_query || '%'
      OR t.ticket_number ILIKE '%' || p_query || '%'
      OR p.full_name ILIKE '%' || p_query || '%'
    )
    AND (
      p_status = 'all'
      OR (p_status = 'pending' AND t.status::text IN ('pending', 'pending_dept', 'pending_third_party'))
      OR (p_status = 'pending_user' AND t.status::text = 'pending_user')
      OR (p_status NOT IN ('all', 'pending', 'pending_user') AND t.status::text = p_status)
    )
  ),
  counting AS (
    SELECT COUNT(*) as total FROM filtered_tickets
  )
  SELECT 
    f.id, f.ticket_number, f.subject, f.status::text, f.priority::text, 
    f.created_at, f.resolved_at, f.sla_due_date, f.is_requirement, f.m_name, f.cat_name, f.req_name, f.dept_name,
    c.total
  FROM filtered_tickets f, counting c
  ORDER BY 
    CASE WHEN p_sort_dir = 'asc' THEN
      CASE 
        WHEN p_sort_field = 'created_at' THEN f.created_at::text
        WHEN p_sort_field = 'ticket_number' THEN f.ticket_number
        WHEN p_sort_field = 'subject' THEN f.subject
        WHEN p_sort_field = 'status' THEN f.status::text
        ELSE f.created_at::text
      END
    END ASC,
    CASE WHEN p_sort_dir = 'desc' THEN
      CASE 
        WHEN p_sort_field = 'created_at' THEN f.created_at::text
        WHEN p_sort_field = 'ticket_number' THEN f.ticket_number
        WHEN p_sort_field = 'subject' THEN f.subject
        WHEN p_sort_field = 'status' THEN f.status::text
        ELSE f.created_at::text
      END
    END DESC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;

-- 3. Update handle_unified_activity to use correct link for requirements
CREATE OR REPLACE FUNCTION public.handle_unified_activity()
RETURNS trigger AS $$
DECLARE
    v_activity_type text;
    v_entity_type   text;
    v_transaction_id uuid;
    v_owner_id      uuid;
    v_assignee_ids  uuid[] := '{}';
    v_actor_id      uuid := auth.uid();
    v_actor_name    text;
    v_draft         record;
    v_user_id       uuid;
    v_target_users  uuid[] := '{}';
    v_link          text;
    v_old           jsonb;
    v_new           jsonb;
BEGIN
    -- 1. Identify Entity and Transaction
    v_entity_type := TG_ARGV[0];
    
    IF TG_OP = 'DELETE' THEN
        v_old := to_jsonb(OLD);
        v_transaction_id := (v_old->>'id')::uuid;
        v_activity_type := 'DELETE';
    ELSE
        v_new := to_jsonb(NEW);
        v_transaction_id := (v_new->>'id')::uuid;
        IF TG_OP = 'INSERT' THEN
            v_activity_type := 'CREATE';
        ELSIF TG_OP = 'UPDATE' THEN
            v_old := to_jsonb(OLD);
            v_activity_type := 'UPDATE';
            -- Check for Assignment Change (Ticket specific)
            IF v_entity_type = 'ticket' AND (v_old->>'assigned_to_id') IS DISTINCT FROM (v_new->>'assigned_to_id') AND (v_new->>'assigned_to_id') IS NOT NULL THEN
                v_activity_type := 'ASSIGN';
            END IF;
        END IF;
    END IF;

    -- 2. Capture Owner and Assigned Users
    IF v_entity_type = 'ticket' THEN
        IF TG_OP = 'DELETE' THEN
            v_owner_id := (v_old->>'created_by_id')::uuid;
            v_assignee_ids := array_remove(ARRAY[(v_old->>'assigned_to_id')::uuid, (v_old->>'requester_id')::uuid], NULL);
        ELSE
            v_owner_id := (v_new->>'created_by_id')::uuid;
            v_assignee_ids := array_remove(ARRAY[(v_new->>'assigned_to_id')::uuid, (v_new->>'requester_id')::uuid], NULL);
        END IF;
    ELSIF v_entity_type = 'task' THEN
        IF TG_OP = 'DELETE' THEN
            v_owner_id := (v_old->>'created_by')::uuid;
        ELSE
            v_owner_id := (v_new->>'created_by')::uuid;
            -- Fetch assignees from task_assignees table
            SELECT array_agg(profile_id) INTO v_assignee_ids FROM public.task_assignees WHERE task_id = v_transaction_id;
        END IF;
    END IF;

    -- Combine target users (Owner + Assignees), excluding the actor
    v_target_users := array_cat(ARRAY[v_owner_id], v_assignee_ids);
    
    -- 3. Get Actor Name
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE id = v_actor_id;
    v_actor_name := COALESCE(v_actor_name, 'System');

    -- 4. Generate Drafts and Dispatch
    SELECT * INTO v_draft FROM public.get_dynamic_draft(v_activity_type, v_entity_type, v_transaction_id, v_actor_name);

    -- 5. Build Link
    IF v_entity_type = 'ticket' AND (CASE WHEN TG_OP = 'DELETE' THEN (v_old->'is_requirement')::boolean ELSE (v_new->'is_requirement')::boolean END) = true THEN
        v_link := '/tickets/requests/' || v_transaction_id::text;
    ELSE
        v_link := '/' || v_entity_type || 's/' || v_transaction_id::text;
    END IF;

    FOREACH v_user_id IN ARRAY v_target_users
    LOOP
        IF v_user_id IS NOT NULL AND v_user_id != v_actor_id THEN
            -- UI Notification
            INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
            VALUES (
                v_user_id, 
                v_draft.subject, 
                v_draft.notification_body, 
                'info', 
                v_link,
                jsonb_build_object('transaction_id', v_transaction_id, 'entity_type', v_entity_type)
            );

            -- Email Queue
            INSERT INTO public.communication_queue (user_id, subject, body_html, entity_id, entity_type, activity_type)
            VALUES (v_user_id, v_draft.subject, v_draft.email_draft, v_transaction_id, v_entity_type, v_activity_type);
        END IF;
    END LOOP;

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
