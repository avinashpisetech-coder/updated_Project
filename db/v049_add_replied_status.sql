-- v049_add_replied_status.sql
-- Add 'replied' status to ticket_status enum and update ticket_activity_log triggers.

-- 1. Add 'replied' to ticket_status enum
-- NOTE: In Postgres, you cannot add values to an enum inside a transaction (on some versions).
-- If this fails, run it manually outside of a transaction.
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'replied' AFTER 'pending_user';

-- 2. Optional: Add 'public_reply' to activity_type if not exists
-- (It already exists based on v004, but here is a safety)
-- ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'public_reply';

-- 3. Update any metadata if needed
COMMENT ON TYPE ticket_status IS 'new, assigned, in_progress, pending_user, replied, pending_dept, pending_third_party, scheduled, escalated, resolved, closed, cancelled';
