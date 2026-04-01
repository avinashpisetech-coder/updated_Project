-- v067_organizational_index_matrix.sql
-- Description: Comprehensive indexing for all high-frequency query paths 
-- across the total system (Tickets, Profiles, Activities, and Masters).

-- 1. Support Queue & Registry Composites
-- Speeds up the most common dashboard and registry views (Filtered by status/user + Sorted by date)
CREATE INDEX IF NOT EXISTS idx_tickets_status_created_at ON public.tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_created_at ON public.tickets (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_created_at ON public.tickets (assigned_to_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_module_id ON public.tickets (module_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON public.tickets (category_id);

-- 2. Audit Log & Activity Stream Composites
-- Speeds up the "Recent Activity" feed and the Detail page activity logs.
CREATE INDEX IF NOT EXISTS idx_ticket_activity_ticket_created ON public.ticket_activity_log (ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_actor_created ON public.ticket_activity_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_type ON public.ticket_activity_log (activity_type);

-- 3. Identity & Master Data Hub Lookups
-- Speeds up the "Settings" pages and "Create Ticket" form loads.
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS idx_ticket_categories_module_id ON public.ticket_categories (module_id);
CREATE INDEX IF NOT EXISTS idx_profile_module_access_profile_id ON public.profile_module_access (profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_module_access_module_id ON public.profile_module_access (module_id);

-- 4. Search Optimization (B-Tree for prefix searching)
-- Covers ilike 'ABC%' or exact matches for system identifiers.
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number_prefix ON public.tickets (ticket_number text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_subject_prefix ON public.tickets (subject text_pattern_ops);

-- Grant appropriate permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
