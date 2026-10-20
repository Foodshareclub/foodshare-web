-- Fix OSM imported foodbanks having 'food_bank' instead of 'foodbank'
UPDATE public.posts
SET post_type = 'foodbank'
WHERE post_type = 'food_bank';
