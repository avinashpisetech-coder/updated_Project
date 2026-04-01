-- v052_migrate_historical_interactions.sql (V5)
-- Goal: Restore historical conversation visibility for existing tickets in the new Interaction Queue.
-- This version filters out system noise like "Added ticket" and ensures agent replies are correctly surfaced.

-- 1. CLEANUP: Revert "Added ticket" markers back to system status changes (removes them from Registry)
-- These were system-generated markers and should not clutter the communication thread.
UPDATE ticket_activity_log 
SET activity_type = 'status_change',
    metadata = COALESCE(metadata, '{}'::jsonb) - 'manual_activity'
WHERE content = 'Added ticket';

-- 2. DISCOVERY: Find and migrate ALL agent-provided narratives that were previously missed
-- This searches for any record by an agent (non-requester) that isn't a standard status update.
UPDATE ticket_activity_log
SET 
  activity_type = 'public_reply',
  metadata = COALESCE(ticket_activity_log.metadata, '{}'::jsonb) || '{"manual_activity": true}'::jsonb,
  is_internal = false -- Ensure they are visible to both parties (Requesters & Agents)
FROM tickets
WHERE 
  ticket_activity_log.ticket_id = tickets.id
  AND ticket_activity_log.actor_id != tickets.requester_id -- It was an interaction from an agent or second user
  AND ticket_activity_log.activity_type NOT IN ('public_reply', 'meeting_scheduled')
  AND ticket_activity_log.content NOT LIKE 'Status changed from % to %'
  AND ticket_activity_log.content NOT IN ('Ticket assigned', 'Ticket unassigned', 'Added ticket', 'SLA BREACHED', 'Deadline updated%');

-- 3. CONSISTENCY: Ensure all historical public_replies are tagged for the Interaction block
UPDATE ticket_activity_log
SET 
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"manual_activity": true}'::jsonb
WHERE 
  activity_type = 'public_reply'
  AND (metadata->>'manual_activity' IS NULL OR metadata->>'manual_activity' != 'true');
