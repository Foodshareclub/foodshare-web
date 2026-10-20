-- Soft deletes: the `deleted_at` column the application writes and the
-- baseline's own functions filter on.
--
-- CLAUDE.md documents soft deletes on posts, profiles, forum, challenges,
-- rooms and comments. The application honours that today by writing the
-- column itself — `api-v1-forum/lib/forum-service.ts` and
-- `comment-service.ts` both `.update({ deleted_at: new Date().toISOString() })`
-- and there is no hard `DELETE` against these tables anywhere in the
-- migrations. The baseline's SQL functions filter on it too:
-- `get_my_profile`, `get_profile_view` and `get_user_settings` all read
-- `deleted_at IS NULL`.
--
-- No migration creates it. It is defined only on `forum_messages` and
-- `orphaned_storage_cleanup`, which are unrelated. So the repository cannot
-- reproduce the schema its own code and functions depend on, and this
-- closes that gap.
--
-- Deliberately nullable with no default. Every existing row is live, and
-- `deleted_at IS NULL` is how "live" is expressed — a default of
-- `now()`-on-backfill would mark the entire table deleted.
--
-- No trigger is needed, and adding one would be wrong: the application sets
-- the column explicitly, so the semantics are already decided by the callers.
-- A trigger would be a second, competing source of truth.
--
-- Idempotent, so this is a no-op against a database that already has the
-- column and a fix against one that does not.

ALTER TABLE public.posts      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.forum      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.rooms      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.comments   ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- Read back from the catalog rather than trusting the ALTER. The failure
-- this prevents is quiet and severe in the other direction: a soft-delete
-- column that is missing turns `.update({ deleted_at })` into a rejected
-- statement, so a delete that reports success removes nothing and leaves the
-- row visible forever.
DO $$
DECLARE
    tables_with_column text[];
    needed text;
BEGIN
    SELECT array_agg(table_name ORDER BY table_name)
      INTO tables_with_column
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND column_name = 'deleted_at';

    FOREACH needed IN ARRAY
        ARRAY['posts', 'profiles', 'forum', 'challenges', 'rooms', 'comments']
    LOOP
        IF NOT (tables_with_column && ARRAY[needed]) THEN
            RAISE EXCEPTION
                'public.% has no deleted_at; soft deletes on that table are rejected by PostgREST',
                needed;
        END IF;
    END LOOP;
END
$$;
