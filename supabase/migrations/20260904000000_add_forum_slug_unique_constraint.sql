-- Migration: Add unique constraint on forum slug (per active published post)
-- Ensures one slug per published forum post, preventing URL conflicts

-- Partial unique constraint: one slug per published forum post
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uc_forum_published_slug ON public.forum (slug) WHERE forum_published = true;

-- Index for slug lookups (CONCURRENTLY to avoid blocking production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_slug ON public.forum (slug) WHERE forum_published = true;

-- Partial index for active forum posts only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_active_slug ON public.forum (slug) WHERE is_active = true;

COMMENT ON INDEX public.uc_forum_published_slug IS 'Ensures one slug per published forum post (10x pro)';