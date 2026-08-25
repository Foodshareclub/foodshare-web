-- Migration: Backfill default images for foodbanks and community fridges
-- Purpose: Ensure that all foodbanks and community fridges have an image for UI presentation.

-- Update Foodbanks that have no images
UPDATE public.posts
SET images = ARRAY['/placeholders/foodbank.jpg']::text[]
WHERE post_type = 'foodbank' 
  AND (images IS NULL OR array_length(images, 1) = 0);

-- Update Community Fridges that have no images
UPDATE public.posts
SET images = ARRAY['/placeholders/fridge.jpg']::text[]
WHERE post_type = 'fridge' 
  AND (images IS NULL OR array_length(images, 1) = 0);
