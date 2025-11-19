-- Supabase Storage Setup for Appraisal Images
-- Run this in Supabase SQL Editor
-- This creates an optimized storage bucket with user-specific folders

-- Create storage bucket for appraisal images
-- Set to public for read access, but uploads are user-specific
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appraisal-images',
  'appraisal-images',
  true, -- Public read access for sharing
  52428800, -- 50MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Policy: Authenticated users can upload images to their own folder
-- Path format: {user_id}/{appraisal_id}/{filename}
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appraisal-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read their own images
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'appraisal-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Public can read images (for sharing appraisals)
-- This allows public URLs to work without authentication
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'appraisal-images');

-- Policy: Users can update their own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'appraisal-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'appraisal-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'appraisal-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Drop old policies if they exist (for migration)
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
