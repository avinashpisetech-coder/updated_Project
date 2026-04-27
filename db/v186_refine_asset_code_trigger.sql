-- v186_refine_asset_code_trigger.sql
-- Description: Refine generate_asset_code trigger to only populate if asset_code is NULL.

CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TRIGGER AS $$
DECLARE
    prefix text;
    next_val int;
BEGIN
    -- Only generate if asset_code is not provided (manual override)
    IF NEW.asset_code IS NULL OR NEW.asset_code = '' THEN
        SELECT code_prefix INTO prefix FROM public.asset_sub_types WHERE id = NEW.sub_type_id;
        
        -- Get next numeric value for this sub-type
        SELECT count(*) + 1 INTO next_val FROM public.assets WHERE sub_type_id = NEW.sub_type_id;
        
        NEW.asset_code := 'IT-' || COALESCE(prefix, 'GEN') || '-' || LPAD(next_val::text, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
