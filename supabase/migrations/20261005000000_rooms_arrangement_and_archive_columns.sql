-- The `rooms` table is missing three columns its own application code writes.
--
-- `api-v1-chat/lib/food-chat.ts` updates `post_arranged_at` when a listing is
-- arranged, and `is_archived` / `archived_at` when a room is archived. None of
-- the three exists, so PostgREST rejected those updates outright: the arrange
-- update failed even though it also set the real `post_arranged_to`, and
-- archiving silently did nothing while the handler returned
-- `{ success: true }`.
--
-- The code is the specification here. The table is behind it, in the same
-- direction as the `device_attestations` drift in
-- 20261002000000_device_attestations_schema_contract.sql: the handlers were
-- written against columns that no migration ever created.
--
-- Additive and idempotent, so this is a no-op against a database that already
-- has them and a fix against one that does not. `is_archived` is NOT NULL
-- with a `false` default so the room list's `.eq("is_archived", false)` filter
-- matches every existing row rather than excluding them for a NULL.
--
-- No backfill is needed for a boolean default, and `post_arranged_at` /
-- `archived_at` are legitimately NULL for rooms that have not been arranged
-- or archived.

ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS post_arranged_at timestamptz,
    ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- Read back from the catalog rather than trusting the ALTER: a column added
-- against a database that already had it is a no-op, and the failure this
-- exists to prevent is the handlers writing a column that is not there.
DO $$
DECLARE
    column_names text[];
    needed_column text;
BEGIN
    SELECT array_agg(column_name ORDER BY column_name)
      INTO column_names
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'rooms';

    FOREACH needed_column IN ARRAY ARRAY['post_arranged_at', 'is_archived', 'archived_at']
    LOOP
        IF NOT (column_names && ARRAY[needed_column]) THEN
            RAISE EXCEPTION
                'rooms.% is missing; api-v1-chat writes it and PostgREST rejects the whole update',
                needed_column;
        END IF;
    END LOOP;

    -- `is_archived` must be NOT NULL: the room list filters on
    -- `.eq("is_archived", false)`, and a NULL column would exclude every
    -- pre-existing row from the list.
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'rooms'
          AND column_name = 'is_archived'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION
            'rooms.is_archived must be NOT NULL; a NULL would drop every existing room out of the filtered list';
    END IF;
END
$$;
