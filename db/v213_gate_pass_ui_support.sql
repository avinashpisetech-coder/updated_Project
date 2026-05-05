-- v213_gate_pass_ui_support.sql
-- Description: Ensure gate pass table is complete and accessible for UI

BEGIN;

-- Ensure the gate pass table exists with all required columns
CREATE TABLE IF NOT EXISTS public.asset_gate_passes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_pass_number text UNIQUE NOT NULL,
    asset_id uuid NOT NULL REFERENCES public.assets(id),
    movement_type text NOT NULL CHECK (movement_type IN ('outward', 'inward', 'internal')),
    purpose text NOT NULL,
    carrier_name text,
    carrier_contact text,
    vehicle_number text,
    from_location text NOT NULL,
    to_location text NOT NULL,
    authorized_by uuid REFERENCES public.profiles(id),
    custodian_id uuid REFERENCES public.profiles(id),
    expected_return_date date,
    actual_return_date date,
    status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    remarks text,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.asset_gate_passes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gate pass read" ON public.asset_gate_passes;
CREATE POLICY "Gate pass read" ON public.asset_gate_passes
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Gate pass write" ON public.asset_gate_passes;
CREATE POLICY "Gate pass write" ON public.asset_gate_passes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Auto-increment gate pass number
CREATE OR REPLACE FUNCTION public.generate_gate_pass_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_seq int;
BEGIN
    SELECT COALESCE(MAX(CAST(SPLIT_PART(gate_pass_number, '-', 2) AS int)), 0) + 1
    INTO v_seq
    FROM public.asset_gate_passes
    WHERE gate_pass_number LIKE 'GP-%';
    
    NEW.gate_pass_number := 'GP-' || LPAD(v_seq::text, 5, '0');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gate_pass_number ON public.asset_gate_passes;
CREATE TRIGGER trg_gate_pass_number
    BEFORE INSERT ON public.asset_gate_passes
    FOR EACH ROW
    WHEN (NEW.gate_pass_number IS NULL OR NEW.gate_pass_number = '')
    EXECUTE FUNCTION public.generate_gate_pass_number();

COMMIT;
