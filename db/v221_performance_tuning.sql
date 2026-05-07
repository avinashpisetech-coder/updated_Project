-- v221_performance_tuning.sql
-- Description: Targeted indexing for critical notification and activity streams.

-- 1. Optimized Notification Index
-- Speeds up the "Unread" check and the "Latest 50" fetch in the Notification Bell
CREATE INDEX IF NOT EXISTS idx_tn_user_unread_ordered 
ON public.ticket_notifications (user_id, is_read, created_at DESC)
WHERE is_read = false;

-- 2. Optimized Activity Log Index
-- Speeds up the rendering of ticket history/audit trails
CREATE INDEX IF NOT EXISTS idx_tal_ticket_ordered 
ON public.ticket_activity_log (ticket_id, created_at DESC);

-- 3. Optimized Ticket Scoping
-- Speeds up the most common RLS checks for end-users and agents
CREATE INDEX IF NOT EXISTS idx_tickets_visibility_composite
ON public.tickets (requester_id, assigned_to_id, status);

-- 4. Refresh Statistics
ANALYZE public.ticket_notifications;
ANALYZE public.ticket_activity_log;
ANALYZE public.tickets;
