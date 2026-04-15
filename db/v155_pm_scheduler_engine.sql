-- v155_pm_scheduler_engine.sql
-- Description: Preventive Maintenance (PM) scheduling engine. Allows defining recurring service intervals for assets.

BEGIN;

-- 1. PM Schedule Definitions
CREATE TABLE IF NOT EXISTS public.asset_pm_schedules (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    
    interval_days       int NOT NULL, -- e.g. 90 for quarterly
    last_service_date   date,
    next_due_date       date NOT NULL,
    
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    
    UNIQUE(asset_id) -- One schedule per asset usually
);

-- 2. RLS
ALTER TABLE public.asset_pm_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PM schedules read access" ON public.asset_pm_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage PM schedules" ON public.asset_pm_schedules FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('super_admin', 'it_admin'))
);

-- 3. Function to update next due date on maintenance completion
CREATE OR REPLACE FUNCTION public.sync_pm_schedule_on_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    -- If a maintenance is completed and it's a 'Preventive' type
    IF NEW.status = 'completed' AND NEW.request_type = 'Preventive' THEN
        UPDATE public.asset_pm_schedules
        SET 
            last_service_date = NEW.start_date,
            next_due_date = NEW.start_date::date + (interval_days * INTERVAL '1 day'),
            updated_at = now()
        WHERE asset_id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_pm_schedule
    AFTER UPDATE OF status ON public.asset_maintenance
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.sync_pm_schedule_on_maintenance();

COMMIT;
