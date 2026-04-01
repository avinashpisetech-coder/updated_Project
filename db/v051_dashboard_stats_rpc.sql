-- v051_dashboard_stats_rpc.sql
-- Description: Create a single RPC to fetch all ticket counts grouped by status.
-- This replaces the multi-query N+1 approach on the dashboard.

DROP FUNCTION IF EXISTS public.get_ticket_status_counts();

CREATE OR REPLACE FUNCTION public.get_ticket_status_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER -- Uses the current user's RLS permissions
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Aggregate counts by status into a single JSON object.
  -- This is more efficient than performing 11+ separate count queries from the application.
  SELECT jsonb_object_agg(status, count)
  INTO result
  FROM (
    SELECT status, count(*) as count
    FROM public.tickets
    GROUP BY status
  ) s;

  -- Ensure we return an empty object instead of NULL if no tickets exist
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_ticket_status_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ticket_status_counts() TO anon; -- Allow RLS to handle permission
