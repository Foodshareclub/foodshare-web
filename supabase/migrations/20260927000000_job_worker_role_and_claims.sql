-- Introduce the `job_worker` role and the schema the Rust worker needs
--
-- The Rust `job-worker` service (services/) replaces the edge-runtime cron
-- work — digest delivery, the translation queue drain and translation
-- backfill. All three need database access that no existing role provides.
--
-- Why a new role rather than reusing `service_role`
-- ----------------------------------------------------------------------
-- Every edge function reaches Postgres through PostgREST with the
-- `service_role` key, which carries BYPASSRLS. That is a blunt instrument
-- for code that only ever touches six tables, and it is why the audit
-- trail for those operations is "which edge function did it" rather than
-- "which principal and which policy allowed it".
--
-- `job_worker` gets:
--
--   * SELECT/INSERT/UPDATE on exactly the tables the jobs touch;
--   * no DDL, no DELETE, no access to `auth`;
--   * an explicit RLS policy per table rather than BYPASSRLS, so the
--     bypass is visible in `pg_policies` instead of being a property of
--     the role;
--   * no access to `vault` except through the audited accessor below.
--
-- It is a NOLOGIN group role. The container authenticates with the
-- existing credential and issues `SET ROLE job_worker` on every pooled
-- connection; the service refuses to start if that fails. Stated plainly
-- so it is not mistaken for something stronger: the container still holds
-- the superuser password, so this migration narrows what the worker's
-- *queries* can do and makes the grant set reviewable, but it does not
-- remove the credential. Giving the worker its own password is tracked as
-- follow-up work in docs/rust-migration.md.
--
-- digest status gains 'processing'
-- ----------------------------------------------------------------------
-- The Deno digest path read pending rows and marked them sent in a second
-- request, so two workers could deliver the same digest. The Rust worker
-- claims with `FOR UPDATE SKIP LOCKED` and flips rows to 'processing' in
-- the same statement; the write-back only touches rows it still owns
-- (`status = 'processing'`), which makes the operation idempotent.
--
-- `requeue_stale_digest_items` returns anything left in 'processing' past
-- its window, so a worker that dies mid-delivery cannot strand a user's
-- digests permanently.
--
-- The CHECK constraint is dropped and re-added rather than altered, so the
-- new state is validated inside this transaction and the service never
-- observes a value the old constraint forbids.
--
-- Statement ordering
-- ----------------------------------------------------------------------
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block, so the
-- two claim indexes come first, before anything else in this file. psql is
-- invoked with ON_ERROR_STOP=1 and no wrapping BEGIN, so each statement is
-- its own transaction — the same convention as
-- 20260905000000_fix_forum_slug_indexes.sql.

-- ─────────────────────────────────────────────────────────────────────
-- 1. Claim indexes (CONCURRENTLY — must precede everything else)
-- ─────────────────────────────────────────────────────────────────────

-- Both claim queries filter on `status` and order by a time column. The
-- existing primary-key and GIN indexes do not help either: these tables
-- retain history (`translation_queue` keeps every processed row;
-- `notification_digest_queue` keeps a row per delivered notification), so
-- a full index would grow without bound while the query's predicate
-- remained selective.
--
-- The partial predicate keeps each index to the rows that can actually be
-- claimed, and makes the index usable by the claim query without the
-- planner having to prove selectivity.
CREATE INDEX CONCURRENTLY IF NOT EXISTS translation_queue_claim_idx
    ON public.translation_queue (created_at, id)
    WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_digest_claim_idx
    ON public.notification_digest_queue (scheduled_for, id)
    WHERE status = 'pending';

-- The reaper scans for abandoned 'processing' rows. A separate partial
-- index because the predicate is the opposite one.
CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_digest_processing_idx
    ON public.notification_digest_queue (scheduled_for)
    WHERE status = 'processing';

COMMENT ON INDEX public.translation_queue_claim_idx IS
  'Partial claim index for job-worker: pending rows only, ordered for the '
  'FOR UPDATE SKIP LOCKED claim. Created CONCURRENTLY to avoid blocking '
  'inserts on a continuously written table.';
COMMENT ON INDEX public.notification_digest_claim_idx IS
  'Partial claim index for job-worker: pending rows only, ordered by the '
  'schedule time the claim filters on.';
COMMENT ON INDEX public.notification_digest_processing_idx IS
  'Supports requeue_stale_digest_items(), which recovers rows abandoned by '
  'a worker that died mid-delivery.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. digest status gains 'processing'
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.notification_digest_queue
    DROP CONSTRAINT IF EXISTS notification_digest_queue_status_check;

ALTER TABLE public.notification_digest_queue
    ADD CONSTRAINT notification_digest_queue_status_check
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'expired'));

COMMENT ON COLUMN public.notification_digest_queue.status IS
  'pending -> processing is an atomic FOR UPDATE SKIP LOCKED claim by '
  'job-worker. processing -> sent/failed is the write-back, which only '
  'touches rows still marked processing, so it is idempotent. A row left in '
  'processing past its window is returned to pending by '
  'requeue_stale_digest_items().';

-- ─────────────────────────────────────────────────────────────────────
-- 3. The role
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
        CREATE ROLE job_worker
            NOLOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION
            NOBYPASSRLS;
        COMMENT ON ROLE job_worker IS
          'Least-privilege role for the Rust job-worker service. Reached via '
          'SET ROLE from the container connection. Grants only what the '
          'digest, translation-queue and backfill jobs need.';
    END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 4. Grants
--
-- Scoped per table and per operation rather than a blanket GRANT, and
-- deliberately without DELETE anywhere: no job deletes from these tables.
-- `old_notification_digest_queue` retention is a separate concern handled
-- by a cleanup job that runs as a privileged role.
-- ─────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO job_worker;

-- Digest delivery: read the queue, resolve targets, record outcomes.
GRANT SELECT, UPDATE ON public.notification_digest_queue TO job_worker;
GRANT SELECT ON public.profiles TO job_worker;
GRANT SELECT ON public.email_suppressions TO job_worker;
GRANT SELECT ON public.notification_preferences TO job_worker;
GRANT SELECT ON public.device_tokens TO job_worker;
GRANT SELECT, INSERT ON public.notification_delivery_log TO job_worker;

-- Translation drain and backfill.
--
-- INSERT is required for the backfill job, which enqueues translation work
-- for content that has none. It was missed in the first draft of this
-- migration and surfaced as a `permission denied` on the first backfill run
-- against the migrated database, which is the test now pinned below.
GRANT SELECT, INSERT, UPDATE ON public.translation_queue TO job_worker;
GRANT SELECT, INSERT, UPDATE ON public.dynamic_content_translations TO job_worker;
GRANT SELECT ON public.posts TO job_worker;
GRANT SELECT ON public.challenges TO job_worker;
GRANT SELECT ON public.forum_posts TO job_worker;

-- `notification_delivery_log` uses a BIGSERIAL identity column.
GRANT USAGE, SELECT ON SEQUENCE public.notification_delivery_log_id_seq TO job_worker;

-- ─────────────────────────────────────────────────────────────────────
-- 5. RLS policies
--
-- The worker connects directly to `db`, not through PostgREST, so
-- `auth.uid()` is NULL and every existing policy evaluates to false —
-- the worker would see zero rows. Rather than granting BYPASSRLS, which
-- is an invisible property of the role, each table gets one explicit
-- policy scoped to `job_worker`.
--
-- These say precisely what they mean: this role, on this table, may see
-- and write every row. They appear in `pg_policies`, so a reviewer can
-- find them, and a table added later without a matching policy fails
-- closed for the worker.
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.notification_digest_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_content_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_worker_digest_queue ON public.notification_digest_queue;
CREATE POLICY job_worker_digest_queue ON public.notification_digest_queue
    FOR ALL TO job_worker
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS job_worker_translation_queue ON public.translation_queue;
CREATE POLICY job_worker_translation_queue ON public.translation_queue
    FOR ALL TO job_worker
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS job_worker_dynamic_content_translations
    ON public.dynamic_content_translations;
CREATE POLICY job_worker_dynamic_content_translations
    ON public.dynamic_content_translations
    FOR ALL TO job_worker
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS job_worker_notification_delivery_log
    ON public.notification_delivery_log;
CREATE POLICY job_worker_notification_delivery_log
    ON public.notification_delivery_log
    FOR ALL TO job_worker
    USING (true) WITH CHECK (true);

-- The three content tables are read-only for the worker, and their
-- existing policies already permit reading. No worker policy is added:
-- if a future grant is broadened, these stay read-only by omission, which
-- is the direction that fails safe.

-- ─────────────────────────────────────────────────────────────────────
-- 6. The Vault accessor
--
-- `get_secret_audited` is not usable here. Its allow-list holds six
-- secret names, none of which the worker needs, and it attributes the read
-- to `auth.uid()`, which is NULL for a direct connection — so every call
-- would return NULL and every provider would look unconfigured.
--
-- `get_worker_secret` is a separate, narrower function: an explicit
-- allow-list of exactly the names the worker may read, granted only to
-- `job_worker`, with every attempt written to `audit.vault_access_log`
-- including the refusals. A denied read is a row in the audit table, not
-- a silent NULL, because a silent NULL is indistinguishable from a secret
-- that was never set.
-- ─────────────────────────────────────────────────────────────────────

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
        'APPLE_ROOT_CA_FINGERPRINTS'
    ];
    secret_value text;
    access_granted boolean := false;
BEGIN
    IF p_secret_name = ANY (allowed_secrets) THEN
        SELECT decrypted_secret INTO secret_value
        FROM vault.decrypted_secrets
        WHERE name = p_secret_name;
        access_granted := (secret_value IS NOT NULL);
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

-- `anon` and `authenticated` are Supabase roles and are absent when this
-- migration is applied against a bare schema (the `validate-migrations` CI
-- job builds one). Revoking from a role that does not exist is an error, so
-- the revocation is conditional. `PUBLIC` above already covers the case
-- that matters: a function is executable by PUBLIC by default, and that
-- grant is what an unauthenticated PostgREST caller would use.
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
--
-- A migration that silently failed to create the role would leave the
-- worker unable to start with an opaque "permission denied" at first
-- query. These assertions turn that into a loud failure here instead.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    expected record;
    policy_count integer;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker') THEN
        RAISE EXCEPTION 'job_worker role was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'get_worker_secret'
    ) THEN
        RAISE EXCEPTION 'public.get_worker_secret was not created';
    END IF;

    -- One USING (true) policy per table, on the right table. Asserted
    -- individually because a policy that landed on the wrong table would
    -- leave the worker reading zero rows from the one that lost it.
    FOR expected IN
        SELECT * FROM (VALUES
            ('notification_digest_queue',          'job_worker_digest_queue'),
            ('translation_queue',                  'job_worker_translation_queue'),
            ('dynamic_content_translations',       'job_worker_dynamic_content_translations'),
            ('notification_delivery_log',          'job_worker_notification_delivery_log')
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
END
$$;
