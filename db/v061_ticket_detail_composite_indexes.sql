-- v061_ticket_detail_composite_indexes.sql
-- Description: Adds strategic composite indexes for the Ticket Detail page.
-- This ensures that fetching activities, attachments, and meetings 
-- is handled by the database engine's hardware-level index-seek operations.

-- 1. Optimized Activity Log Retrieval
CREATE INDEX IF NOT EXISTS idx_ticket_activity_log_lookup_v2 
ON public.ticket_activity_log(ticket_id, created_at DESC);

-- 2. Optimized Attachments Retrieval
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_lookup 
ON public.ticket_attachments(ticket_id, created_at DESC);

-- 3. Optimized Meetings Retrieval
CREATE INDEX IF NOT EXISTS idx_ticket_meetings_lookup 
ON public.ticket_meetings(ticket_id, starts_at ASC);

-- 4. Optimized Chat Messages Retrieval
CREATE INDEX IF NOT EXISTS idx_ticket_chat_lookup 
ON public.ticket_chat_messages(ticket_id, created_at ASC);

-- 5. Optimized Watchers Retrieval
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_lookup 
ON public.ticket_watchers(ticket_id);
