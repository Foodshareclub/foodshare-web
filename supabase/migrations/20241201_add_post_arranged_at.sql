-- Add post_arranged_at field to posts table
-- This field tracks when a post was arranged/reserved

-- The field already exists in the schema, so we just need to ensure it's properly set up
-- Check if the column exists and add a comment
COMMENT ON COLUMN public.posts.post_arranged_at IS 'Timestamp when the post was arranged/reserved with someone';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_post_arranged_at ON public.posts(post_arranged_at) WHERE post_arranged_at IS NOT NULL;

-- Update RLS policies to ensure users can see when posts are arranged
-- (No changes needed as existing policies already handle this)
