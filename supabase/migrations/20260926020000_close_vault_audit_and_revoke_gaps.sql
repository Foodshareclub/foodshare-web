-- Close two gaps left by the Stage-1 function lockdown
-- (20260925000000_lock_down_function_execute_privileges.sql).
--
-- Gap 1: five secret-returning helpers were not on the Stage-1 list.
-- ----------------------------------------------------------------------
-- 20260812225000_fix_permissions_and_schema_cache.sql ran
--   GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon,
--         authenticated, service_role;
-- Stage 1 revoked nine function names. These five return raw Vault values and
-- were missed:
--
--   get_resend_api_key()       -> vault.read_secret('RESEND_API_KEY')
--   get_upstash_redis_url()    -> vault.read_secret('UPSTASH_REDIS_URL')
--   get_upstash_redis_token()  -> vault.read_secret('UPSTASH_REDIS_TOKEN')
--   get_airtable_api_token()   -> vault.read_secret('AIRTABLE_API_TOKEN')
--   get_airtable_key()         -> vault.read_secret('AIRTABLE_API_KEY')
--
-- With the public anon key, PostgREST could call any of them and receive the
-- decrypted secret. get_resend_api_key is the sharpest: a live transactional
-- email credential handed to an unauthenticated caller.
--
-- The list is DISCOVERED from the function bodies rather than repeated as a name
-- array. A name array is exactly what let this happen: Stage 1's list was
-- written from the functions known to be sensitive at the time, and five more
-- were not known. Deriving the set means a Vault-reading function added next
-- month is covered by the same rule instead of by remembering to edit a list.
--
-- Detection reads pg_proc.prosrc. That is textual, and deliberately so:
-- pg_depend/deptype='e' only records *extension* membership, so it cannot see
-- that a plpgsql body selects from vault.decrypted_secrets. Two pattern groups
-- are matched, direct and one-hop-wrapper, because a thin wrapper with no Vault
-- reference of its own is what a single pattern misses.
--
-- What the scan finds in this schema, verified against the migration sources
-- rather than assumed. Recorded here because a discovery rule you cannot
-- predict is a discovery rule you cannot review:
--
--   Already revoked by Stage 1 (20260925000000), re-matched harmlessly:
--     get_vault_secret  get_secrets  get_secret_audited
--     (get_vault_failure_count reads audit.vault_access_log, not the Vault, so
--      the body scan does not match it — Stage 1's name list covers it)
--
--   The five this migration exists for, each returning a raw decrypted value:
--     get_resend_api_key        -> RESEND_API_KEY
--     get_upstash_redis_url     -> UPSTASH_REDIS_URL
--     get_upstash_redis_token   -> UPSTASH_REDIS_TOKEN
--     get_airtable_api_token    -> AIRTABLE_API_TOKEN
--     get_airtable_key          -> AIRTABLE_API_KEY
--
--   Fourteen more the name list had also missed. Eight are TRIGGER functions,
--   which are worse than the five above rather than better: a trigger that
--   selects a Vault value can be invoked through PostgREST like any other RPC.
--     on_email_queued
--     trigger_email_provider_sync
--     trigger_email_queue_processing
--     trigger_translate_post
--     trigger_translate_forum_post
--     trigger_translate_challenge
--     sync_locale_to_redis
--     invoke_upstash_health_check
--   The remaining six return existence metadata rather than values. Revoking
--   them is hygiene, and the only expected breakage:
--     check_vault_secret_exists  list_required_secrets
--     get_openai_api_key  (already dropped by 20260305191500, so absent)
--
--   Trigger execution does not check the invoking role's EXECUTE privilege on
--   the trigger function — the trigger mechanism invokes it — so revoking these
--   does not stop a trigger from firing.
--
-- The block below RAISEs if the scan matches nothing. That is the property that
-- matters: a discovery rule that silently stops matching leaves the fleet
-- exactly as exposed as it is now while reporting success, which is the failure
-- mode a name list already had once.
--
-- Gap 2: audit.vault_access_log was read and written but never created.
-- ----------------------------------------------------------------------
-- Twelve references across the baseline and the edge functions, and no
-- CREATE TABLE anywhere in supabase/migrations:
--
--   INSERT ... audit.vault_access_log   20260128195318_baseline.sql:12022
--                                      supabase/functions/api-v1-auth/lib/rate.ts:81
--   SELECT ... audit.vault_access_log   baseline:2081  (check_rate_limit)
--                                      baseline:14303,14308,14314,14319
--                                      baseline:14380 (get_vault_failure_count)
--
-- Both consequences are silent:
--   * get_secret_audited() raises "relation does not exist" on every call, so
--     the Rust job-worker — whose only Vault path is that function
--     (services/crates/fs-db/src/vault.rs:142) — can never read a secret. It
--     logs a warning and carries on with the secret absent, so the failure looks
--     like a missing optional provider key.
--   * The audit trail the code relies on ("Vault's access log records who read
--     what", services/crates/fs-db/src/vault.rs:19-23) does not exist.
--
-- Schema: the two writers use different vocabularies for the outcome. The SQL
-- writer emits access_granted/access_method; the Deno writer emits
-- access_result/additional_info. The readers filter on access_granted and
-- accessed_at. This migration creates the union and backfills one from the
-- other, so both writers keep working and the readers get one consistent view.
-- The Deno writer is deliberately left unchanged — rewriting it would require a
-- coordinated edge-function deploy inside a privilege migration.
--
-- Tamper evidence: revoked from anon/authenticated, RLS on, no policies. A
-- privileged role can still delete rows; that is the boundary of an in-database
-- audit log and is stated here rather than implied. Anything stronger needs an
-- external sink.

BEGIN;

-- ----------------------------------------------------------------------
-- 1. The audit table the code has been assuming exists.
-- ----------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.vault_access_log (
  id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  -- Nullable by design, not by omission: the api-v1-auth writer is called
  -- pre-authentication and has no user to attribute.
  user_id         UUID,
  user_role       TEXT,
  secret_name     TEXT        NOT NULL,
  -- Union of both writers' vocabulary. Exactly one of access_granted /
  -- access_result is expected per row; the CHECK keeps that honest without
  -- forcing the edge-function change into this migration.
  access_granted  BOOLEAN,
  access_method   TEXT,
  access_result   TEXT,
  additional_info JSONB,
  ip_address      INET,
  user_agent      TEXT,
  request_id      TEXT,
  accessed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vault_access_log_one_outcome
    CHECK (access_granted IS NOT NULL OR access_result IS NOT NULL)
);

COMMENT ON TABLE audit.vault_access_log IS
  'Log of Supabase Vault reads. Written by get_secret_audited() and the '
  'api-v1-auth rate limiter; read by check_rate_limit(), '
  'get_user_vault_access_summary() and get_vault_failure_count(). Revoked from '
  'client roles. A privileged role can still tamper, which is the documented '
  'limit of an in-database audit log.';
COMMENT ON COLUMN audit.vault_access_log.access_result IS
  'Outcome vocabulary used by edge-function writers that bypass '
  'get_secret_audited(). Backfilled into access_granted on insert.';

CREATE INDEX IF NOT EXISTS vault_access_log_secret_name_idx
  ON audit.vault_access_log (secret_name);
CREATE INDEX IF NOT EXISTS vault_access_log_user_id_idx
  ON audit.vault_access_log (user_id);
CREATE INDEX IF NOT EXISTS vault_access_log_accessed_at_idx
  ON audit.vault_access_log (accessed_at DESC);

-- Deny by grant, not by policy. REVOKE is the mechanism Supabase's own
-- GRANT-ALL migrations used against us, so it is the one guaranteed to be
-- effective; RLS with zero policies is belt-and-braces for any future
-- GRANT mistake. FORCE is deliberately NOT set: get_secret_audited() is
-- SECURITY DEFINER and must keep writing, and the grant revocation above is
-- what actually denies client roles.
ALTER TABLE audit.vault_access_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit.vault_access_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA audit FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA audit TO service_role;
GRANT SELECT, INSERT ON audit.vault_access_log TO service_role;

-- Readers filter on access_granted; unify the two writers' vocabularies so they
-- see both. A CHECK constraint cannot be added to a pre-existing table, so this
-- is applied before the constraint above can be violated by an old row.
UPDATE audit.vault_access_log
   SET access_granted = (access_result IN ('granted', 'ok', 'success'))
 WHERE access_granted IS NULL
   AND access_result IS NOT NULL;

-- ----------------------------------------------------------------------
-- 2. Revoke every Vault-returning function, discovered from the bodies.
-- ----------------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
  n  INT := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prokind = 'f'
      AND (
        -- (a) reads a Vault relation directly
        p.prosrc ILIKE '%vault.decrypted_secrets%'
        OR p.prosrc ILIKE '%vault.secrets%'
        OR p.prosrc ILIKE '%vault.read_secret%'
        OR p.prosrc ILIKE '%vault.create_secret%'
        OR p.prosrc ILIKE '%vault.update_secret%'
        -- (b) one hop through a public function that does. A thin wrapper
        -- carrying no Vault text of its own is what a single pattern misses.
        OR p.prosrc ILIKE '%get_vault_secret(%'
        OR p.prosrc ILIKE '%get_secret_audited(%'
        OR p.prosrc ILIKE '%get_vault_failure_count(%'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    n := n + 1;
  END LOOP;

  -- A silent zero would leave the fleet exactly as exposed as it is now while
  -- reporting success. Refusing is the only safe outcome: either introspection
  -- stopped matching, in which case Stage 1's list is the last defence and a
  -- human needs to know, or the functions are gone, in which case this
  -- migration has nothing to do.
  IF n = 0 THEN
    RAISE EXCEPTION
      'no Vault-returning functions found in schema public. Refusing to apply. '
      'Investigate: either function bodies no longer match (prosrc patterns need '
      'updating) or every such function was already dropped.';
  END IF;

  RAISE NOTICE 'revoked client EXECUTE on % Vault-returning function(s)', n;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
