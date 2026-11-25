-- Migration: Give the auth schema's objects back to supabase_auth_admin
-- The R2 restore recreated every table, sequence, function and type in `auth` as
-- supabase_admin (production on 2026-11-25: all 23 tables, the one sequence, the
-- 4 functions and the 9 enums). GoTrue connects as supabase_auth_admin with
-- search_path=auth and runs its own migrations there. Those migrations ALTER
-- tables (`enable row level security`, `add column`, `create index`) and
-- CREATE OR REPLACE auth.uid()/role()/email()/jwt(); PostgreSQL allows both only
-- for the owner, so the first GoTrue upgrade that ships a new migration would
-- fail at start and take sign-in down. The restore also dropped grants the stock
-- layout has (anon and service_role lost USAGE on the schema, so `SET ROLE anon;
-- SELECT auth.uid()` fails with "permission denied for schema auth" while 179
-- policies for anon/public call auth.*).
--
-- Stock layout, from the supabase/postgres:17.6.1.166 image
-- (/docker-entrypoint-initdb.d) and GoTrue v2.186.0 (/usr/local/etc/auth/migrations):
--   * init-scripts/00000000000001-auth-schema.sql:3 the schema is created
--     AUTHORIZATION supabase_admin, so the schema owner stays supabase_admin
--     (this migration does not change it).
--   * init-scripts/00000000000001-auth-schema.sql:109 usage on the schema for
--     anon, authenticated and service_role; :113-116 all on the schema, tables
--     and sequences for supabase_auth_admin; :117-121 the first tables are
--     OWNER TO supabase_auth_admin. Every later table is created by GoTrue
--     (00_init_auth_schema.up.sql and the rest), connecting as that role.
--   * migrations/20211115181400_update-auth-permissions.sql:14-20 usage on the
--     schema for postgres, all on tables, sequences and routines for postgres and
--     dashboard_user, and the matching default privileges FOR ROLE
--     supabase_auth_admin.
--   * migrations/20211124212715_update-auth-owner.sql:6-20 auth.uid(), auth.role()
--     and auth.email() are owned by supabase_auth_admin. auth.jwt() is created by
--     GoTrue migration 20220531120530_add_auth_jwt_function.up.sql:56 running as
--     that role, so it is owned by it too.
--   * init-scripts/00000000000003-post-setup.sql:106-113 dashboard_user gets all
--     on the schema, its tables, sequences and routines.
--   * migrations/20250421084701_revoke_admin_roles_from_postgres.sql:17-21
--     postgres loses CREATE on the schema, and postgres and dashboard_user lose
--     everything on auth.schema_migrations; GoTrue's
--     20240612123726_enable_rls_update_grants.up.sql:20 then gives postgres
--     SELECT on it with grant option.
--
-- Function EXECUTE is preserved. auth.uid() and auth.role() carry PUBLIC=X,
-- authenticated=X and an explicit entry for the old owner; ALTER FUNCTION ... OWNER
-- rewrites the owner's entry to the new owner and keeps every other entry, and
-- auth.jwt()/auth.email() keep the default ACL (EXECUTE for PUBLIC). The
-- GRANT ALL ON ALL ROUTINES below only adds postgres and dashboard_user.
--
-- No data, RLS policy or existing grant is removed, except postgres and
-- dashboard_user on auth.schema_migrations, which the stock layout takes away.
-- Idempotent: ALTER ... OWNER to the current owner and repeated GRANTs are no-ops.
-- Skips entirely where the auth schema or the role does not exist, so it only
-- acts on a real Supabase database (and on the oracle's stub `auth` schema,
-- where it only changes owners and grants). Runs as supabase_admin, which is a
-- superuser, so it may give objects to supabase_auth_admin.
DO $$
DECLARE
  r record;
  api_roles text;
  admin_roles text;
BEGIN
  IF to_regnamespace('auth') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    RAISE NOTICE 'auth schema or supabase_auth_admin missing; nothing to restore';
    RETURN;
  END IF;
  -- Schema access first: ALTER ... OWNER needs CREATE on the schema for the new owner.
  GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
  -- Tables, views, materialized views, partitioned tables. Indexes, TOAST tables and
  -- row types follow their table, and so do sequences that belong to a column
  -- (`bigserial` auth.refresh_tokens_id_seq, an identity column's sequence):
  -- ALTER SEQUENCE ... OWNER fails with "linked to table" for those. Only sequences
  -- no column owns are listed.
  FOR r IN
    SELECT c.oid::regclass AS rel, c.relkind
    FROM pg_class c
    WHERE c.relnamespace = 'auth'::regnamespace
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('e', 'i'))
      AND NOT (c.relkind = 'S' AND EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'a'))
      AND pg_get_userbyid(c.relowner) <> 'supabase_auth_admin'
    ORDER BY c.oid
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO supabase_auth_admin',
      CASE r.relkind
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'S' THEN 'SEQUENCE'
        WHEN 'f' THEN 'FOREIGN TABLE'
        ELSE 'TABLE'
      END,
      r.rel
    );
  END LOOP;
  -- Functions, procedures and aggregates that are not extension members.
  FOR r IN
    SELECT p.oid::regprocedure AS fn, p.prokind
    FROM pg_proc p
    WHERE p.pronamespace = 'auth'::regnamespace
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND pg_get_userbyid(p.proowner) <> 'supabase_auth_admin'
    ORDER BY p.oid
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO supabase_auth_admin',
      CASE r.prokind WHEN 'p' THEN 'PROCEDURE' WHEN 'a' THEN 'AGGREGATE' ELSE 'FUNCTION' END,
      r.fn
    );
  END LOOP;
  -- Standalone enum and domain types (auth.aal_level, auth.factor_type, ...). Array
  -- types and row types follow their element or table.
  FOR r IN
    SELECT t.oid::regtype AS typ, t.typtype
    FROM pg_type t
    WHERE t.typnamespace = 'auth'::regnamespace
      AND t.typtype IN ('e', 'd')
      AND t.typelem = 0
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
      AND pg_get_userbyid(t.typowner) <> 'supabase_auth_admin'
    ORDER BY t.oid
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO supabase_auth_admin',
      CASE r.typtype WHEN 'd' THEN 'DOMAIN' ELSE 'TYPE' END,
      r.typ
    );
  END LOOP;
  -- Stock grants. Role lists are built from the roles that exist, so a database
  -- without dashboard_user (the oracle) still applies.
  SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname) INTO api_roles
  FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role');
  SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname) INTO admin_roles
  FROM pg_roles WHERE rolname IN ('postgres', 'dashboard_user');
  IF api_roles IS NOT NULL THEN
    EXECUTE format('GRANT USAGE ON SCHEMA auth TO %s', api_roles);
  END IF;
  IF admin_roles IS NOT NULL THEN
    -- postgres gets usage only (CREATE was revoked by 20250421084701); dashboard_user all.
    EXECUTE format('GRANT USAGE ON SCHEMA auth TO %s', admin_roles);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA auth TO %s', admin_roles);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO %s', admin_roles);
    EXECUTE format('GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO %s', admin_roles);
    -- Tables GoTrue creates later are owned by supabase_auth_admin.
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO %s', admin_roles);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO %s', admin_roles);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON ROUTINES TO %s', admin_roles);
    IF to_regclass('auth.schema_migrations') IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON auth.schema_migrations FROM %s', admin_roles);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dashboard_user') THEN
    GRANT ALL ON SCHEMA auth TO dashboard_user;
  END IF;
  IF to_regclass('auth.schema_migrations') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT SELECT ON auth.schema_migrations TO postgres WITH GRANT OPTION;
  END IF;
END
$$;
