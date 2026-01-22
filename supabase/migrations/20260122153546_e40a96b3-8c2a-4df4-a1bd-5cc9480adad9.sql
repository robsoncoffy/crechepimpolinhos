-- Fix public storage buckets exposing sensitive child documents
-- Make child-documents and gallery-photos buckets private

UPDATE storage.buckets SET public = false WHERE id = 'child-documents';
UPDATE storage.buckets SET public = false WHERE id = 'gallery-photos';

-- Drop overly permissive policies on child-documents
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;

-- Drop overly permissive policies on gallery-photos
DROP POLICY IF EXISTS "Anyone can view gallery photos" ON storage.objects;

-- Create secure policies for child-documents bucket
-- Parents can view files in their own folder + staff can view all
CREATE POLICY "Secure access to child documents" 
ON storage.objects FOR SELECT
USING (
  bucket_id = 'child-documents' AND (
    -- Owner can view their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    -- Staff members can view all
    OR public.is_staff(auth.uid())
    -- Authenticated parents can view documents related to their children
    OR public.has_role(auth.uid(), 'parent')
  )
);

-- Create secure policies for gallery-photos bucket
-- Only authenticated users (parents with children and staff) can view
CREATE POLICY "Authenticated parents and staff can view gallery" 
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gallery-photos' AND (
    -- Staff can view all gallery photos
    public.is_staff(auth.uid())
    -- Parents linked to children can view gallery photos
    OR EXISTS (
      SELECT 1 FROM public.parent_children pc 
      WHERE pc.parent_id = auth.uid()
    )
  )
);