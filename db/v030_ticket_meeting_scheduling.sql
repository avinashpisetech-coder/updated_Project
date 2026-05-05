-- v030_ticket_meeting_scheduling.sql
-- Phase 3: Meeting scheduling linked to tickets

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    CREATE TYPE meeting_type AS ENUM ('online', 'physical', 'phone_call');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
    CREATE TYPE meeting_status AS ENUM ('scheduled', 'completed', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_rsvp_status') THEN
    CREATE TYPE meeting_rsvp_status AS ENUM ('pending', 'accepted', 'declined');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ticket_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_type meeting_type NOT NULL,
  starts_at timestamptz NOT NULL,
  duration_minutes int NOT NULL CHECK (duration_minutes > 0),
  meeting_link text,
  location text,
  agenda text,
  status meeting_status NOT NULL DEFAULT 'scheduled',
  previous_ticket_status ticket_status,
  outcome_note text,
  cancel_reason text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_meetings_ticket_id ON ticket_meetings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_meetings_starts_at ON ticket_meetings(starts_at);
CREATE INDEX IF NOT EXISTS idx_ticket_meetings_status ON ticket_meetings(status);

CREATE TABLE IF NOT EXISTS ticket_meeting_participants (
  meeting_id uuid NOT NULL REFERENCES ticket_meetings(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rsvp_status meeting_rsvp_status NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_meeting_participants_profile_id
  ON ticket_meeting_participants(profile_id);

ALTER TABLE ticket_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read ticket meetings" ON ticket_meetings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert ticket meetings" ON ticket_meetings
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Allow update ticket meetings" ON ticket_meetings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (updated_by = auth.uid());

CREATE POLICY "Allow read meeting participants" ON ticket_meeting_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert meeting participants" ON ticket_meeting_participants
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update meeting participants" ON ticket_meeting_participants
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
