-- Create designations table
CREATE TABLE IF NOT EXISTS public.designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to anyone" ON public.designations FOR SELECT USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.designations FOR ALL USING (auth.role() = 'authenticated');

-- Modify profiles to use designation_id instead of a raw text column, preserving the old designation column for migration if needed
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES public.designations(id) ON DELETE SET NULL;

-- Initial Seed Data
INSERT INTO public.designations (name) VALUES 
('Software Engineer'),
('Senior Software Engineer'),
('System Administrator'),
('Network Engineer'),
('IT Support Specialist'),
('Project Manager'),
('Product Manager'),
('Quality Assurance Analyst')
ON CONFLICT (name) DO NOTHING;
