-- ============================================================================
-- Drop redundant indexes: a covered index is a tax on every write.
--
-- An index is not a lookup, it is a second copy of its table's rows in a
-- different order, maintained on every INSERT, UPDATE and DELETE. When a
-- second index covers the same scans — the same key columns, or a left
-- prefix of a longer index's key — the first one is paid for on every
-- write and chosen by the planner at best sometimes. None of these is a
-- correctness surface: every one of them is a plain secondary index, and
-- every scan it can serve is served by a surviving index.
--
-- The estate accumulated them the way it accumulates everything: a
-- constraint arrives with its own index, a migration writes a plain lookup
-- index beside it (or the other way around), and neither migration is the
-- one that removes the other's leftover. Measured against the applied
-- corpus, 36 plain secondary indexes are redundant:
--
--   * 20 are exact duplicates of a unique index on the same table: same
--     access method, same key columns in the same order with the same
--     options, same predicate. The unique member enforces what the plain
--     one only looks up, so the plain one is dropped and the unique one —
--     a constraint's teeth in 18 of the 20 — is kept.
--
--   * 16 are strict left prefixes of a longer index: every scan the short
--     key can serve, the long key serves, because the long key's extra
--     columns extend the left prefix rather than shortening it. None
--     carries INCLUDE columns (which the covering index would not cover),
--     and none — nor its keeper — is partial, because a predicate changes
--     the index's population entirely.
--
-- Two exclusions, measured rather than assumed:
--
--   * Primary keys are never touched: the catalog marks them, and the key
--     is the table's identity.
--   * No unique index is ever dropped. Dropping a unique index drops an
--     enforcement; a unique index duplicated by another unique index is a
--     judgment, and the audit reports it as one instead of guessing.
--
-- The drops are plain and idempotent. `DROP INDEX IF EXISTS` re-runs
-- quietly, and an in-transaction assertion requires all 36 names to be
-- gone before commit, so a partial drop fails the migration instead of
-- shipping. (No `CONCURRENTLY`: these run inside the migration's
-- transaction on a database the deploy owns, and the estate's other DDL
-- migrations are plain — a lock held for milliseconds on a schema
-- rebuild is the cost this corpus pays everywhere else.)
--
-- The permanent form of this check is the catalog audit in
-- `__tests__/contract-drift.test.ts` ("no redundant indexes survive in the
-- catalog"), which re-derives the redundant set from the catalog's
-- `definition` strings on every run and fails the build on a new pair.
-- The assertion below guards this migration's own work; the audit guards
-- the estate.
-- ============================================================================

BEGIN;

-- 20 exact duplicates of a unique index (the unique member is kept).
DROP INDEX IF EXISTS public.idx_bookmarks_forum;
DROP INDEX IF EXISTS public.idx_bookmarks_post;
DROP INDEX IF EXISTS public.idx_dct_hash_locale;
DROP INDEX IF EXISTS public.idx_email_preferences_profile_id;
DROP INDEX IF EXISTS public.idx_email_provider_health_provider;
DROP INDEX IF EXISTS public.idx_email_suppressions_email;
DROP INDEX IF EXISTS public.idx_email_templates_slug;
DROP INDEX IF EXISTS public.idx_forum_active_slug;
DROP INDEX IF EXISTS public.idx_legal_documents_type_locale;
DROP INDEX IF EXISTS public.idx_likes_challenge;
DROP INDEX IF EXISTS public.idx_likes_comment;
DROP INDEX IF EXISTS public.idx_likes_forum;
DROP INDEX IF EXISTS public.idx_likes_post;
DROP INDEX IF EXISTS public.idx_mfa_config_profile;
DROP INDEX IF EXISTS public.idx_monthly_quota_lookup;
DROP INDEX IF EXISTS public.idx_posts_active_slug;
DROP INDEX IF EXISTS public.idx_suppression_email;
DROP INDEX IF EXISTS public.idx_translation_usage_service_month;
DROP INDEX IF EXISTS public.idx_user_addresses_profile;
DROP INDEX IF EXISTS public.idx_user_rate_limits_user_key;

-- 16 strict left prefixes of a longer index (the longer index is kept).
DROP INDEX IF EXISTS public.idx_blocked_users_user_id;
DROP INDEX IF EXISTS public.idx_follows_follower;
DROP INDEX IF EXISTS public.idx_forum_author_analytics_profile;
DROP INDEX IF EXISTS public.idx_forum_bookmark_collections_profile;
DROP INDEX IF EXISTS public.idx_forum_feed_read_status_profile;
DROP INDEX IF EXISTS public.idx_forum_user_blocks_blocker;
DROP INDEX IF EXISTS public.idx_image_compressions_bucket;
DROP INDEX IF EXISTS public.idx_mentions_mentioned_profile;
DROP INDEX IF EXISTS public.idx_notification_digest_queue_user_id;
DROP INDEX IF EXISTS public.idx_notification_prefs_user;
DROP INDEX IF EXISTS public.idx_notification_prefs_user_category;
DROP INDEX IF EXISTS public.idx_post_reports_post_id;
DROP INDEX IF EXISTS public.idx_post_views_post_id;
DROP INDEX IF EXISTS public.idx_reading_progress_profile;
DROP INDEX IF EXISTS public.idx_subscriptions_profile;
DROP INDEX IF EXISTS public.idx_user_badges_profile;

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public'
    AND c.relname IN (
      'idx_bookmarks_forum', 'idx_bookmarks_post', 'idx_dct_hash_locale',
      'idx_email_preferences_profile_id', 'idx_email_provider_health_provider',
      'idx_email_suppressions_email', 'idx_email_templates_slug',
      'idx_forum_active_slug', 'idx_legal_documents_type_locale',
      'idx_likes_challenge', 'idx_likes_comment', 'idx_likes_forum',
      'idx_likes_post', 'idx_mfa_config_profile', 'idx_monthly_quota_lookup',
      'idx_posts_active_slug', 'idx_suppression_email',
      'idx_translation_usage_service_month', 'idx_user_addresses_profile',
      'idx_user_rate_limits_user_key', 'idx_blocked_users_user_id',
      'idx_follows_follower', 'idx_forum_author_analytics_profile',
      'idx_forum_bookmark_collections_profile',
      'idx_forum_feed_read_status_profile', 'idx_forum_user_blocks_blocker',
      'idx_image_compressions_bucket', 'idx_mentions_mentioned_profile',
      'idx_notification_digest_queue_user_id', 'idx_notification_prefs_user',
      'idx_notification_prefs_user_category', 'idx_post_reports_post_id',
      'idx_post_views_post_id', 'idx_reading_progress_profile',
      'idx_subscriptions_profile', 'idx_user_badges_profile'
    );

  IF n > 0 THEN
    RAISE EXCEPTION 'expected 0 redundant indexes to remain after the drop, found %', n;
  END IF;
END
$$;

COMMIT;
