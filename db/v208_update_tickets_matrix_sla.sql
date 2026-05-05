-- v208_update_tickets_matrix_sla.sql
-- Description: Update get_tickets_matrix_v2 to include sla_due_date for real-time SLA tracking.

BEGIN;

-- Drop existing function first because return type changed (added sla_due_date column).
-- Postgres does not allow CREATE OR REPLACE to change OUT parameter types (error 42P13).
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
  sla_due_date timestamptz, -- ADDED THIS
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
    f.created_at, f.resolved_at, f.sla_due_date, f.m_name, f.cat_name, f.req_name, f.dept_name,
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

COMMIT;
