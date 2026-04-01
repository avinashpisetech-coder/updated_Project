-- v048_enhance_meeting_schema.sql
-- Add interaction_id and meeting_tool to ticket_meetings

-- Add columns if they don't exist
ALTER TABLE ticket_meetings 
ADD COLUMN IF NOT EXISTS interaction_id text UNIQUE,
ADD COLUMN IF NOT EXISTS meeting_tool text;

-- Seed existing meetings with a default interaction_id
-- Format: TKT-UNKNOWN-YYYYMMDD-[4DigitRandom]
DO $$
DECLARE
    m RECORD;
    t_num TEXT;
    m_date TEXT;
    rand_num TEXT;
BEGIN
    FOR m IN SELECT id, ticket_id, starts_at FROM ticket_meetings WHERE interaction_id IS NULL LOOP
        SELECT ticket_number INTO t_num FROM tickets WHERE id = m.ticket_id;
        IF t_num IS NULL THEN
            t_num := 'TKT-UNKNOWN';
        END IF;
        
        m_date := to_char(m.starts_at, 'YYYYMMDD');
        rand_num := floor(random() * 9000 + 1000)::text;
        
        UPDATE ticket_meetings 
        SET interaction_id = t_num || '-' || m_date || '-' || rand_num
        WHERE id = m.id;
    END LOOP;
END $$;
