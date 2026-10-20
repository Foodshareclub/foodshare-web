-- Two columns the application writes and no migration created, and one view
-- that has fallen behind the table it projects.
--
-- Every statement here is a defect the schema oracle found and the code
-- confirms. See `docs/oracle.md` § What it found.
--
-- `attname LIKE` style auditing is not how these were found: a column that no
-- migration creates is invisible to anything that reads the migrations, because
-- the migrations are what it would be reading.

BEGIN;

-- =============================================================================
-- 1. `profiles.ban_reason`
-- =============================================================================
-- `api-v1-admin/lib/users.ts` bans a user with
--
--   .from("profiles").update({ is_active: false, ban_reason: input.reason })
--
-- and `profiles` has neither... it has `is_active` but not `ban_reason`.
-- PostgREST rejects an entire statement when one key is unknown, so the whole
-- UPDATE failed: not just the reason, but `is_active: false` alongside it. The
-- ban did not take effect, the posts deactivation below it did not either, and
-- the endpoint answered `{ success: true, banned: true }` having changed
-- nothing. An admin-visible control with a success response and no effect.
--
-- The column is added rather than the call corrected because the intent is
-- unambiguous and already expressed three times over — the call site, the
-- `banUserSchema` that requires `reason`, and the admin action log that records
-- it. Only the storage was missing.
--
-- Nullable: a user who has never been banned has no reason, and the column has
-- no default because an empty string would be indistinguishable from a real
-- (if uninformative) reason.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'ban_reason'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN ban_reason text DEFAULT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.ban_reason IS
  'Why an administrator banned this profile. NULL when the profile has never '
  'been banned. Written by the admin ban endpoint; the ban itself is '
  '`is_active = false`, so an empty reason is a valid state and must not be '
  'read as "not banned".';

-- =============================================================================
-- 2. `posts_with_location` is missing two columns `posts` has
-- =============================================================================
-- The view projects `posts` with an explicit column list, and the list was
-- written before `post_arranged_at` and `post_like_counter` existed on `posts`.
-- Both were added later by other migrations and the view was never brought up to
-- date, because nothing in the migration history says the view has to track the
-- table.
--
-- `api-v1-analytics/lib/sync.ts` reads both from the view:
--
--   .from("posts_with_location").select("..., post_arranged_at, post_like_counter")
--
-- so its entire sync — the MotherDuck analytics export — has been failing. The
-- caller checks `error`, so this one fails loudly, which is why it was
-- survivable: the dashboard's analytics simply never updated.
--
-- The view is recreated with its definition *verbatim* and the two columns
-- appended, rather than rewritten from intent. That is not fastidiousness: an
-- earlier draft of this migration reconstructed the view from the first 300
-- characters of `pg_get_viewdef` and would have dropped thirteen of its
-- thirty-two columns along with its `WHERE is_active = true` filter — turning a
-- view that returns active posts into one that returns deleted ones. The full
-- definition is below precisely because the truncated one is what a reader is
-- tempted to copy.
--
-- The new columns go at the *end* for a mechanical reason:
-- `CREATE OR REPLACE VIEW` may only append to a view's column list, and
-- inserting in the middle is an error ("cannot drop columns from view"). The
-- alternative — `DROP VIEW` then `CREATE` — would work and would also discard
-- the view's grants, which is a far worse trade for a column reordering nobody
-- depends on, since nothing can select a view's columns by position.
CREATE OR REPLACE VIEW public.posts_with_location
WITH (security_invoker = true) AS
  SELECT id,
    post_name,
    post_description,
    post_type,
    post_address,
    post_stripped_address,
    quantity,
    pickup_time,
    is_active,
    is_arranged,
    created_at,
    updated_at,
    profile_id,
    images,
    post_views,
    location,
    location_json,
    extensions.st_y(location::extensions.geometry) AS latitude,
    extensions.st_x(location::extensions.geometry) AS longitude,
    category_id,
    tags,
    metadata,
    fridge_id,
    has_pantry,
    available_hours,
    location_type,
    condition,
    post_slug,
    post_slug AS slug,
    concat(id::text, '-', post_slug) AS canonical_slug,
    sync_version,
    expires_at,
    version,
    -- Added 2026-10. `posts` has carried both for longer than the view has been
    -- written; the view had not caught up, and nothing in the migration history
    -- said it had to.
    post_arranged_at,
    post_like_counter
   FROM posts p
  WHERE is_active = true;

-- =============================================================================
-- 3. `translation_analytics.delta_sync`
-- =============================================================================
-- `api-v1-localization/handlers/translations.ts` records, for every translation
-- it serves, whether the answer was produced by an incremental delta rather than
-- a full pass:
--
--   .from("translation_analytics").insert({ ..., cached, delta_sync })
--
-- and the table has `cached` but no `delta_sync`, so every such insert fails.
-- The call is inside a `try` whose body is otherwise empty and whose comment
-- says the analytics are best-effort, so it fails silently by design — which is
-- correct for analytics and is why nobody noticed that the one field
-- distinguishing a delta from a full pass has never once been recorded.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'translation_analytics'
      AND column_name = 'delta_sync'
  ) THEN
    ALTER TABLE public.translation_analytics
      ADD COLUMN delta_sync boolean NOT NULL DEFAULT false;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Verification
-- =============================================================================
-- The deploy fails rather than reporting success if any of the three did not
-- take. Each is `IF NOT EXISTS`-guarded above, so a re-run is a no-op — which
-- means a guarded ALTER that silently did nothing is the failure mode this
-- block exists to catch.
-- The view is checked for *keeping* its columns, not only for gaining two.
-- A `CREATE OR REPLACE VIEW` that loses a column is legal SQL and a silent
-- outage for every caller that read it, and this file's own earlier draft was
-- one keystroke away from shipping exactly that.
DO $$
DECLARE
  lost text;
BEGIN
  SELECT string_agg(c, ', ') INTO lost FROM unnest(ARRAY[
    'id', 'post_name', 'post_description', 'post_type', 'post_address',
    'post_stripped_address', 'quantity', 'pickup_time', 'is_active',
    'is_arranged', 'created_at', 'updated_at', 'profile_id', 'images',
    'post_views', 'location', 'location_json', 'latitude', 'longitude',
    'category_id', 'tags', 'metadata', 'fridge_id', 'has_pantry',
    'available_hours', 'location_type', 'condition', 'post_slug', 'slug',
    'canonical_slug', 'sync_version', 'expires_at', 'version'
  ]) AS t(c)
  WHERE c NOT IN (
    SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = 'public.posts_with_location'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
  );

  IF lost IS NOT NULL THEN
    RAISE EXCEPTION
      'posts_with_location lost columns: %. The view definition was rewritten '
      'in error; restore it from the catalog rather than from this file.', lost;
  END IF;

  -- And the filter, which is the difference between a view of active posts and
  -- a view of every post including the soft-deleted ones.
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'posts_with_location'
      AND definition LIKE '%WHERE%is_active%'
  ) THEN
    RAISE EXCEPTION
      'posts_with_location no longer filters on is_active. Returning soft-'
      'deleted rows from a public view is worse than the missing columns this '
      'migration set out to add.';
  END IF;
END $$;

DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(x, ', ') INTO missing FROM unnest(ARRAY[
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles'
        AND column_name='ban_reason'
    ) THEN NULL ELSE 'profiles.ban_reason' END,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='translation_analytics'
        AND column_name='delta_sync'
    ) THEN NULL ELSE 'translation_analytics.delta_sync' END,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='posts_with_location'
        AND column_name='post_arranged_at'
    ) THEN NULL ELSE 'posts_with_location.post_arranged_at' END,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='posts_with_location'
        AND column_name='post_like_counter'
    ) THEN NULL ELSE 'posts_with_location.post_like_counter' END
  ]) AS t(x) WHERE x IS NOT NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'migration 20261012000000 did not fully apply; missing: %', missing;
  END IF;
END $$;
