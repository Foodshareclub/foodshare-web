-- ============================================================================
-- Drop orphan trigger functions: a trigger function no trigger fires is dead.
--
-- A function that returns `trigger` is invoked by PostgreSQL only through a
-- trigger row. But it is still a *function*: it keeps its signature in
-- `pg_proc`, its grants, and its body — and an RPC call to it executes that
-- body whether or not any trigger ever fires it. The only reason an
-- unattached trigger function is harmless is that it is dormant by design,
-- and nothing in the schema records that intent, so the distinction is
-- invisible by construction.
--
-- This is how the estate got here: rewrites in this corpus replace trigger
-- behavior in place — a new function plus `DROP TRIGGER` / `ADD TRIGGER` —
-- and a generation of those rewrites never dropped the function they
-- replaced. Measured against the applied corpus, 30 public functions return
-- `trigger` that no trigger row references. They cover the whole surface of
-- the rewrite era: like-counter maintenance, post views, reputation and
-- activity awards, coordinate and geocode updates, room management, user
-- stats and ratings, avatar sync, locale-to-Redis sync, and signup
-- automation. The live behavior each one used to carry is present in the
-- attached triggers (105 trigger rows, every one resolving to an existing
-- function) or in the functions that replaced them; nothing here is the
-- last copy of its behavior.
--
-- Safety was measured, not assumed, before a single drop:
--
--   * No trigger row references any of the 30 (the defining property).
--   * No call site exists anywhere: a walk of the migration corpus, the
--     edge functions, and the Rust services finds no `SELECT`, `PERFORM`,
--     or RPC invocation of any of the names.
--   * None is reachable by `anon` or `authenticated`: no EXECUTE grant
--     survives, so there is no RPC surface to withdraw either.
--
-- One helper goes with them: `geocode_and_update_location(integer)` returns
-- `void`, is not a trigger function, and is not covered by the orphan check
-- a catalog can run. It is dropped here because its only caller is the
-- trigger overload of the same name dropped below; the same call-site walk
-- found no other use.
--
-- The drops are plain: no `CASCADE`. If any object depends on one of these
-- functions — a dependency the walk above missed — the drop fails and the
-- migration aborts, which is the outcome the estate wants: a finding to
-- read, not collateral to clean up. (The lesson is the W15a one, applied
-- to a different DDL: a repair must not widen its own blast radius.)
--
-- Guard: after the drops, the orphan set must be empty. The assertion runs
-- inside the transaction, so a predicate mistake (dropping the wrong
-- functions, or too few) fails the migration rather than shipping a
-- partially repaired estate. Re-runs are safe: `IF EXISTS` on every drop,
-- and the assertion holds on an already-repaired database.
--
-- The permanent form of this check is the catalog audit in
-- `__tests__/contract-drift.test.ts` ("every trigger function is attached
-- to a trigger"), which reads the `triggers` surface added to the catalog
-- by this same change and fails the build on any orphan that re-enters.
-- ============================================================================

BEGIN;

-- The 30 orphan trigger functions, in the order the catalog audit reports
-- them. All take no arguments.
DROP FUNCTION IF EXISTS public.call_update_locations();
DROP FUNCTION IF EXISTS public.call_update_post_coordinates();
DROP FUNCTION IF EXISTS public.check_for_duplicate_like();
DROP FUNCTION IF EXISTS public.create_default_bookmark_collection();
DROP FUNCTION IF EXISTS public.geocode_and_update_location();
DROP FUNCTION IF EXISTS public.handle_new_user_notifications();
DROP FUNCTION IF EXISTS public.handle_new_user_to_address();
DROP FUNCTION IF EXISTS public.handle_post_delete();
DROP FUNCTION IF EXISTS public.insert_creator_into_room();
DROP FUNCTION IF EXISTS public.manage_post_like_counter();
DROP FUNCTION IF EXISTS public.on_post_user_unliked();
DROP FUNCTION IF EXISTS public.post_views_trigger_func();
DROP FUNCTION IF EXISTS public.prevent_duplicate_rooms_insert();
DROP FUNCTION IF EXISTS public.prevent_duplicate_rooms_insert_function();
DROP FUNCTION IF EXISTS public.sync_locale_to_redis();
DROP FUNCTION IF EXISTS public.trg_award_post_reputation();
DROP FUNCTION IF EXISTS public.trg_record_post_activity();
DROP FUNCTION IF EXISTS public.trigger_post_translation();
DROP FUNCTION IF EXISTS public.trigger_signup_automation();
DROP FUNCTION IF EXISTS public.trigger_sync_post_like_counter();
DROP FUNCTION IF EXISTS public.trigger_update_coordinates();
DROP FUNCTION IF EXISTS public.trigger_update_user_rating();
DROP FUNCTION IF EXISTS public.update_avatar_url_on_storage_upload();
DROP FUNCTION IF EXISTS public.update_bookmark_collection_count();
DROP FUNCTION IF EXISTS public.update_comment_likes_count();
DROP FUNCTION IF EXISTS public.update_generated_full_address();
DROP FUNCTION IF EXISTS public.update_lat_lon();
DROP FUNCTION IF EXISTS public.update_post_views();
DROP FUNCTION IF EXISTS public.update_room_on_new_message();
DROP FUNCTION IF EXISTS public.update_user_stats_on_post();

-- Its only caller, dropped above. The argument list disambiguates it from
-- the overload that was the orphan itself.
DROP FUNCTION IF EXISTS public.geocode_and_update_location(integer);

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
  FROM pg_proc p
  JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public'
    AND p.prorettype = 'trigger'::regtype
    AND NOT EXISTS (SELECT 1 FROM pg_trigger tr WHERE tr.tgfoid = p.oid);

  IF n > 0 THEN
    RAISE EXCEPTION 'expected 0 orphan trigger functions after the drop, found %', n;
  END IF;
END
$$;

COMMIT;
