-- v211_csat_system.sql
-- Description: Customer Satisfaction (CSAT) rating system for resolved tickets.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ticket_csat (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    requester_id uuid NOT NULL REFERENCES public.profiles(id),
    rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment text,
    submitted_at timestamptz DEFAULT now(),
    UNIQUE(ticket_id) -- One rating per ticket
);

ALTER TABLE public.ticket_csat ENABLE ROW LEVEL SECURITY;

-- Requester can insert their own rating
CREATE POLICY "CSAT insert own" ON public.ticket_csat
    FOR INSERT TO authenticated
    WITH CHECK (requester_id = auth.uid());

-- Anyone can read CSAT (for analytics)
CREATE POLICY "CSAT read" ON public.ticket_csat
    FOR SELECT TO authenticated
    USING (true);

-- Analytics RPC: Average CSAT per agent
CREATE OR REPLACE FUNCTION public.get_csat_analytics(
    p_from_date timestamptz DEFAULT now() - interval '30 days',
    p_to_date timestamptz DEFAULT now()
)
RETURNS TABLE (
    agent_id uuid,
    agent_name text,
    avg_rating numeric,
    total_ratings bigint,
    rating_1 bigint,
    rating_2 bigint,
    rating_3 bigint,
    rating_4 bigint,
    rating_5 bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        t.assigned_to_id AS agent_id,
        p.full_name AS agent_name,
        ROUND(AVG(c.rating), 2) AS avg_rating,
        COUNT(*) AS total_ratings,
        COUNT(*) FILTER (WHERE c.rating = 1) AS rating_1,
        COUNT(*) FILTER (WHERE c.rating = 2) AS rating_2,
        COUNT(*) FILTER (WHERE c.rating = 3) AS rating_3,
        COUNT(*) FILTER (WHERE c.rating = 4) AS rating_4,
        COUNT(*) FILTER (WHERE c.rating = 5) AS rating_5
    FROM public.ticket_csat c
    JOIN public.tickets t ON t.id = c.ticket_id
    JOIN public.profiles p ON p.id = t.assigned_to_id
    WHERE c.submitted_at BETWEEN p_from_date AND p_to_date
    GROUP BY t.assigned_to_id, p.full_name
    ORDER BY avg_rating DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_csat_analytics TO authenticated;

COMMIT;
