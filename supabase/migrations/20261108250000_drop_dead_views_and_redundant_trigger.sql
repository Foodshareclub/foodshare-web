-- ============================================================================
-- Drop the views no code reads, and the trigger that fires nothing new.
--
-- A view dies the same way an orphan trigger function does: the code that
-- read it gets rewritten — against the base table, or a newer view — and
-- the view stays in the catalog, a surface that reads like data exists.
-- Nine relations in the baseline estate are exactly that: seven views and
-- two materialized views whose names appear in no edge function, no worker
-- query, no operational script, no post-baseline migration, no cron job,
-- and no client checkout.
--
-- Two of them are unread by definition, not merely unused. `mv_user_stats`
-- and `user_email_health` were created `WITH NO DATA` and never populated —
-- `pg_matviews.ispopulated` is false for both — so any live reader would
-- crash with "materialized view has not been populated". Either the reader
-- was removed before it ever ran, or it never existed; both matviews are
-- aggregate projections the estate's code computes from the base tables
-- instead.
--
-- `pending_automation_emails` is the clearest case: the automation drip
-- queue was rebuilt as the real `email_automation_queue` table, and
-- `claim_automation_queue` / `preview_automation_queue` operate on that
-- table alone. The view is the queue's ghost from before the rebuild.
--
-- Measured, not assumed, before a single drop:
--
--   * No function, index, policy or other view depends on any of the nine:
--     the only entries in `pg_depend` for their oids are each object's own
--     row type and its own rewrite rule (plus the toast tables of the two
--     matviews). An RPC that read one of them would appear there.
--   * No cron job command references a name; the audit test
--     ("contract: no view in the catalog has no live code reference")
--     re-derives the dead set from the catalog against the code on every
--     run, so a view that outlives this migration fails the build.
--   * The keeper views — `posts_with_location`, `profiles_public`, the five
--     `analytics_full_*` views and `vector_type_substituted` — are read by
--     production code and stay. The in-transaction assertion below names
--     them so a drop that reaches too far aborts the migration.
--
-- The redundant trigger on `profiles` is the same class of residue. Since
-- the baseline, two AFTER INSERT triggers on the table execute two
-- *identical* functions, one row at a time: `create_profile_stats` and
-- `create_profile_stats_on_profile_insert`, both
-- `INSERT INTO profile_stats (profile_id) VALUES (NEW.id) ON CONFLICT
-- (profile_id) DO NOTHING`. Trigger order is by name, so
-- `on_profile_created` wins the insert and the clone always takes the
-- conflict path — a second trigger that does nothing, on every insert,
-- forever. Dropping it changes no behaviour: the surviving handler and its
-- trigger are untouched, and the clone has no caller outside the trigger
-- that carried it.
--
-- The drops are plain and idempotent. `DROP VIEW IF EXISTS`,
-- `DROP MATERIALIZED VIEW IF EXISTS`, `DROP TRIGGER IF EXISTS` and
-- `DROP FUNCTION IF EXISTS` re-run against an already-clean estate as
-- notices, and the assertion below still holds, so a deploy that replays
-- the migration is safe.
-- ============================================================================

BEGIN;

-- The seven dead views.
DROP VIEW IF EXISTS public.compression_efficiency;
DROP VIEW IF EXISTS public.compression_stats;
DROP VIEW IF EXISTS public.image_upload_stats;
DROP VIEW IF EXISTS public.pending_automation_emails;
DROP VIEW IF EXISTS public.recent_audit_activity;
DROP VIEW IF EXISTS public.storage_costs;
DROP VIEW IF EXISTS public.top_uploaders;

-- The two matviews that were never populated.
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_stats;
DROP MATERIALIZED VIEW IF EXISTS public.user_email_health;

-- The redundant trigger and its now-orphaned clone function.
DROP TRIGGER IF EXISTS on_profile_insert_create_stats ON public.profiles;
DROP FUNCTION IF EXISTS public.create_profile_stats_on_profile_insert();

-- In-transaction assertion: the dead set is gone, the keeper set is intact,
-- and the surviving profile-stats handler is still attached.
DO $$
DECLARE
    missing integer;
    keepers integer;
BEGIN
    SELECT count(*) INTO missing
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND c.relname IN (
            'compression_efficiency', 'compression_stats',
            'image_upload_stats', 'mv_user_stats',
            'pending_automation_emails', 'recent_audit_activity',
            'storage_costs', 'top_uploaders', 'user_email_health'
        );
    IF missing > 0 THEN
        RAISE EXCEPTION 'dead views still present after drop: %', missing;
    END IF;

    SELECT count(*) INTO keepers
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND c.relname IN (
            'posts_with_location', 'profiles_public',
            'analytics_full_favorites', 'analytics_full_listings',
            'analytics_full_reviews', 'analytics_full_rooms',
            'analytics_full_users', 'vector_type_substituted'
        );
    IF keepers <> 8 THEN
        RAISE EXCEPTION 'keeper views damaged: % of 8 intact', keepers;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        WHERE p.proname = 'create_profile_stats'
          AND p.pronamespace = 'public'::regnamespace
    ) THEN
        RAISE EXCEPTION 'the surviving profile-stats handler is gone';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'on_profile_created'
          AND c.relname = 'profiles'
    ) THEN
        RAISE EXCEPTION 'the surviving profile-stats trigger is gone';
    END IF;
END
$$;

COMMIT;
