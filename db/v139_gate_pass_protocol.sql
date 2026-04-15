-- v139_gate_pass_protocol.sql
-- Description: Implement Gate Pass management for physical asset movement

CREATE TABLE IF NOT EXISTS public.asset_gate_passes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gp_number text UNIQUE NOT NULL,
    gp_date timestamp with time zone DEFAULT now(),
    source_store_id uuid REFERENCES public.asset_stores(id),
    destination text NOT NULL,
    purpose text NOT NULL, -- 'service', 'transfer', 'disposal', 'deployment'
    carrier_name text,
    vehicle_number text,
    status text DEFAULT 'draft', -- 'draft', 'issued', 'cancelled'
    issued_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asset_gate_pass_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    gate_pass_id uuid REFERENCES public.asset_gate_passes(id) ON DELETE CASCADE,
    asset_id uuid REFERENCES public.assets(id),
    remarks text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.asset_gate_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_gate_pass_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gate passes are viewable by all authenticated users"
ON public.asset_gate_passes FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Gate pass items are viewable by all authenticated users"
ON public.asset_gate_pass_items FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Gate passes can be managed by it_admins"
ON public.asset_gate_passes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
);

CREATE POLICY "Gate pass items can be managed by it_admins"
ON public.asset_gate_pass_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin'))
);
