-- Supabase Storage Bucket Setup for AWSIMPACTX
-- Run this in your Supabase SQL Editor

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'AWSIMPACTX',
  'AWSIMPACTX',
  true,  -- Set to true for public access, false for private
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage policies for the bucket

-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'AWSIMPACTX');

-- Allow authenticated uploads (or use anon for public uploads)
CREATE POLICY "Allow uploads" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'AWSIMPACTX');

-- Allow updates to own files
CREATE POLICY "Allow updates" ON storage.objects
FOR UPDATE
USING (bucket_id = 'AWSIMPACTX');

-- Allow deletes
CREATE POLICY "Allow deletes" ON storage.objects
FOR DELETE
USING (bucket_id = 'AWSIMPACTX');

-- Alternative: If you want completely public access (no auth required)
-- Uncomment the following and comment out the policies above:

/*
-- Drop existing policies first
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;

-- Create permissive policies for development
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'AWSIMPACTX');

CREATE POLICY "Public upload access" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'AWSIMPACTX');

CREATE POLICY "Public update access" ON storage.objects
FOR UPDATE TO anon, authenticated
USING (bucket_id = 'AWSIMPACTX');

CREATE POLICY "Public delete access" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'AWSIMPACTX');
*/
