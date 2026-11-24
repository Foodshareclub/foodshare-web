-- ============================================================================
-- Drop the one enum no column and no code owns.
--
-- `public.location_status` was owned by `address.location_status`, which the
-- dead-column wave dropped. A type nothing binds and nothing selects is
-- residue: `contract-drift.test.ts`'s enum check enumerates every owned
-- type and asserts the set of those that own no live column, so this one
-- fails until it is dropped.
--
-- The rest are keepers with evidence — continents (countries.code),
-- notification_category (notification_digest_queue.category and
-- notification_preferences.category), notification_channel
-- (notification_preferences.channel) and post_activity_type
-- (post_activity_logs.activity_type) all own columns code still selects —
-- and the in-transaction assertion below checks each owner exists rather
-- than trusting this list.
--
-- `DROP TYPE` has no replay-safe IF EXISTS guard, so the drop runs from a
-- list that skips absent types with a notice; replaying this migration
-- stays safe and the keeper check below still runs.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    list text[] := ARRAY[
        'public.location_status'
    ];
    parts text[];
    keepers integer := 0;
    survivors integer := 0;
    t text;
    k text;
    kparts text[];
BEGIN
    FOREACH t IN ARRAY list LOOP
        EXECUTE format(
            'DROP TYPE IF EXISTS %I.%I',
            (string_to_array(t, '.'))[1],
            (string_to_array(t, '.'))[2]
        );
        RAISE NOTICE 'dropped type %', t;
    END LOOP;

    -- Keepers: each relation.column whose type a query still selects.
    FOREACH k IN ARRAY ARRAY[
        'public|countries|continent',
        'public|notification_digest_queue|category',
        'public|notification_preferences|category',
        'public|notification_preferences|channel',
        'public|post_activity_logs|activity_type'
    ] LOOP
        kparts := string_to_array(k, '|');
        IF EXISTS (
            SELECT 1
            FROM pg_attribute a
            JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_type ty ON ty.oid = a.atttypid
            WHERE n.nspname = kparts[1]
              AND c.relname = kparts[2]
              AND a.attname = kparts[3]
              AND ty.typtype = 'e'
        ) THEN
            keepers := keepers + 1;
        ELSE
            RAISE EXCEPTION 'keeper column %.% does not exist', kparts[2], kparts[3];
        END IF;
    END LOOP;

    IF keepers <> 5 THEN
        RAISE EXCEPTION 'only % of 5 keeper columns survive', keepers;
    END IF;

    SELECT count(*) INTO survivors
    FROM pg_type ty
    JOIN pg_namespace n ON n.oid = ty.typnamespace
    WHERE n.nspname = 'public'
      AND ty.typtype = 'e'
      AND ty.typname = 'location_status';

    IF survivors <> 0 THEN
        RAISE EXCEPTION 'public.location_status survived its drop';
    END IF;
END
$$;

COMMIT;
