-- v102_sync_po_sequences.sql
-- Description: Synchronize the PO sequence registry with actual data to resolve duplicate key violations and refine trigger logic.

DO $$
DECLARE
    r RECORD;
    v_max_id integer;
    v_fy_prefix text;
BEGIN
    -- 1. Sync existing sequences in asset_purchase_sequences table
    FOR r IN (SELECT fiscal_year FROM public.asset_purchase_sequences)
    LOOP
        v_fy_prefix := 'PO/FY' || r.fiscal_year || '/%';
        
        SELECT MAX((regexp_match(po_number, '([0-9]{4})$'))[1]::integer)
        INTO v_max_id
        FROM public.asset_purchases
        WHERE po_number LIKE v_fy_prefix;

        IF v_max_id IS NOT NULL THEN
            UPDATE public.asset_purchase_sequences
            SET last_number = v_max_id,
                updated_at = now()
            WHERE fiscal_year = r.fiscal_year;
        END IF;
    END LOOP;

    -- 2. Identify missing fiscal years from asset_purchases that aren't in sequences
    -- This handles the case where data exists but the sequence table is empty for that FY
    FOR r IN (
        SELECT DISTINCT substring(po_number from 'FY([0-9]{2}-[0-9]{2})') as fy
        FROM public.asset_purchases
        WHERE po_number LIKE 'PO/FY%'
    )
    LOOP
        IF r.fy IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.asset_purchase_sequences WHERE fiscal_year = r.fy) THEN
            SELECT MAX((regexp_match(po_number, '([0-9]{4})$'))[1]::integer)
            INTO v_max_id
            FROM public.asset_purchases
            WHERE po_number LIKE 'PO/FY' || r.fy || '/%';

            IF v_max_id IS NOT NULL THEN
                INSERT INTO public.asset_purchase_sequences (fiscal_year, last_number, updated_at)
                VALUES (r.fy, v_max_id, now());
            END IF;
        END IF;
    END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 3. REFINE TRIGGER ENGINE (PROTECT MANUALLY ASSIGNED NUMBERS)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    current_fy text;
    next_idx integer;
BEGIN
    -- If po_number is already provided and is not a placeholder/null, TRUST THE INPUT
    -- This allows the RPC (which calculates po_number on client) to work without being overwritten
    -- if the client-side calculation is correct, or if it's an amendment.
    IF NEW.po_number IS NOT NULL AND NEW.po_number != '' AND NEW.po_number NOT LIKE '%/0000' THEN
        -- Still update the sequence table to ensure next auto-generates are above this
        -- Extract numeric part if it matches pattern
        next_idx := (regexp_match(NEW.po_number, '([0-9]{4})$'))[1]::integer;
        current_fy := (regexp_match(NEW.po_number, 'FY([0-9]{2}-[0-9]{2})'))[1];
        
        IF next_idx IS NOT NULL AND current_fy IS NOT NULL THEN
            INSERT INTO public.asset_purchase_sequences (fiscal_year, last_number)
            VALUES (current_fy, next_idx)
            ON CONFLICT (fiscal_year) DO UPDATE 
            SET last_number = GREATEST(asset_purchase_sequences.last_number, next_idx),
                updated_at = now();
        END IF;
        
        RETURN NEW;
    END IF;

    -- Standard Generation Logic (if po_number is null or placeholder)
    IF (EXTRACT(MONTH FROM CURRENT_DATE) >= 4) THEN
        current_fy := TO_CHAR(CURRENT_DATE, 'YY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY');
    ELSE
        current_fy := TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CURRENT_DATE, 'YY');
    END IF;

    -- Get and Increment Sequence
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
