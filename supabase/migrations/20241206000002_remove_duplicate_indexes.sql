-- ============================================================================
-- Migration: Remove Duplicate Indexes
-- Date: 2024-12-06
-- Description: Removes duplicate indexes that waste storage and slow writes.
--              Primary keys are retained; redundant unique constraints dropped.
-- ============================================================================

-- ============================================================================
-- CORE TABLES - Remove *_id_key duplicates (keep *_pkey)
-- ============================================================================

-- posts: Keep posts_pkey, drop posts_id_key
DROP INDEX IF EXISTS public.posts_id_key;

-- forum: Keep forum_pkey, drop forum_id_key
DROP INDEX IF EXISTS public.forum_id_key;

-- profiles: Keep profiles_duplicate_pkey, drop profiles_id_key
DROP INDEX IF EXISTS public.profiles_id_key;

-- comments: Keep comments_pkey, drop comments_id_key
DROP INDEX IF EXISTS public.comments_id_key;

-- challenges: Keep challenges_pkey, drop challenges_id_key
DROP INDEX IF EXISTS public.challenges_id_key;

-- challenge_activities: Keep challenge_activities_pkey, drop challenge_activities_id_key
DROP INDEX IF EXISTS public.challenge_activities_id_key;

-- likes: Keep likes_pkey, drop likes_id_key
DROP INDEX IF EXISTS public.likes_id_key;

-- reviews: Keep reviews_pkey, drop reviews_id_key
DROP INDEX IF EXISTS public.reviews_id_key;

-- rooms: Keep rooms_pkey, drop rooms_id_key
DROP INDEX IF EXISTS public.rooms_id_key;

-- room_participants: Keep room_participants_pkey, drop room_participants_idd_key
DROP INDEX IF EXISTS public.room_participants_idd_key;

-- handlers: Keep handlers_pkey, drop handlers_id_key
DROP INDEX IF EXISTS public.handlers_id_key;

-- notifications: Keep ff_push_notifications_pkey, drop ff_push_notifications_id_key
DROP INDEX IF EXISTS public.ff_push_notifications_id_key;

-- reports: Keep reports_pkey, drop reports_id_key
DROP INDEX IF EXISTS public.reports_id_key;

-- languages: Keep languages_pkey, drop languages_id_key
DROP INDEX IF EXISTS public.languages_id_key;

-- legal: Keep legal_pkey, drop legal_id_key
DROP INDEX IF EXISTS public.legal_id_key;

-- address: Keep address_pkey, drop address_profile_id_key (same column)
DROP INDEX IF EXISTS public.address_profile_id_key;

-- ============================================================================
-- COMMENTS TABLE - Remove duplicate depth indexes
-- ============================================================================

-- idx_comments_depth and idx_comments_forum_depth are identical
-- Keep idx_comments_forum_depth (more descriptive name)
DROP INDEX IF EXISTS public.idx_comments_depth;

-- ============================================================================
-- VERIFICATION QUERY (run manually to verify)
-- ============================================================================

/*
-- Check for remaining duplicate indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- ============================================================================
-- Add documentation comment
-- ============================================================================

COMMENT ON SCHEMA public IS 'Duplicate indexes removed on 2024-12-06. See migration 20241206000002_remove_duplicate_indexes.sql';
