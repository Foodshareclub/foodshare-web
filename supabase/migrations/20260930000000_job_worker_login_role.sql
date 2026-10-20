-- Give the job-worker its own login credential
--
-- What this closes
-- ----------------------------------------------------------------------
-- 20260927000000 created `job_worker` as a NOLOGIN group role and documented,
-- in both that migration and docs/rust-migration.md §5, that the container
-- authenticated with the stack's shared superuser credential and dropped to
-- the group role with SET ROLE. That narrowed what a *query* could do and made
-- the grant set reviewable, but it did not remove the credential: the
-- superuser password was still sitting in the worker's environment, in the
-- container's `DATABASE_URL`, in `podman inspect`, and in any crash dump.
--
-- This migration adds the missing half. `job_worker_app` is a LOGIN role that
-- carries no table privileges of its own — it is a member of `job_worker`, so
-- every privilege it exercises arrives through the group role and is visible
-- in exactly the same place it always was. What it adds is a password the
-- superuser does not share.
--
-- Why a new role rather than making `job_worker` itself LOGIN
-- ----------------------------------------------------------------------
-- Two reasons, and the second is the one that matters:
--
--   1. `job_worker` is named in four RLS policies (`FOR ALL TO job_worker`).
--      Making it LOGIN would mean the RLS policies and the login identity are
--      the same thing, so `SET ROLE` becomes a no-op and the distinction
--      between "who connects" and "whose grants apply" is gone.
--   2. A dedicated role gives the connection limit something to bite on.
--      `job_worker` as a group role has no `CONNECTION LIMIT`; as a login role
--      it does. A runaway pool or a duplicate replica now fails to connect
--      instead of silently multiplying the worker's presence in `pg_stat_activity`.
--
-- The password lifecycle
-- ----------------------------------------------------------------------
-- The role is created with NO PASSWORD. That is deliberate, and it is the
-- fail-closed state: a LOGIN role with no password cannot authenticate, so if
-- the rotation below is never run the worker refuses to start rather than
-- starting with a credential nobody chose. There is no default, no generated
-- value, and no password in this file — a secret in a migration is a secret in
-- git history forever.
--
-- Set it from the Vault, which is the single source of truth for credentials
-- in this stack (CLAUDE.md rule 10):
--
--   ./scripts/deploy.sh set-secret WORKER_DB_PASSWORD "$(openssl rand -base64 48)"
--   podman exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     -f scripts/sql/set-worker-password.sql
--
-- The rotation script is idempotent and safe to re-run; that is the rotation
-- path too, not just first-time setup.
--
-- Note that the worker reads `.env.functions` (compose `env_file`), so
-- `WORKER_DB_PASSWORD` lands in the same file the edge functions read. That is
-- a deliberate trade: the deny-list in `scripts/deploy.sh` withholds the
-- *superuser* credential from the edge runtime, and this one is not the
-- superuser credential. Its blast radius if leaked is the `job_worker` grant
-- set — six tables and one audited accessor — rather than the whole database.
--
-- `NOINHERIT` on the login role is required, not cosmetic: it is what makes
-- `SET ROLE job_worker` in `fs-db`'s pool do real work. With INHERIT the
-- group role's privileges would be active from the moment of connection and
-- the SET ROLE would pass while proving nothing, which is precisely the
-- failure mode a startup check that only asserts success is supposed to catch.

-- ─────────────────────────────────────────────────────────────────────
-- 1. The login role
-- ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'job_worker_app') THEN
        CREATE ROLE job_worker_app
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            NOINHERIT
            NOREPLICATION
            NOBYPASSRLS
            -- Sits above the worker's DB_MAX_CONNECTIONS of 8 so a replica
            -- or a runaway pool is rejected by Postgres rather than
            -- competing for the same connections.
            CONNECTION LIMIT 10;
    END IF;
END
$$;

COMMENT ON ROLE job_worker_app IS
  'Login role for the Rust job-worker container. Deliberately holds no table '
  'privileges of its own: it is a member of job_worker, so its authority is '
  'exactly the job_worker grant set and nothing more. Created without a '
  'password (fail-closed) and rotated from the Vault by '
  'scripts/sql/set-worker-password.sql.';

-- ─────────────────────────────────────────────────────────────────────
-- 2. Membership
--
-- `GRANT` is idempotent, so this is safe to re-apply. The membership is the
-- entire grant surface: there is deliberately no table grant to
-- `job_worker_app` anywhere in this file, and the verification block below
-- asserts that, because a direct grant added later would show up in
-- `pg_policies` as a policy nobody reasoned about.
-- ─────────────────────────────────────────────────────────────────────

GRANT job_worker TO job_worker_app;

-- The Vault accessor is `SECURITY DEFINER` and executes as its owner, but
-- EXECUTE is a separate grant from the function body — membership in
-- `job_worker` would not be enough here if this were ever revoked from the
-- group, so it is granted explicitly to the login role too. Both paths are
-- asserted below.
GRANT EXECUTE ON FUNCTION public.get_worker_secret(text) TO job_worker_app;

-- ─────────────────────────────────────────────────────────────────────
-- 3. Verify the outcome
--
-- A silently-partial apply must fail here, not at the worker's first query as
-- an opaque `password authentication failed` or a `permission denied` three
-- jobs in.
-- ─────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    app_role record;
    direct_table_grants text;
BEGIN
    SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls,
           rolreplication, rolinherit, rolconnlimit
    INTO app_role
    FROM pg_roles
    WHERE rolname = 'job_worker_app';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'job_worker_app role was not created';
    END IF;

    -- The properties that make this a least-privilege login rather than a
    -- second superuser. Each is checked by name because each has a distinct
    -- failure mode, and a role that is LOGIN + BYPASSRLS would look
    -- correct in a glance at the CREATE statement.
    IF NOT app_role.rolcanlogin THEN
        RAISE EXCEPTION 'job_worker_app must be LOGIN — it is the role the container authenticates as';
    END IF;
    IF app_role.rolsuper THEN
        RAISE EXCEPTION 'job_worker_app must be NOSUPERUSER';
    END IF;
    IF app_role.rolcreatedb OR app_role.rolcreaterole THEN
        RAISE EXCEPTION 'job_worker_app must not be able to create databases or roles';
    END IF;
    IF app_role.rolbypassrls THEN
        RAISE EXCEPTION 'job_worker_app must not have BYPASSRLS — the worker relies on explicit USING (true) policies';
    END IF;
    IF app_role.rolreplication THEN
        RAISE EXCEPTION 'job_worker_app must not have replication rights';
    END IF;
    -- With INHERIT the SET ROLE in the pool would succeed while changing
    -- nothing, and the least-privilege story would rest on an assertion
    -- rather than on a mechanism.
    IF app_role.rolinherit THEN
        RAISE EXCEPTION 'job_worker_app must be NOINHERIT so SET ROLE job_worker is what grants the privileges';
    END IF;
    IF app_role.rolconnlimit <> 10 THEN
        RAISE EXCEPTION 'expected a connection limit of 10 on job_worker_app, found %',
            app_role.rolconnlimit;
    END IF;

    -- Membership in the group role is the whole point: without it the
    -- container authenticates successfully and then fails on its first
    -- SELECT, which is the worst possible time to discover it.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_auth_members m
        JOIN pg_roles member ON member.oid = m.member
        JOIN pg_roles granted ON granted.oid = m.roleid
        WHERE member.rolname = 'job_worker_app'
          AND granted.rolname = 'job_worker'
    ) THEN
        RAISE EXCEPTION 'job_worker_app is not a member of job_worker';
    END IF;

    -- No direct table grants. `information_schema.role_table_grants` reports
    -- direct grants only, which is what makes this assertion meaningful:
    -- privileges arriving through the group role are correct and are
    -- asserted as working in crates/fs-db/tests/role.rs.
    SELECT string_agg(DISTINCT table_name, ', ')
    INTO direct_table_grants
    FROM information_schema.role_table_grants
    WHERE grantee = 'job_worker_app';

    IF direct_table_grants IS NOT NULL THEN
        RAISE EXCEPTION
            'job_worker_app must hold no table grants of its own; found: %',
            direct_table_grants;
    END IF;

    -- And the accessor it needs for secrets.
    IF NOT has_function_privilege(
        'job_worker_app', 'public.get_worker_secret(text)', 'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'job_worker_app cannot execute public.get_worker_secret';
    END IF;
END
$$;
