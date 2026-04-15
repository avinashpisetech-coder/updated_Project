-- v159_fix_po_item_indents_rls.sql
-- Description: Add missing SELECT policy on po_item_indents so GRN creation
-- can read indent links. Without this, the Supabase join returns nothing,
-- making the GRN item matrix appear empty even when PO line items exist.

BEGIN;

-- Grant SELECT to all authenticated users (read-only, safe)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'po_item_indents' 
          AND policyname = 'Read po item indents'
    ) THEN
        CREATE POLICY "Read po item indents" 
        ON public.po_item_indents 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Also ensure the manage policy exists for admins (INSERT/UPDATE/DELETE)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'po_item_indents' 
          AND policyname = 'Admin manage po item indents'
    ) THEN
        CREATE POLICY "Admin manage po item indents" 
        ON public.po_item_indents 
        FOR ALL 
        TO authenticated 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                  AND role::text IN ('super_admin', 'it_admin', 'procurement_admin')
            )
        );
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
