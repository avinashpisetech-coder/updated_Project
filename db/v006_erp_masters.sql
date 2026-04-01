-- ERP Masters for Ticketing

CREATE TABLE IF NOT EXISTS public.erp_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.erp_sub_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    erp_module_id UUID NOT NULL REFERENCES public.erp_modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.erp_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sub_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to anyone" ON public.erp_modules FOR SELECT USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.erp_modules FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to anyone" ON public.erp_sub_modules FOR SELECT USING (true);
CREATE POLICY "Allow all access to authenticated users" ON public.erp_sub_modules FOR ALL USING (auth.role() = 'authenticated');

-- Initial Seed Data
INSERT INTO public.erp_modules (name) VALUES 
('Sales & Distribution'),
('Material Management (MM)'),
('FI/CO (Finance)'),
('Human Resources (HR)');
