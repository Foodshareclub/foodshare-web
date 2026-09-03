-- Migration: Add index on forum.slug for slug-based lookups
-- Ensures fast lookups when checking slug uniqueness and resolving forum URLs

-- Index for slug lookups (to avoid blocking production)
CREATE INDEX IF NOT EXISTS idx_forum_slug ON public.forum (slug);

-- Partial index for active forum posts only
CREATE INDEX IF NOT EXISTS idx_forum_active_slug ON public.forum (slug) WHERE is_active = true;
