-- v053_deep_performance_indexes.sql
-- Description: Adds high-performance GIN trgm indexes for global searching.

-- Enable the extension required for GIN trgm searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Tickets Table: Optimized text searching
CREATE INDEX IF NOT EXISTS idx_tickets_subject_trgm ON public.tickets USING gin (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_number_trgm ON public.tickets USING gin (ticket_number gin_trgm_ops);

-- 2. Tickets Table: Exact lookup index for ticket_number and RLS visibility fields
CREATE INDEX IF NOT EXISTS idx_tickets_number_btree ON public.tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets (created_by_id);
CREATE INDEX IF NOT EXISTS idx_tickets_affected_person ON public.tickets (affected_person_id);

-- 3. Activity Log: Order optimization
CREATE INDEX IF NOT EXISTS idx_ticket_activity_log_created_at ON public.ticket_activity_log (created_at DESC);
