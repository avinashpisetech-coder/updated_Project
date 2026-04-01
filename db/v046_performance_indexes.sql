-- v046_performance_indexes.sql
-- Description: Adds B-Tree indexes to the heavily filtered and sorted columns in the `tickets` table.

-- Create index for ticket status to speed up status-based filters (e.g. "new", "assigned", "resolved")
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);

-- Create index for assignee_id to quickly find tickets assigned to a specific operative
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets (assigned_to_id);

-- Create index for requester_id to quickly find tickets created by a specific user
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON public.tickets (requester_id);

-- Create index for created_at (descending) to optimize the default sorting parameter in TicketListClient
CREATE INDEX IF NOT EXISTS idx_tickets_created_at_desc ON public.tickets (created_at DESC);

-- Create index for priority 
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets (priority);
