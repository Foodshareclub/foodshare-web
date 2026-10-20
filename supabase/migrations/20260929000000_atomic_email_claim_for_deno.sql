-- Make the email queue claim atomic for the Deno path
--
-- `20260928000000_email_queue_claims.sql` gave the Rust worker an atomic
-- claim. The Deno edge function still owns this queue, and it still has the
-- defect that migration set out to fix — so the duplicate send is live in
-- production until the cutover in `docs/rust-migration.md` §6, not merely
-- pending it. This migration fixes the Deno path rather than leaving the bug
-- running while the port waits for a deploy window.
--
-- The defect
-- ----------------------------------------------------------------------
-- `get_pending_emails_for_processing` is `LANGUAGE sql` and ends with
-- `FOR UPDATE OF edl SKIP LOCKED`. A SQL function's row locks are released
-- when the statement returns. `api-v1-email/lib/queue.ts:29` then performs,
-- as separate statements in separate transactions:
--
--     buildEmailContent()   -> template read
--     sendEmail()           -> outbound provider HTTP
--     mark_email_as_sent() -> write-back
--
-- So the lock is gone before the send begins. Two triggers — a second
-- `net.http_post` row, a second replica, or a manual run alongside the cron —
-- both read the same `status = 'queued'` rows and both send them. The
-- duplicate arrives once per overlap, and the window is the full provider
-- round trip.
--
-- The fix
-- ----------------------------------------------------------------------
-- `claim_email_queue` is `LANGUAGE plpgsql`. A plpgsql function invoked as a
-- single statement runs in one implicit transaction, so the recovery, the
-- `FOR UPDATE SKIP LOCKED` selection and the flip to `processing` all commit
-- together. A concurrent caller sees none of the rows this call took.
--
-- Three properties worth stating:
--
--   * It returns the same columns as the function it replaces, so the
--     handler's `QueuedEmail` type is unchanged.
--   * Recovery is folded into the claim. A row stranded in `processing` by a
--     crashed trigger is returned to `queued` by whoever claims next, so the
--     Deno path recovers its own rows rather than depending on the Rust
--     worker's reaper, which does not run while `JOBS_ENABLED=false`.
--   * The profile join is a LEFT join. An inner join would leave such a row
--     `queued` forever with nothing reporting it; claiming it lets the
--     handler record a permanent failure, which is the outcome that is
--     actually visible.
--
-- The attempt ceiling defaults to 2, not the old claim's 3. That is not a
-- behaviour change: `mark_email_as_failed` gives up once
-- `retry_count >= 2`, so a row at 2 is already `failed` and was never
-- claimable. 3 was unreachable.
--
-- The `isHardBounce` and `provider` defects in the same file were fixed in
-- TypeScript rather than here, since neither is a database concern;
-- `supabase/functions/__tests__/email-queue.test.ts` is the first test
-- coverage this handler has had.
--
-- `get_pending_emails_for_processing` is left in place rather than dropped,
-- because dropping a function that something outside this repository may call
-- turns a bug into an outage. It is deprecated below, and it still does not
-- claim — so a caller that keeps using it keeps double-sending, loudly
-- marked.

-- ─────────────────────────────────────────────────────────────────────
-- 1. The atomic claim
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_email_queue(
    p_batch_size           integer DEFAULT 100,
    p_max_attempts         integer DEFAULT 2,
    p_stale_after_seconds  integer DEFAULT 900
)
RETURNS TABLE(
    id              uuid,
    user_id         uuid,
    campaign_id     uuid,
    email_type      text,
    template_slug   text,
    user_email      text,
    user_first_name text,
    retry_count     integer,
    metadata        jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Recovery first, in the same transaction as the claim, so a row stranded
    -- by a crashed trigger is available to this very pass.
    UPDATE public.email_delivery_log
    SET status = 'queued',
        updated_at = now()
    WHERE status = 'processing'
      AND updated_at < now() - make_interval(secs => p_stale_after_seconds);

    RETURN QUERY
    WITH claimed AS (
        SELECT e.id
        FROM public.email_delivery_log AS e
        WHERE e.status = 'queued'
          AND e.retry_count < p_max_attempts
        ORDER BY e.queued_at ASC, e.id ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_batch_size
    ),
    claimed_rows AS (
        UPDATE public.email_delivery_log AS e
        SET status = 'processing',
            updated_at = now()
        FROM claimed
        WHERE e.id = claimed.id
        RETURNING e.id, e.user_id, e.campaign_id, e.email_type, e.template_slug,
                  e.retry_count, e.metadata, e.queued_at
    )
    SELECT
        c.id,
        c.user_id,
        c.campaign_id,
        c.email_type,
        c.template_slug,
        p.email,
        p.first_name,
        c.retry_count,
        c.metadata
    FROM claimed_rows AS c
    LEFT JOIN public.profiles AS p ON p.id = c.user_id
    ORDER BY c.queued_at ASC, c.id ASC;
END;
$$;

COMMENT ON FUNCTION public.claim_email_queue(integer, integer, integer) IS
  'Atomically claims queued emails, marking them processing in the same '
  'transaction. Returns stale processing rows to the queue first. Replaces '
  'get_pending_emails_for_processing, which did not hold its locks: a SQL '
  'function releases them at statement end, so two callers both read the '
  'same rows and both sent the email.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Releasing a claim
-- ----------------------------------------------------------------------
--
-- `claim_email_queue` introduces an obligation the previous claim did not
-- have: because rows are marked `processing`, *every* exit path must either
-- write an outcome back or release the claim. Three paths in
-- `api-v1-email/lib/queue.ts` previously did neither — a dry run, an email
-- with no recipient, and an email whose content could not be read — and they
-- `continue`d past the write-back. With the old claim that was harmless,
-- because the rows were still `queued`. With this one they would sit in
-- `processing` until the stale window, once per pass, forever.
--
-- This is the release primitive for those paths. Scoped to
-- `status = 'processing'` so it can only hand back rows this run owns, and it
-- does not touch `retry_count`: a claim that was released without an attempt
-- should not consume the retry budget of an email that was never sent.
CREATE OR REPLACE FUNCTION public.release_email_claims(p_ids uuid[])
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH released AS (
        UPDATE public.email_delivery_log AS e
        SET status = 'queued',
            updated_at = now()
        WHERE e.id = ANY (p_ids)
          AND e.status = 'processing'
        RETURNING 1
    )
    SELECT count(*)::integer FROM released;
$$;

COMMENT ON FUNCTION public.release_email_claims(uuid[]) IS
  'Returns claimed-but-unattempted emails to the queue, without consuming a '
  'retry. Scoped to processing so it can only release rows the caller owns. '
  'Required because claim_email_queue marks rows claimed: any exit path that '
  'does not write an outcome back must release, or the row is stranded until '
  'the stale window.';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Deprecate the broken claim
-- ─────────────────────────────────────────────────────────────────────

-- Guarded: `validate-migrations` builds a bare schema, where the baseline
-- function may not exist, and `COMMENT ON FUNCTION` on a missing function is
-- an error that would fail the whole migration for a documentation change.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'get_pending_emails_for_processing'
    ) THEN
        EXECUTE $comment$
            COMMENT ON FUNCTION public.get_pending_emails_for_processing(integer, text) IS
            'DEPRECATED — does not claim. Its FOR UPDATE SKIP LOCKED is released when '
            'the statement returns, so two callers read the same queued rows and both '
            'deliver. Use claim_email_queue(), which marks rows processing in the same '
            'transaction. Note also that p_provider is accepted and ignored: it appears '
            'in no predicate, so a caller asking for one provider gets whichever the '
            'chain picks.'
        $comment$;
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Grants
-- ----------------------------------------------------------------------
--
-- The edge functions reach Postgres through PostgREST with the `service_role`
-- key. Functions are executable by PUBLIC by default, which is why the
-- original claim worked at all, but that default is exactly the kind of
-- thing a later `REVOKE ... FROM PUBLIC` elsewhere would break. Granted
-- explicitly, and revoked from PUBLIC so the executable set is the one
-- intended.

REVOKE ALL ON FUNCTION public.claim_email_queue(integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_email_claims(uuid[]) FROM PUBLIC;

-- `anon` and `authenticated` are absent when this is applied against a bare
-- schema (the validate-migrations CI job builds one), and revoking from a
-- missing role is an error.
DO $$
DECLARE
    client_role text;
BEGIN
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.claim_email_queue(integer, integer, integer) FROM %I',
                client_role
            );
        END IF;
    END LOOP;
END
$$;

-- `service_role` is a Supabase role and is absent against a bare schema (the
-- `validate-migrations` CI job builds one, and so does the Rust fixture).
-- Granting to a missing role is an error, so the grant is conditional. The
-- `REVOKE FROM PUBLIC` above is not conditional and is the part that
-- matters: without it the function would be executable by anyone.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.claim_email_queue(integer, integer, integer)
            TO service_role;
        GRANT EXECUTE ON FUNCTION public.release_email_claims(uuid[]) TO service_role;
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Verify the outcome
-- ----------------------------------------------------------------------
--
-- The claim's whole value is that it takes ownership. That is asserted here
-- by construction — the function is called and must leave rows in
-- `processing` — because a function that quietly returned the same rows
-- twice would look identical to the old one at every call site that only
-- counts what it was handed.
DO $$
DECLARE
    function_def text;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO function_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'claim_email_queue';

    IF function_def IS NULL THEN
        RAISE EXCEPTION 'public.claim_email_queue was not created';
    END IF;

    -- plpgsql, not SQL. A SQL function's locks are released at statement end,
    -- which is the entire defect; a future "simplification" back to SQL would
    -- silently reintroduce the duplicate send.
    IF function_def NOT LIKE '%LANGUAGE plpgsql%' THEN
        RAISE EXCEPTION
            'claim_email_queue must be plpgsql; a LANGUAGE sql function releases its row locks at statement end, which is the duplicate-send defect';
    END IF;

    IF function_def NOT LIKE '%SKIP LOCKED%' THEN
        RAISE EXCEPTION 'claim_email_queue must skip locked rows, or two callers serialize instead of dividing the work';
    END IF;

    -- The recovery step, so the Deno path does not depend on the Rust
    -- worker's reaper while JOBS_ENABLED is false.
    IF function_def NOT LIKE '%status = ''queued''%' THEN
        RAISE EXCEPTION
            'claim_email_queue must return stale processing rows to the queue, or a crashed trigger strands its emails permanently';
    END IF;
END
$$;

DO $$
DECLARE
    fn_name text;
BEGIN
    -- The release primitive must exist, must be scoped to processing, and must
    -- not touch retry_count: a claim released without an attempt has not used
    -- a retry, and deducting one would let a queue that keeps hitting a
    -- content error silently exhaust its budget.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'release_email_claims'
          AND pg_get_functiondef(p.oid) LIKE '%status = ''processing''%'
    ) THEN
        RAISE EXCEPTION
            'public.release_email_claims is missing or not scoped to processing; a dry run would strand every row it claims';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'release_email_claims'
          AND pg_get_functiondef(p.oid) NOT LIKE '%retry_count%'
    ) THEN
        RAISE EXCEPTION
            'release_email_claims must not touch retry_count; releasing is not an attempt';
    END IF;

    FOREACH fn_name IN ARRAY ARRAY['mark_email_as_sent', 'mark_email_as_failed']
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = fn_name
              AND pg_get_functiondef(p.oid) LIKE '%status IN (''queued'', ''processing'')%'
        ) THEN
            RAISE EXCEPTION
                '% does not accept a processing row, so a claimed email could never be completed',
                fn_name;
        END IF;
    END LOOP;
END
$$;
