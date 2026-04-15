-- v070_custom_reports_schema.sql
-- Description: Table to store user-defined custom reports and dashboard widgets.

CREATE TABLE IF NOT EXISTS public.custom_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    chart_type text NOT NULL, -- 'bar', 'line', 'pie', 'donut', 'area'
    config jsonb NOT NULL DEFAULT '{}'::jsonb, -- Stores field mappings, axis labels, colors
    is_on_dashboard boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own custom reports"
    ON public.custom_reports
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_custom_reports_user_id ON public.custom_reports(user_id);
