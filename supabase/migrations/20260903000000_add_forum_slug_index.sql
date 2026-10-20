-- Migration: Add index on forum.slug for slug-based lookups
-- Ensures fast lookups when checking slug uniqueness and resolving forum URLs

-- Index for slug lookups (to avoid blocking production)
CREATE INDEX IF NOT EXISTS idx_forum_slug ON public.forum (slug);

-- Partial index for published forum posts only (forum has forum_published, not is_active)
CREATE INDEX IF NOT EXISTS idx_forum_active_slug ON public.forum (slug) WHERE forum_published = true;
