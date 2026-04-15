-- v101_asset_attachments_protocol.sql
-- Professional Document Protocol for Purchase Orders and Goods Received Notes

-- 1. Create the Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'asset-documents', 'asset-documents', false, 20971520, ARRAY['image/*', 'application/pdf', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'asset-documents'
);

-- 2. Create the Attachments Meta-Registry
CREATE TABLE IF NOT EXISTS public.asset_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID REFERENCES public.asset_purchases(id) ON DELETE CASCADE,
    grn_id UUID REFERENCES public.asset_grns(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT attachment_parent_check CHECK (
        (purchase_id IS NOT NULL AND grn_id IS NULL) OR 
        (purchase_id IS NULL AND grn_id IS NOT NULL) OR
        (purchase_id IS NOT NULL AND grn_id IS NOT NULL) -- In case we want to link a GRN doc to its PO automatically
    )
);

-- 3. Enable RLS
ALTER TABLE public.asset_attachments ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Authenticated users can view asset documents"
ON public.asset_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload asset documents"
ON public.asset_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Owners can delete asset documents"
ON public.asset_attachments FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin')
));

-- 5. Storage Policies for 'asset-documents'
CREATE POLICY "Authenticated users can select asset-documents bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'asset-documents');

CREATE POLICY "Authenticated agents can upload to asset-documents bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'asset-documents');

CREATE POLICY "Owners can delete from asset-documents bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'asset-documents' AND (owner = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'it_admin')
)));
