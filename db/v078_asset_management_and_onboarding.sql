-- v078_asset_management_and_onboarding.sql
-- Phase 4: IT Asset & Stock Management + Employee Onboarding Integration
-- Aligned to PRD §7 and Architecture §4.5

-------------------------------------------------------------------------------
-- 1. ENUMS & TYPES
-------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_status') THEN
        CREATE TYPE public.asset_status AS ENUM (
            'in_stock', 'assigned', 'under_repair', 'damaged', 'written_off'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_condition') THEN
        CREATE TYPE public.asset_condition AS ENUM (
            'new', 'good', 'fair', 'damaged'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
        CREATE TYPE public.movement_type AS ENUM (
            'opening_stock', 'purchase_inward', 'handover', 'return', 'damaged', 'write_off', 'adjustment'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_direction') THEN
        CREATE TYPE public.movement_direction AS ENUM ('in', 'out');
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_reason') THEN
        CREATE TYPE public.return_reason AS ENUM (
            'employee_exit', 'end_of_loan', 'upgrade', 'voluntary', 'other'
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 2. ASSET MASTER & CONFIGURATION
-------------------------------------------------------------------------------

-- Asset sub-types (e.g. Laptop, Mobile, Monitor)
CREATE TABLE IF NOT EXISTS public.asset_sub_types (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE,
    code_prefix         text NOT NULL UNIQUE, -- e.g. 'LAP', 'MOB'
    required_fields     jsonb DEFAULT '[]', -- ['serial_number', 'os', 'ram']
    low_stock_threshold int DEFAULT 5,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- IT Asset Register
CREATE TABLE IF NOT EXISTS public.assets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_code          text UNIQUE, -- e.g. 'IT-LAP-0001'
    sub_type_id         uuid NOT NULL REFERENCES public.asset_sub_types(id),
    brand               text NOT NULL,
    model               text NOT NULL,
    serial_number       text,
    status              public.asset_status DEFAULT 'in_stock' NOT NULL,
    condition           public.asset_condition DEFAULT 'new' NOT NULL,
    purchase_date       date,
    warranty_expiry     date,
    vendor              text,
    invoice_number      text,
    unit_cost           numeric(12,2),
    specifications      jsonb DEFAULT '{}',
    current_holder_id   uuid REFERENCES public.profiles(id),
    is_written_off      boolean DEFAULT false,
    written_off_at      timestamptz,
    notes               text,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Storage for movement snapshots (Mandatory Photos)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            uuid NOT NULL REFERENCES public.assets(id),
    type                public.movement_type NOT NULL,
    direction           public.movement_direction NOT NULL,
    quantity            int DEFAULT 1 NOT NULL,
    from_user_id        uuid REFERENCES public.profiles(id), -- for handover (admin) or return (employee)
    to_user_id          uuid REFERENCES public.profiles(id),   -- for handover (employee)
    condition_before     public.asset_condition,
    condition_after      public.asset_condition,
    notes               text,
    return_reason       public.return_reason,
    vendor_invoice      text,
    total_cost          numeric(12,2),
    performed_by        uuid NOT NULL REFERENCES public.profiles(id),
    approved_by         uuid REFERENCES public.profiles(id), -- for write-off / adjustment
    expected_return_date date,
    created_at          timestamptz DEFAULT now()
);

-- Photos linked to movements (Immutable storage record)
CREATE TABLE IF NOT EXISTS public.asset_photos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id         uuid NOT NULL REFERENCES public.stock_movements(id),
    asset_id            uuid NOT NULL REFERENCES public.assets(id),
    storage_path        text NOT NULL, -- Path in Supabase storage
    uploaded_by         uuid NOT NULL REFERENCES public.profiles(id),
    created_at          timestamptz DEFAULT now()
);

-- Handover Acknowledgements (48h/72h escalation tracking)
CREATE TABLE IF NOT EXISTS public.asset_acknowledgements (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id         uuid NOT NULL REFERENCES public.stock_movements(id),
    employee_id         uuid NOT NULL REFERENCES public.profiles(id),
    acknowledged_at     timestamptz,
    token               text UNIQUE NOT NULL,
    expires_at          timestamptz NOT NULL,
    reminder_sent_at     timestamptz,
    escalation_sent_at   timestamptz,
    created_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. ONBOARDING & ACTIVITY CONFIGURATION
-------------------------------------------------------------------------------

-- Pre-defined employee onboarding bundles
CREATE TABLE IF NOT EXISTS public.onboarding_asset_config (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title               text NOT NULL, -- e.g. "Software Engineer Bundle"
    description         text,
    department_id       uuid REFERENCES public.departments(id), -- Specific dept or null for global
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- Which assets are required for this onboarding bundle
CREATE TABLE IF NOT EXISTS public.onboarding_asset_items (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id           uuid NOT NULL REFERENCES public.onboarding_asset_config(id) ON DELETE CASCADE,
    asset_sub_type_id   uuid NOT NULL REFERENCES public.asset_sub_types(id),
    quantity            int DEFAULT 1 NOT NULL,
    is_mandatory        boolean DEFAULT true,
    notes               text,
    created_at          timestamptz DEFAULT now()
);

-- Link onboarding to activity tasks (PRD §4.5)
CREATE TABLE IF NOT EXISTS public.activity_templates (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL UNIQUE, -- e.g. "New Employee Onboarding"
    trigger_modules      text[] DEFAULT '{Help Desk, HR, Admin}',
    description         text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_task_definitions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id         uuid NOT NULL REFERENCES public.activity_templates(id),
    module_id           uuid REFERENCES public.modules(id),
    title               text NOT NULL,
    description         text,
    sort_order          int DEFAULT 0,
    is_required         boolean DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 4. RLS POLICIES
-------------------------------------------------------------------------------

-- Asset Sub Types: Read for all, manage for super_admin
ALTER TABLE public.asset_sub_types ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read asset_sub_types" ON public.asset_sub_types FOR SELECT TO authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admin manage asset_sub_types" ON public.asset_sub_types FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Assets: Read for holders/agents/admin
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users read own assets" ON public.assets FOR SELECT TO authenticated USING (current_holder_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Agents and Admins read all assets" ON public.assets FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin', 'module_agent'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins manage assets" ON public.assets FOR ALL TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Stock Movements: Immutable audit log
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Read stock movements" ON public.stock_movements FOR SELECT TO authenticated USING (
        performed_by = auth.uid() OR to_user_id = auth.uid() OR from_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Insert stock movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin', 'module_agent'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Asset Photos: Truly immutable (no delete/update)
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Read asset photos" ON public.asset_photos FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Insert asset photos" ON public.asset_photos FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Asset Acknowledgements
ALTER TABLE public.asset_acknowledgements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users acknowledge own" ON public.asset_acknowledgements FOR SELECT TO authenticated USING (employee_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users update own ack" ON public.asset_acknowledgements FOR UPDATE TO authenticated USING (employee_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins read all ack" ON public.asset_acknowledgements FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin'))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-------------------------------------------------------------------------------
-- 5. SEED DATA (CORE TYPES & ONBOARDING)
-------------------------------------------------------------------------------

INSERT INTO public.asset_sub_types (name, code_prefix, required_fields) VALUES
('Laptop / Desktop', 'LAP', '["serial_number", "brand", "model", "processor", "ram", "storage", "os", "warranty_expiry"]'),
('Mobile Phone / Tablet', 'MOB', '["imei", "brand", "model", "serial_number", "os", "warranty_expiry"]'),
('Monitor / Display', 'MON', '["serial_number", "brand", "model", "screen_size", "resolution", "warranty_expiry"]'),
('Input Device', 'INP', '["brand", "model", "serial_number"]'),
('Peripheral / Accessory', 'ACC', '["brand", "model", "serial_number", "storage_capacity"]'),
('Networking Device', 'NET', '["serial_number", "device_id", "mac_address"]'),
('Power Equipment', 'PWR', '["brand", "model", "wattage", "warranty_expiry"]')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.activity_templates (name, description) VALUES
('New Employee Onboarding', 'Standard multi-department onboarding process for new joiners.'),
('Employee Exit / Offboarding', 'Clearance process for departing employees.')
ON CONFLICT (name) DO NOTHING;

-------------------------------------------------------------------------------
-- 6. TRIGGERS & AUTOMATION
-------------------------------------------------------------------------------

-- Auto-generate asset codes IT-{PREFIX}-{SERIAL_COUNTER}
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TRIGGER AS $$
DECLARE
    prefix text;
    next_val int;
BEGIN
    SELECT code_prefix INTO prefix FROM public.asset_sub_types WHERE id = NEW.sub_type_id;
    SELECT count(*) + 1 INTO next_val FROM public.assets WHERE sub_type_id = NEW.sub_type_id;
    NEW.asset_code := 'IT-' || prefix || '-' || LPAD(next_val::text, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_asset_create ON public.assets;
CREATE TRIGGER trg_on_asset_create
    BEFORE INSERT ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_asset_code();
