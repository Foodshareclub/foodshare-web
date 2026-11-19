-- Atomic claims and guarded write-backs for the automation drip queue.
--
-- The automation queue had the same shape of defect as the email delivery
-- queue, plus one of its own:
--
--   * `handleProcessAutomation` selected `pending` rows with a plain SELECT
--     and flipped each one to `processing` *inside* the per-item processor —
--     three transactions before the provider call. Two overlapping runs (the
--     cron fires every 5 minutes and the request timeout is 30 seconds) read
--     the same rows and both sent. Same window as the email defect fixed in
--     20260929000000.
--   * The success write-back called `mark_automation_email_sent` with
--     `{p_queue_id, p_provider, p_message_id}`, but the function's signature
--     is `(p_queue_id uuid, p_success boolean, p_error_message text)`. No
--     overload matches, so PostgREST rejects the call; supabase-js returns
--     the rejection as `error` rather than throwing, and the caller never
--     read it. Every successful send therefore left its row `processing`
--     forever — and because only `mark_automation_email_sent` advances the
--     enrollment, the flow never advanced to its next step. The live failure
--     mode was not a duplicate email but a *wedge*: one email per
--     enrollment, then silence.
--   * Nothing recovered `processing` rows. The email claim folds recovery
--     in; this queue had no claim at all to fold it into, so a crash
--     stranded its row permanently.
--   * The failure write-backs were unguarded `.eq("id", …)` updates, so a
--     slow failure could overwrite a row a concurrent run had already marked
--     `sent`.
--   * The failure branch of `mark_automation_email_sent` referenced a
--     column that does not exist (`retry_count`; the table has `attempts`),
--     so that branch had never successfully executed. It is dropped with the
--     function.
--
-- The fix follows 20260929000000 exactly: a `LANGUAGE plpgsql` claim whose
-- selection and flip commit together, one release primitive for rows that
-- owe nothing, one attempt-recording failure primitive for rows that do, and
-- a success write-back scoped to the state a claim produces. `attempts` is
-- deliberately *not* incremented by the claim: a dry run claims and then
-- releases, and an attempt a dry run consumed would move a never-tried row
-- toward `failed`. Attempts are counted where they happen — in
-- `fail_automation_attempts` — which is how `retry_count` works in the email
-- queue.
--
-- Statement ordering
-- ----------------------------------------------------------------------
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so the
-- index comes first. psql is invoked with ON_ERROR_STOP=1 and no wrapping
-- BEGIN — the same convention as 20260928000000 and 20260929000000.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Recovery index (CONCURRENTLY — must precede everything else)
-- ─────────────────────────────────────────────────────────────────────

-- The claim's recovery pass scans `processing` rows by age. The existing
-- partial index on `pending` serves the selection half; this one serves the
-- half that finds stranded rows, which grows only when a run dies.
CREATE INDEX CONCURRENTLY IF NOT EXISTS automation_queue_recover_idx
    ON public.email_automation_queue (updated_at)
    WHERE status = 'processing';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Columns the success write-back has always been called with
-- ─────────────────────────────────────────────────────────────────────
--
-- `handleProcessAutomation` has passed `p_provider` and `p_message_id`
-- since the automation queue was written, into a function that had nowhere
-- to put them — the signature mismatch in §0. Delivery evidence belongs on
-- the row: without it, "did this send, and through which provider" is
-- answered by a provider dashboard rather than by the database that owns
-- the queue.

ALTER TABLE public.email_automation_queue
    ADD COLUMN IF NOT EXISTS provider text,
    ADD COLUMN IF NOT EXISTS message_id text;

-- ─────────────────────────────────────────────────────────────────────
-- 3. The claim
-- ─────────────────────────────────────────────────────────────────────

-- Returns the rows it claimed, each already `processing`.
--
-- Three properties are deliberate:
--
--   * Recovery runs first, in the same transaction, so a row stranded by a
--     crashed run is available to this very pass. The Deno path recovers
--     its own rows rather than depending on the Rust worker's reaper,
--     which does not run while `JOBS_ENABLED=false` — the same reasoning
--     as `claim_email_queue`.
--   * `attempts < max_attempts` is per-row and is the same predicate the
--     failure path leaves behind, so the claim and the give-up cannot
--     disagree (the email queue's `retry_count < 3` vs `< 2` split).
--   * `attempts` is untouched here. Claiming is not trying: a dry run
--     claims every row it previews, and counting that as an attempt would
--     let previews drive rows to `failed`.
CREATE OR REPLACE FUNCTION public.claim_automation_queue(
    p_batch_size          integer DEFAULT 100,
    p_stale_after_seconds integer DEFAULT 900
)
RETURNS SETOF public.email_automation_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Recovery: a row still `processing` after the stale window belonged to
    -- a run that died mid-send. 15 minutes is comfortably longer than a
    -- provider round trip for a batch of 20, so a slow send is never
    -- mistaken for a dead one — recovering early is a duplicate send.
    UPDATE public.email_automation_queue
    SET status = 'pending',
        updated_at = now()
    WHERE status = 'processing'
      AND updated_at < now() - make_interval(secs => p_stale_after_seconds);

    RETURN QUERY
    WITH claimed AS (
        SELECT q.id
        FROM public.email_automation_queue AS q
        WHERE q.status = 'pending'
          AND q.scheduled_for <= now()
          AND q.attempts < q.max_attempts
        ORDER BY q.scheduled_for ASC, q.id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_batch_size
    ),
    claimed_rows AS (
        UPDATE public.email_automation_queue AS q
        SET status = 'processing',
            last_attempt_at = now(),
            updated_at = now()
        FROM claimed
        WHERE q.id = claimed.id
        RETURNING q.*
    )
    SELECT * FROM claimed_rows
    ORDER BY scheduled_for ASC, id ASC;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. The write-backs
-- ─────────────────────────────────────────────────────────────────────
--
-- Four obligations, one function each. Every exit path in the Deno handler
-- maps to exactly one of them, which is what makes "every claimed row owes
-- the queue an outcome" checkable rather than aspirational.

-- Release: the row was claimed but no real attempt happened — a dry run, or
-- content that could not be resolved and may resolve on a later pass.
--
-- Scoped to `processing` so a late release cannot un-send a delivery, and
-- deliberately does not touch `attempts`: releasing is not an attempt, and
-- a dry run of twenty rows must not consume twenty attempts. It also does
-- not fail a row — a released row returns to `pending` with its original
-- `scheduled_for`, which is in the past for anything that was claimed, so
-- the next cron tick picks it up.
CREATE OR REPLACE FUNCTION public.release_automation_claims(
    p_ids           uuid[],
    p_error_message text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.email_automation_queue
    SET status = 'pending',
        error_message = COALESCE(p_error_message, error_message),
        updated_at = now()
    WHERE id = ANY (p_ids)
      AND status = 'processing';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Failure: a real attempt happened and it did not deliver.
--
-- `p_should_retry = false` is the permanent case (no recipient, hard
-- bounce): the row goes to `failed` regardless of budget, because a profile
-- with no address will not acquire one and retrying spends the budget on an
-- address that will never accept mail. With retry, the row returns to
-- `pending` until `attempts + 1` reaches its own `max_attempts` — the
-- per-row column the old TypeScript ignored in favour of a hardcoded 3.
--
-- The guard is what keeps a slow failure from overwriting a row a
-- concurrent run already marked `sent`: the asymmetry between this
-- function and `mark_automation_email_sent` is the defect class that
-- survived review in the email queue.
CREATE OR REPLACE FUNCTION public.fail_automation_attempts(
    p_ids           uuid[],
    p_error_message text,
    p_should_retry  boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.email_automation_queue
    SET attempts = attempts + 1,
        status = CASE
            WHEN p_should_retry AND attempts + 1 < max_attempts THEN 'pending'
            ELSE 'failed'
        END,
        error_message = p_error_message,
        updated_at = now()
    WHERE id = ANY (p_ids)
      AND status = 'processing';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Success.
--
-- The signature replaces `(p_queue_id uuid, p_success boolean,
-- p_error_message text)`, which no longer has a caller: the only call site
-- in the codebase passes provider and message id, and the old failure
-- branch it would have taken referenced `retry_count`, a column this table
-- has never had.
--
-- The guard does double duty. It stops a duplicate call from advancing the
-- enrollment twice — `current_step = step_index + 1` is idempotent-looking
-- but `total_completed = total_completed + 1` is not, and a flow that
-- completes twice schedules its next step twice — and it makes the function
-- answer `false` to a caller that lost the row, which is the signal the
-- Deno handler logs rather than swallowing.
DROP FUNCTION IF EXISTS public.mark_automation_email_sent(uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.mark_automation_email_sent(
    p_queue_id  uuid,
    p_provider  text,
    p_message_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_queue_item public.email_automation_queue%ROWTYPE;
    v_flow       public.email_automation_flows%ROWTYPE;
    v_next_step  jsonb;
    v_next_step_index integer;
    v_delay_minutes integer;
BEGIN
    UPDATE public.email_automation_queue
    SET status = 'sent',
        sent_at = now(),
        provider = p_provider,
        message_id = p_message_id,
        error_message = NULL,
        updated_at = now()
    WHERE id = p_queue_id
      AND status = 'processing'
    RETURNING * INTO v_queue_item;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Everything below runs only for the caller that still owned the row.
    UPDATE public.automation_enrollments
    SET current_step = v_queue_item.step_index + 1,
        updated_at = now()
    WHERE id = v_queue_item.enrollment_id;

    UPDATE public.email_automation_flows
    SET total_completed = total_completed + 1,
        updated_at = now()
    WHERE id = v_queue_item.flow_id;

    SELECT * INTO v_flow
    FROM public.email_automation_flows
    WHERE id = v_queue_item.flow_id;

    v_next_step_index := v_queue_item.step_index + 1;

    IF v_flow IS NOT NULL AND jsonb_array_length(v_flow.steps) > v_next_step_index THEN
        v_next_step := v_flow.steps -> v_next_step_index;
        v_delay_minutes := COALESCE((v_next_step ->> 'delay_minutes')::integer, 0);

        INSERT INTO public.email_automation_queue (
            enrollment_id, flow_id, profile_id, step_index,
            scheduled_for, email_data
        ) VALUES (
            v_queue_item.enrollment_id, v_queue_item.flow_id,
            v_queue_item.profile_id, v_next_step_index,
            now() + make_interval(mins => v_delay_minutes),
            v_next_step
        );
    ELSE
        UPDATE public.automation_enrollments
        SET status = 'completed',
            completed_at = now(),
            updated_at = now()
        WHERE id = v_queue_item.enrollment_id;
    END IF;

    RETURN true;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Grants
-- ----------------------------------------------------------------------
--
-- Same pattern as 20260929000000: functions are executable by PUBLIC by
-- default, which is exactly the kind of thing a later `REVOKE ... FROM
-- PUBLIC` elsewhere would silently undo. Granted explicitly; revoked from
-- PUBLIC and from the client roles so the executable set is the one
-- intended.

REVOKE ALL ON FUNCTION public.claim_automation_queue(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_automation_claims(uuid[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_automation_attempts(uuid[], text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_automation_email_sent(uuid, text, text) FROM PUBLIC;

-- `anon` and `authenticated` are absent when this is applied against a bare
-- schema (the validate-migrations CI job builds one, and so does the Rust
-- fixture), and revoking from a missing role is an error.
DO $$
DECLARE
    client_role text;
BEGIN
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.claim_automation_queue(integer, integer) FROM %I',
                client_role
            );
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.release_automation_claims(uuid[], text) FROM %I',
                client_role
            );
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.fail_automation_attempts(uuid[], text, boolean) FROM %I',
                client_role
            );
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.mark_automation_email_sent(uuid, text, text) FROM %I',
                client_role
            );
        END IF;
    END LOOP;
END
$$;

-- `service_role` is a Supabase role and is absent against a bare schema.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.claim_automation_queue(integer, integer)
            TO service_role;
        GRANT EXECUTE ON FUNCTION public.release_automation_claims(uuid[], text)
            TO service_role;
        GRANT EXECUTE ON FUNCTION public.fail_automation_attempts(uuid[], text, boolean)
            TO service_role;
        GRANT EXECUTE ON FUNCTION public.mark_automation_email_sent(uuid, text, text)
            TO service_role;
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Verify the outcome
-- ----------------------------------------------------------------------
--
-- Assertions about shape, not data: the migration runs against production
-- during deploy, where row counts are unknown, and against the Rust fixture,
-- where they are zero. What can be asserted in both places is that each
-- function still has the property its use depends on — and a future edit
-- that quietly removes one fails the deploy instead of failing a user's
-- inbox.

DO $$
DECLARE
    function_def text;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO function_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'claim_automation_queue';

    IF function_def IS NULL THEN
        RAISE EXCEPTION 'public.claim_automation_queue was not created';
    END IF;

    -- plpgsql, not SQL: a SQL function releases its row locks at statement
    -- end, which is the duplicate-send defect itself.
    IF function_def NOT LIKE '%LANGUAGE plpgsql%' THEN
        RAISE EXCEPTION
            'claim_automation_queue must be plpgsql; a LANGUAGE sql function releases its row locks at statement end, which is the duplicate-send defect';
    END IF;

    IF function_def NOT LIKE '%SKIP LOCKED%' THEN
        RAISE EXCEPTION
            'claim_automation_queue must skip locked rows, or two callers serialize instead of dividing the work';
    END IF;

    -- The recovery step, so the Deno path does not depend on the Rust
    -- worker's reaper while JOBS_ENABLED is false.
    --
    -- Asserted by the two things recovery does that nothing else in this
    -- function does: write rows *back* to `pending`, and do it against the
    -- stale window. The first draft checked for `status = 'processing'`
    -- instead, which the claim's own flip guarantees — mutation testing
    -- removed the recovery entirely and the assertion passed anyway, which
    -- is what a check that cannot fail looks like.
    IF function_def NOT LIKE '%SET status = ''pending''%' THEN
        RAISE EXCEPTION
            'claim_automation_queue must return stale processing rows to the queue, or a crashed run strands its rows permanently';
    END IF;

    IF function_def NOT LIKE '%make_interval(secs => p_stale_after_seconds)%' THEN
        RAISE EXCEPTION
            'claim_automation_queue must gate recovery on p_stale_after_seconds, or it recovers rows a slow send is still working on — recovering early is a duplicate send';
    END IF;

    -- Claiming is not trying: without this, a dry run drives rows to failed.
    -- Checked against the same alias-stripped text as the predicate below,
    -- for the same reason: a qualified `q.attempts = q.attempts + 1` must
    -- not read as an absence of increments.
    IF replace(function_def, 'q.', '') LIKE '%attempts = attempts + 1%' THEN
        RAISE EXCEPTION
            'claim_automation_queue must not increment attempts; a dry run claims every row it previews';
    END IF;

    -- Compared after stripping the `q.` alias so the assertion matches the
    -- predicate rather than the qualifier — an assertion that cannot see
    -- past an alias is a check on spelling, not on behaviour.
    IF replace(function_def, 'q.', '') NOT LIKE '%attempts < max_attempts%' THEN
        RAISE EXCEPTION
            'claim_automation_queue must filter on attempts < max_attempts, or it re-claims rows the failure path has already given up on';
    END IF;
END
$$;

DO $$
DECLARE
    fn_name text;
BEGIN
    FOREACH fn_name IN ARRAY ARRAY['release_automation_claims', 'fail_automation_attempts']
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = fn_name
              AND pg_get_functiondef(p.oid) LIKE '%status = ''processing''%'
        ) THEN
            RAISE EXCEPTION
                'public.% is missing or not scoped to processing; a late write-back would overwrite a delivery', fn_name;
        END IF;
    END LOOP;

    -- Releasing must not consume an attempt, or every dry run spends one.
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'release_automation_claims'
          AND pg_get_functiondef(p.oid) LIKE '%attempts + 1%'
    ) THEN
        RAISE EXCEPTION
            'release_automation_claims must not increment attempts; releasing is not an attempt';
    END IF;

    -- The failure path is where attempts are counted, and only there.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'fail_automation_attempts'
          AND pg_get_functiondef(p.oid) LIKE '%attempts + 1%'
    ) THEN
        RAISE EXCEPTION
            'fail_automation_attempts must increment attempts, or a failing row retries forever';
    END IF;

    -- The success write-back: guarded, and at the signature the caller
    -- actually uses. An unguarded duplicate here advances the enrollment
    -- twice and schedules the flow's next step twice.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'mark_automation_email_sent'
          AND pg_get_function_identity_arguments(p.oid)
              = 'p_queue_id uuid, p_provider text, p_message_id text'
          AND pg_get_functiondef(p.oid) LIKE '%status = ''processing''%'
    ) THEN
        RAISE EXCEPTION
            'public.mark_automation_email_sent must take (uuid, text, text) and be scoped to processing; either the caller''s arguments do not resolve or a duplicate call can advance the enrollment twice';
    END IF;

    -- The old function, with its unreachable failure branch over a column
    -- that does not exist, must not be left alongside the new one: two
    -- overloads and a caller whose named arguments resolve to the wrong one
    -- is how this defect survived the first time.
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'mark_automation_email_sent'
          AND pg_get_function_identity_arguments(p.oid)
              = 'p_queue_id uuid, p_success boolean, p_error_message text'
    ) THEN
        RAISE EXCEPTION
            'the legacy mark_automation_email_sent(uuid, boolean, text) still exists; its failure branch references retry_count, which this table has never had';
    END IF;
END
$$;
