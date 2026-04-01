-- v047_setup_storage_buckets.sql
-- Create storage bucket for ticket attachments and set up security policies

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'ticket-attachments', 'ticket-attachments', false, 10485760, ARRAY['image/*', 'application/pdf', 'text/plain', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'ticket-attachments'
);

-- 2. Enable object-level security
-- Enable RLS for storage.objects if not already enabled (though typically enabled globally)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies for the 'ticket-attachments' bucket

-- A. SELECT: Users can view files if they are the requester, creator, or assigned to the ticket
CREATE POLICY "Users can view own ticket attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM tickets 
      WHERE requester_id = auth.uid() 
      OR created_by_id = auth.uid() 
      OR assigned_to_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin', 'module_agent')
      )
    )
  )
);

-- B. INSERT: Authenticated Agents/Admins/Requesters can upload to their ticket's folder
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments' AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM tickets 
      WHERE requester_id = auth.uid() 
      OR created_by_id = auth.uid() 
      OR assigned_to_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin', 'module_agent')
      )
    )
  )
);

-- C. DELETE: Only Admins or the uploader can delete
CREATE POLICY "Admins or uploaders can delete ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments' AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'dept_admin')
    )
  )
);
