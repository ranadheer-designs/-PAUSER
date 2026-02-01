-- Migration: Clean up duplicate content records
-- This fixes the issue of multiple content records for the same video
-- Run this in your Supabase SQL Editor

-- First, let's see the duplicates
SELECT external_id, COUNT(*) as duplicate_count 
FROM public.contents 
GROUP BY external_id 
HAVING COUNT(*) > 1;

-- Step 1: Get the "canonical" content ID for each video (the oldest one)
WITH canonical_content AS (
  SELECT DISTINCT ON (external_id) 
    id as keep_id, 
    external_id
  FROM public.contents
  ORDER BY external_id, created_at ASC
),
-- Step 2: Get all duplicates (records to delete)
duplicates AS (
  SELECT c.id as delete_id, cc.keep_id
  FROM public.contents c
  JOIN canonical_content cc ON c.external_id = cc.external_id
  WHERE c.id != cc.keep_id
)
-- Step 3: Update checkpoints to point to the canonical content
UPDATE public.checkpoints cp
SET content_id = d.keep_id
FROM duplicates d
WHERE cp.content_id = d.delete_id;

-- Step 4: Delete the duplicate content records
WITH canonical_content AS (
  SELECT DISTINCT ON (external_id) 
    id as keep_id, 
    external_id
  FROM public.contents
  ORDER BY external_id, created_at ASC
)
DELETE FROM public.contents
WHERE id IN (
  SELECT c.id
  FROM public.contents c
  JOIN canonical_content cc ON c.external_id = cc.external_id
  WHERE c.id != cc.keep_id
);

-- Step 5: Now set created_by on the remaining records
-- Replace 'YOUR_USER_ID' with your actual user ID from Authentication > Users
-- UPDATE public.contents SET created_by = 'YOUR_USER_ID' WHERE created_by IS NULL;

-- Verify: Should now show 1 record per video
SELECT id, external_id, title, created_by FROM public.contents;
