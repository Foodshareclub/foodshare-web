-- Add an atomic claim path for the email delivery queue
--
-- The Rust `job-worker` takes over `api-v1-email/lib/queue.ts:29`, which
-- walks a batch of queued emails in a serial `for` loop. Two defects in the
-- database contract make that path unsafe, and both are fixed here rather
-- than worked around in the worker.
--
-- 1. The claim does not hold its locks  (the duplicate-send bug)
-- ---------------------------------------------------------------------
-- `get_pending_emails_for_processing` is `LANGUAGE sql` and ends with
-- `FOR UPDATE OF edl SKIP LOCKED`. A SQL function's row locks are released
-- when the statement finishes. The Deno caller then performs, as separate
-- statements in separate transactions:
--
--     buildEmailContent()   -> template read
--     sendEmail()           -> outbound provider HTTP
--     mark_email_as_sent() -> write-back
--
-- So the lock is gone long before the send. Two workers — two edge-runtime
-- replicas, or an edge function and the Rust worker during a cutover — both
-- read the same `status = 'queued'` rows and both send them. The user
-- receives the email twice.
--
-- This is not theoretical. `net.http_post` triggers plus a second replica is
-- a normal deployment, and the window is the whole provider round trip.
--
-- The fix is the same shape as `20260927000000` gave the digest queue: a
-- claim that flips rows to a claimed state *in the same statement*, with the
-- write-back restricted to rows still in that state. `processing` is added
-- to the status CHECK for this. The Deno path is deliberately left working:
-- it keeps calling the same RPCs, and those RPCs now accept rows in either
-- 'queued' or 'processing', so nothing regresses while it still owns the
-- schedule.
--
-- 2. `mark_email_as_failed` has no state guard
-- ---------------------------------------------
-- `mark_email_as_sent` is guarded with `AND status = 'queued'`; the failure
-- path had no equivalent. A slow failure could therefore overwrite a row a
-- concurrent success had already marked 'sent', resetting it to 'queued' and
-- incrementing `retry_count` — which both loses the delivery record and
-- guarantees a duplicate send on the next tick. The guard added below
-- accepts 'queued' (Deno, which never claims) and 'processing' (Rust, which
-- does) and rejects both 'sent' and 'failed'.
--
-- A note on the Deno path's limits, which this migration deliberately does
-- not change:
--
--   * `get_pending_emails_for_processing` accepts `p_provider` and ignores
--     it — the parameter appears in no predicate. A caller asking for
--     "Resend only" gets whichever provider the chain picks. The Rust claim
--     has no such parameter; see `claim_email_queue` in fs-db.
--   * the claim filters `retry_count < 3` while `mark_email_as_failed`
--     gives up at `retry_count < 2`, so the effective ceiling is two. The
--     Rust path uses one predicate for both, so the numbers cannot disagree.
--
-- Statement ordering
-- ----------------------------------------------------------------------
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so the
-- indexes come first. psql is invoked with ON_ERROR_STOP=1 and no wrapping
-- BEGIN, so each statement is its own transaction — the same convention as
-- 20260927000000.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Claim indexes (CONCURRENTLY — must precede everything else)
-- ─────────────────────────────────────────────────────────────────────

-- Partial on 'queued' so the index stays proportional to outstanding work
-- rather than to delivery history, which `email_delivery_log` keeps
-- forever (opened_at, clicked_at and bounced all live on the same row).
CREATE INDEX CONCURRENTLY IF NOT EXISTS email_delivery_log_claim_idx
    ON public.email_delivery_log (queued_at, id)
    WHERE status = 'queued';

-- The opposite predicate, for recovering rows abandoned by a worker that
-- died between claim and write-back.
CREATE INDEX CONCURRENTLY IF NOT EXISTS email_delivery_log_processing_idx
    ON public.email_delivery_log (queued_at)
    WHERE status = 'processing';

COMMENT ON INDEX public.email_delivery_log_claim_idx IS
  'Partial claim index for job-worker: queued rows only, ordered for the '
  'FOR UPDATE SKIP LOCKED claim. Created CONCURRENTLY because the table is '
  'continuously appended to by every transactional email in the product.';

COMMENT ON INDEX public.email_delivery_log_processing_idx IS
  'Supports the stale-claim recovery query, which returns rows abandoned by '
  'a worker that died mid-send.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. status gains 'processing'
-- ─────────────────────────────────────────────────────────────────────

-- Dropped and re-added rather than altered, so the new value is validated
-- inside this transaction and the service never observes a status the old
-- constraint forbids.
ALTER TABLE public.email_delivery_log
    DROP CONSTRAINT IF EXISTS email_delivery_log_status_check;

ALTER TABLE public.email_delivery_log
    ADD CONSTRAINT email_delivery_log_status_check
    CHECK (status IN (
        'queued', 'processing', 'sent', 'delivered', 'opened',
        'clicked', 'bounced', 'complained', 'failed'
    ));

COMMENT ON COLUMN public.email_delivery_log.status IS
  'queued -> processing is an atomic FOR UPDATE SKIP LOCKED claim by '
  'job-worker, so two workers cannot send the same email. The write-back '
  'only touches rows still in processing, which makes it idempotent. Rows '
  'left in processing past the recovery window are returned to queued by '
  'fs-db. api-v1-email still claims nothing and moves queued -> sent '
  'directly; it remains correct as long as only one replica is triggered, '
  'which is why it is the first thing to move.';

-- ─────────────────────────────────────────────────────────────────────
-- 3. Guard both write-backs
-- ─────────────────────────────────────────────────────────────────────
--
-- Symmetric on purpose. Only the failure path was unguarded, which is how
-- one function could undo the other's work; defining both here means the
-- invariant is stated in one place, and re-applying this migration repairs
-- either of them.

-- Accepts both claimed and unclaimed rows so the Deno path keeps working
-- unchanged. Rejects 'sent' and 'failed', which is the whole point: a
-- failure arriving after a success must not resurrect the row.
CREATE OR REPLACE FUNCTION public.mark_email_as_failed(
    p_delivery_id uuid,
    p_error_code text,
    p_error_message text,
    p_should_retry boolean DEFAULT true
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
BEGIN
    UPDATE email_delivery_log
    SET
        status = CASE WHEN p_should_retry AND retry_count < 2 THEN 'queued' ELSE 'failed' END,
        error_code = p_error_code,
        error_message = p_error_message,
        retry_count = retry_count + 1,
        updated_at = now()
    WHERE id = p_delivery_id
      -- Symmetric with mark_email_as_sent. Both 'queued' and 'processing'
      -- are accepted because the Deno path does not claim and the Rust path
      -- does; 'sent' and 'failed' are excluded so a late failure cannot
      -- undo a delivery.
      AND status IN ('queued', 'processing');

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.mark_email_as_failed(uuid, text, text, boolean) IS
  'Records a send failure. Scoped to rows in queued or processing so it '
  'cannot overwrite a delivery that already succeeded — the unguarded '
  'version could, which lost the delivery record and scheduled a duplicate '
  'send by returning the row to queued.';

-- Same guard as the failure path, and the same reason. It previously read
-- `AND status = 'queued'`, which is narrower than the failure path's
-- requirement: a row the Rust worker has claimed sits in 'processing', so
-- the success write-back has to accept that state to remain usable on the
-- claimed path.
CREATE OR REPLACE FUNCTION public.mark_email_as_sent(
    p_delivery_id uuid, p_provider text, p_message_id text
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
BEGIN
    UPDATE email_delivery_log
    SET
        status = 'sent',
        provider = p_provider,
        message_id = p_message_id,
        sent_at = now(),
        updated_at = now()
    WHERE id = p_delivery_id
      AND status IN ('queued', 'processing');

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.mark_email_as_sent(uuid, text, text) IS
  'Records a successful send. Scoped to rows in queued or processing, '
  'matching mark_email_as_failed, so a claimed row can be completed and a '
  'row already marked sent or failed is left alone.';

-- ─────────────────────────────────────────────────────────────────────
-- 4. Grants for the email queue
-- ─────────────────────────────────────────────────────────────────────
--
-- `email_delivery_log` was not covered by 20260927000000, which granted
-- `notification_delivery_log` (a different table, for channel-level
-- notification delivery). The email queue is a separate table with its own
-- lifecycle, so it needs its own grant.
--
-- No DELETE: the worker never deletes, and delivery history is the audit
-- record. No INSERT either — enqueueing email stays in the edge functions
-- that own the product flows (signup, password reset, digests), since those
-- are request/response shaped and correctly stay in Deno.

GRANT SELECT, UPDATE ON public.email_delivery_log TO job_worker;

-- `profiles` is already granted by 20260927000000; repeated here for
-- clarity, because the email claim joins it for the recipient address and a
-- reader should not have to know which migration covered it.
GRANT SELECT ON public.profiles TO job_worker;

-- The content sources. Missed in the first draft of this migration and
-- caught by running the worker as `job_worker` against a real database: the
-- integration suites connect as the superuser, so every one of them passed
-- while the job failed its first content load with `permission denied for
-- table email_templates`. A grant list is only as good as the principal it
-- was checked with.
-- Revoked before granted, not merely omitted. Asserting read-only without
-- enforcing it means a partially-applied earlier version — or a grant added
-- by hand during an incident — is detected by this migration and then left in
-- place, so every run fails. Revoking makes the file converge.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
    ON public.email_templates, public.newsletter_campaigns
    FROM job_worker;

GRANT SELECT ON public.email_templates TO job_worker;
GRANT SELECT ON public.newsletter_campaigns TO job_worker;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RLS policy
-- ----------------------------------------------------------------------
--
-- The worker connects directly to `db`, so `auth.uid()` is NULL and every
-- pre-existing policy evaluates to false — it would read zero rows. One
-- explicit policy, visible in `pg_policies` rather than being an invisible
-- property of the role.

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_worker_email_delivery_log ON public.email_delivery_log;
CREATE POLICY job_worker_email_delivery_log ON public.email_delivery_log
    FOR ALL TO job_worker
    USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
-- 6. Vault access for the email providers
-- ----------------------------------------------------------------------
--
-- `get_worker_secret` is an explicit allow-list; a name that is not on it
-- returns NULL and is recorded in audit.vault_access_log as
-- `denied_not_allowed`. A silent NULL is indistinguishable from a secret
-- that was never set, which is why the names are added explicitly rather
-- than by loosening the function to a prefix match.
--
-- These are the same names the Deno providers read, so the two paths cannot
-- drift onto different credentials during a cutover.

CREATE OR REPLACE FUNCTION public.get_worker_secret(p_secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    allowed_secrets text[] := ARRAY[
        -- Translation provider chain.
        'LLM_TRANSLATION_ENDPOINT',
        'LLM_TRANSLATION_MODEL',
        'CF_ACCESS_CLIENT_ID',
        'CF_ACCESS_CLIENT_SECRET',
        'DEEPL_API_KEY',
        'DEEPL_API_URL',
        'GOOGLE_TRANSLATE_API_KEY',
        'MICROSOFT_TRANSLATE_KEY',
        'MICROSOFT_TRANSLATE_REGION',
        'AWS_TRANSLATE_REGION',
        -- AWS credentials for Amazon Translate.
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_SESSION_TOKEN',
        -- The edge functions this worker calls for digest delivery. It
        -- authenticates to them with the service key, exactly as the Deno
        -- handlers do.
        'SUPABASE_SERVICE_KEY',
        -- Pinned Apple trust anchors. Until these are set, every
        -- /internal/verify/* request fails closed with
        -- NoTrustAnchorConfigured.
        'APPLE_ROOT_CA_G3_DER',
        'APPLE_ROOT_CA_FINGERPRINTS',
        -- Email delivery providers. Same names the Deno clients read.
        'RESEND_API_KEY',
        'BREVO_API_KEY',
        'MAILERSEND_API_KEY',
        -- Shared sender identity. The Deno providers fall back to these for
        -- every provider that has no sender of its own.
        'EMAIL_FROM',
        'EMAIL_FROM_NAME',
        'MAILERSEND_SENDER_EMAIL',
        'MAILERSEND_SENDER_NAME',
        'AWS_SES_REGION',
        'AWS_SES_ACCESS_KEY_ID',
        'AWS_SES_SECRET_ACCESS_KEY',
        'AWS_SES_FROM_EMAIL',
        'AWS_SES_FROM_NAME'
    ];
    secret_value text;
    access_granted boolean := false;
BEGIN
    IF p_secret_name = ANY (allowed_secrets) THEN
        SELECT decrypted_secret INTO secret_value
        FROM vault.decrypted_secrets
        WHERE name = p_secret_name;
        access_granted = (secret_value IS NOT NULL);
    END IF;

    INSERT INTO audit.vault_access_log (
        user_id, user_role, secret_name, access_granted,
        access_method, access_result
    )
    VALUES (
        NULL,
        'service:job_worker',
        COALESCE(p_secret_name, '<null>'),
        access_granted,
        'get_worker_secret',
        CASE
            WHEN p_secret_name IS NULL OR NOT (p_secret_name = ANY (allowed_secrets))
                THEN 'denied_not_allowed'
            WHEN access_granted
                THEN 'granted'
            ELSE 'denied_not_set'
        END
    );

    RETURN secret_value;
END;
$$;

COMMENT ON FUNCTION public.get_worker_secret(text) IS
  'Vault read for the Rust job-worker. Allow-list is explicit and covers '
  'only the names that service needs. Every call, including refusals, is '
  'written to audit.vault_access_log so a denied read is distinguishable '
  'from an unset secret.';

REVOKE ALL ON FUNCTION public.get_worker_secret(text) FROM PUBLIC;

-- See 20260927000000 §6: `anon`/`authenticated`/`service_role` may not
-- exist when this is applied against a bare schema, and revoking from a
-- missing role is an error. PUBLIC above covers the case that matters.
DO $$
DECLARE
    client_role text;
BEGIN
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = client_role) THEN
            EXECUTE format(
                'REVOKE ALL ON FUNCTION public.get_worker_secret(text) FROM %I',
                client_role
            );
        END IF;
    END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_worker_secret(text) TO job_worker;

-- ─────────────────────────────────────────────────────────────────────
-- 7. Verify the outcome
-- ----------------------------------------------------------------------
--
-- A migration that silently failed to widen the status constraint would
-- surface as an `invalid input value for enum`-style CHECK violation on the
-- first claim, at whatever hour the cron happens to fire. These assertions
-- turn that into a loud failure here instead.

DO $$
DECLARE
    expected record;
    policy_count integer;
    constraint_def text;
    -- FOREACH requires a scalar target; `expected` is a record so it can
    -- also be the row of the FOR loop below.
    status_name text;
    secret_name text;
    fn_name text;
BEGIN
    -- The status constraint is not introspectable for its value list, so it
    -- is checked by reading its definition. A `CREATE TABLE ... CHECK` that
    -- omitted 'processing' would otherwise surface as a CHECK violation on
    -- the first claim, at whatever hour the cron happens to fire.
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conname = 'email_delivery_log_status_check'
      AND conrelid = 'public.email_delivery_log'::regclass;

    IF constraint_def IS NULL THEN
        RAISE EXCEPTION 'email_delivery_log_status_check is missing';
    END IF;

    IF constraint_def NOT LIKE '%processing%' THEN
        RAISE EXCEPTION
            'email_delivery_log_status_check does not allow ''processing''; the claim will fail at run time. Got: %',
            constraint_def;
    END IF;

    -- The status values the Deno path still writes must remain accepted, or
    -- enqueueing would break rather than the claim.
    FOREACH status_name IN ARRAY ARRAY[
        'queued', 'sent', 'delivered', 'opened', 'clicked',
        'bounced', 'complained', 'failed'
    ]
    LOOP
        IF constraint_def NOT LIKE '%' || status_name || '%' THEN
            RAISE EXCEPTION
                'email_delivery_log_status_check dropped the existing status ''%''; the constraint is %',
                status_name, constraint_def;
        END IF;
    END LOOP;

    -- Both write-backs must carry the same guard. Checking only the failure
    -- path was how the asymmetry went unnoticed: each looked correct alone.
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
                '% is not scoped to rows in queued or processing; it can overwrite a delivery that already succeeded',
                fn_name;
        END IF;
    END LOOP;

    FOR expected IN
        SELECT * FROM (VALUES
            ('email_delivery_log', 'job_worker_email_delivery_log')
        ) AS t(table_name, policy_name)
    LOOP
        SELECT count(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = expected.table_name
          AND policyname = expected.policy_name
          AND qual       = 'true';

        IF policy_count <> 1 THEN
            RAISE EXCEPTION
                'expected exactly one USING (true) policy % on public.%, found %',
                expected.policy_name, expected.table_name, policy_count;
        END IF;
    END LOOP;

    -- Every table the email job reads must be readable by the role. Asserted
    -- from pg_class rather than trusted, because the failure mode is a
    -- `permission denied` on the first run in production and nothing else.
    FOREACH secret_name IN ARRAY ARRAY[
        'email_delivery_log', 'profiles', 'email_templates', 'newsletter_campaigns'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.role_table_grants
            WHERE grantee     = 'job_worker'
              AND table_schema = 'public'
              AND table_name   = secret_name
              AND privilege_type IN ('SELECT', 'UPDATE')
        ) THEN
            RAISE EXCEPTION
                'job_worker has no grant on public.%; the email job will fail with permission denied',
                secret_name;
        END IF;
    END LOOP;

    -- The content sources are read-only: the worker never edits a template or
    -- a campaign, and a grant that allowed it would mean a content bug could
    -- rewrite the template every future email is rendered from.
    FOREACH secret_name IN ARRAY ARRAY['email_templates', 'newsletter_campaigns']
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.role_table_grants
            WHERE grantee      = 'job_worker'
              AND table_schema  = 'public'
              AND table_name    = secret_name
              AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
        ) THEN
            RAISE EXCEPTION
                'job_worker must not be able to write public.%',
                secret_name;
        END IF;
    END LOOP;

    -- Every email secret the worker reads must be on the allow-list. A name
    -- the Deno side reads but the worker does not arrives as a NULL that is
    -- indistinguishable from a secret that was never set.
    FOREACH secret_name IN ARRAY ARRAY[
        'RESEND_API_KEY', 'BREVO_API_KEY', 'MAILERSEND_API_KEY',
        'EMAIL_FROM', 'EMAIL_FROM_NAME',
        'MAILERSEND_SENDER_EMAIL', 'MAILERSEND_SENDER_NAME',
        'AWS_SES_REGION', 'AWS_SES_ACCESS_KEY_ID', 'AWS_SES_SECRET_ACCESS_KEY',
        'AWS_SES_FROM_EMAIL', 'AWS_SES_FROM_NAME'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = 'get_worker_secret'
              AND pg_get_functiondef(p.oid) LIKE '%' || secret_name || '%'
        ) THEN
            RAISE EXCEPTION 'email secret % is not on the get_worker_secret allow-list', secret_name;
        END IF;
    END LOOP;
END
$$;
