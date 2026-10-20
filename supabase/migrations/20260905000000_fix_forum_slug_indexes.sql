-- Migration: Fix forum slug indexes — bleeding edge, CONCURRENTLY + dedup
-- Fixes R17 (blocking CREATE INDEX) + R18 (duplicate name/overlap) from 20260903/04
-- Keeps: full idx_forum_slug, partial idx_forum_active_slug, unique uc_forum_published_slug
-- Drops: duplicate partial idx_forum_slug WHERE forum_published=true (same name as full, never created)

-- Drop blocking indexes from 20260903 (non-CONCURRENTLY) if they exist as non-concurrent
DROP INDEX CONCURRENTLY IF EXISTS public.idx_forum_slug;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_forum_active_slug;

-- Recreate correctly CONCURRENTLY (avoids ShareLock on prod forum)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_slug ON public.forum (slug);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_active_slug ON public.forum (slug) WHERE forum_published = true;

-- Ensure unique constraint exists CONCURRENTLY (idempotent from 20260904)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uc_forum_published_slug ON public.forum (slug) WHERE forum_published = true;

-- Cleanup: if a partial duplicate with same name somehow exists under different predicate, drop it
-- (There should be no idx_forum_published_slug; if future duplicate appears, drop it to keep unique as lookup)
DROP INDEX CONCURRENTLY IF EXISTS public.idx_forum_published_slug;

COMMENT ON INDEX public.idx_forum_slug IS 'Full slug lookup, CONCURRENTLY — fixed 20260905';
COMMENT ON INDEX public.idx_forum_active_slug IS 'Partial forum_published slug, CONCURRENTLY — fixed 20260905';
