-- Bring `device_attestations` up to the schema the attestation code writes.
--
-- The attestation handlers have written `platform`, `public_key`,
-- `assertion_counter` and `risk_score` since 6c9d96f6 (2026-02-10), and
-- `calculateTrustLevel` returns `'verified'` once a device has attested
-- more than five times. The baseline dump (2026-01-28) predates all of it,
-- and no migration in this repo adds the columns or the CHECK value.
--
-- Production has them — the attestation endpoint is live, and every
-- `updateDeviceRecord` call would otherwise fail with "column not found" —
-- which means the ALTER that added them is missing from the migrations. A
-- fresh deploy from this repo therefore produces a table the code cannot
-- write to. This migration closes the gap: every statement is idempotent,
-- so it is a no-op against production and a fix against a baseline-derived
-- schema.
--
-- `risk_score` deliberately has no default. Rows that predate the column
-- come over NULL, and the read path treats NULL as the worst case
-- (`existing.risk_score || 100`) — the safe direction for a device whose
-- attestation record is being backfilled. A DEFAULT 0 would read as "no
-- risk assessed" on a row that has not been assessed at all.

ALTER TABLE public.device_attestations
    ADD COLUMN IF NOT EXISTS platform text,
    ADD COLUMN IF NOT EXISTS public_key text,
    ADD COLUMN IF NOT EXISTS assertion_counter integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS risk_score integer;

-- 'verified' is a trust level the code writes. The baseline CHECK predates
-- it, so writing it would violate the constraint — dropped and re-added
-- with the value included. Widening a CHECK is safe: it can only accept
-- rows the old one did.
ALTER TABLE public.device_attestations
    DROP CONSTRAINT IF EXISTS device_attestations_trust_level_check;

ALTER TABLE public.device_attestations
    ADD CONSTRAINT device_attestations_trust_level_check
    CHECK (trust_level IN ('unknown', 'trusted', 'verified', 'suspicious', 'blocked'));

-- ─────────────────────────────────────────────────────────────────────
-- Verify the outcome
-- ----------------------------------------------------------------------
--
-- A column added with IF NOT EXISTS against a schema that already has it
-- is a no-op, so the only way this migration fails to produce the contract
-- the code writes is if a later statement silently does nothing. Asserted
-- here rather than left to the first attestation request.

DO $$
DECLARE
    column_names text[];
    needed_column text;
BEGIN
    SELECT array_agg(column_name ORDER BY column_name)
      INTO column_names
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'device_attestations';

    -- The loop variable is deliberately not named `column_name`: that is a
    -- column of the query above, and PL/pgSQL's variable substitution turns
    -- the collision into a syntax error at the FOREACH.
    FOREACH needed_column IN ARRAY ARRAY['platform', 'public_key', 'assertion_counter', 'risk_score']
    LOOP
        IF NOT (column_names && ARRAY[needed_column]) THEN
            RAISE EXCEPTION
                'device_attestations.% is missing; the attestation handlers cannot write without it',
                needed_column;
        END IF;
    END LOOP;

    -- The CHECK constraint, read back from the catalog rather than from the
    -- migration's own text: a constraint that silently kept the old
    -- definition would reject the first 'verified' write.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.device_attestations'::regclass
          AND conname = 'device_attestations_trust_level_check'
          AND pg_get_constraintdef(oid) LIKE '%''verified''%'
    ) THEN
        RAISE EXCEPTION
            'device_attestations trust_level check does not allow ''verified''; calculateTrustLevel returns it for devices with more than five attestations';
    END IF;
END
$$;
