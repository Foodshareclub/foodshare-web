-- Migration: Fix backfill for default images
-- Purpose: array_length('{}', 1) is NULL, not 0. This fixes the previous backfill.

UPDATE public.posts
SET images = ARRAY['/placeholders/foodbank.jpg']::text[]
WHERE post_type = 'foodbank' 
  AND (images IS NULL OR cardinality(images) = 0);

UPDATE public.posts
SET images = ARRAY['/placeholders/fridge.jpg']::text[]
WHERE post_type = 'fridge' 
  AND (images IS NULL OR cardinality(images) = 0);
