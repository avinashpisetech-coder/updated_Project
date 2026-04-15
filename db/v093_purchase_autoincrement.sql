-- v093_purchase_autoincrement.sql
-- Description: Implement an automatic numbering engine for Purchase Orders (PO) in the standard FY/XXXX format.

-------------------------------------------------------------------------------
-- 1. PO SEQUENCE CONFIGURATION
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.asset_purchase_sequences (
    fiscal_year         text PRIMARY KEY, -- e.g. '26-27'
    last_number         integer DEFAULT 0 NOT NULL,
    updated_at          timestamptz DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. PO NUMBER GENERATOR FUNCTION
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    current_fy text;
    next_idx integer;
BEGIN
    -- Determine Current Fiscal Year (assuming April to March)
    -- If Month >= 4 (April), then FY is current_year(last 2) - next_year(last 2)
    -- Else FY is last_year(last 2) - current_year(last 2)
    IF (EXTRACT(MONTH FROM CURRENT_DATE) >= 4) THEN
        current_fy := TO_CHAR(CURRENT_DATE, 'YY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY');
    ELSE
        current_fy := TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CURRENT_DATE, 'YY');
    END IF;

    -- Get and Increment Sequence for current FY
    INSERT INTO public.asset_purchase_sequences (fiscal_year, last_number)
    VALUES (current_fy, 1)
    ON CONFLICT (fiscal_year) DO UPDATE 
    SET last_number = asset_purchase_sequences.last_number + 1,
        updated_at = now()
    RETURNING last_number INTO next_idx;

    -- Format: PO/FY26-27/0001
    NEW.po_number := 'PO/FY' || current_fy || '/' || LPAD(next_idx::text, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 3. APPLY AUTOMATION TRIGGER
-------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS tr_auto_po_number ON public.asset_purchases;
CREATE TRIGGER tr_auto_po_number
BEFORE INSERT ON public.asset_purchases
FOR EACH ROW
EXECUTE FUNCTION public.generate_po_number();
