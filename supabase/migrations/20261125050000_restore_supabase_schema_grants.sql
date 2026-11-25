-- Migration: Give the Supabase-managed schemas their stock grants back
-- The R2 restore recreated the platform schemas without the privileges the stock
-- layout gives them. Read-only inventory of production on 2026-11-25:
--   extensions      NULL ACL    anon, authenticated and service_role have no USAGE, so
--                               every call into PostGIS, pgcrypto, uuid-ossp, pg_trgm,
--                               vector or http fails with "permission denied for schema
--                               extensions" (POST api-v1-products with a user JWT: 500).
--                               postgres and dashboard_user hold no grant on the 3 tables,
--                               3 sequences and 1776 routines either.
--   graphql         NULL ACL    anon, authenticated and service_role cannot resolve.
--   graphql_public  NULL ACL    no USAGE, no default privileges, and graphql_public.graphql()
--                               itself is missing, so Kong's /graphql/v1 route
--                               (rpc/graphql, Content-Profile graphql_public) cannot work.
--   pgbouncer       NULL ACL    owner supabase_admin instead of pgbouncer, so Supavisor's
--                               auth_query (volumes/pooler/pooler.exs:15, db_user pgbouncer)
--                               gets "permission denied for schema pgbouncer"; get_auth() is
--                               executable by PUBLIC.
--   realtime        no grants   postgres and dashboard_user hold nothing on the 9 tables,
--                               the sequence and the routines, and there are no default
--                               privileges.
-- Everything below is what the supabase/postgres:17.6.1.166 image
-- (/docker-entrypoint-initdb.d, paths below are relative to it) grants. Nothing is
-- widened beyond it:
--   * extensions
--       init-scripts/00000000000000-initial-schema.sql:45 USAGE for postgres, anon,
--         authenticated, service_role.
--       migrations/10000000000000_demote-postgres.sql:6,8,10,12 ALL on the schema, tables,
--         sequences and routines for postgres.
--       init-scripts/00000000000003-post-setup.sql:107,109,112,114 the same for dashboard_user.
--       migrations/20230224042246_grant_extensions_perms_for_postgres.sql:2-7 postgres gets
--         ALL on tables, routines and sequences WITH GRANT OPTION, plus the matching default
--         privileges (run by supabase_admin, so FOR ROLE supabase_admin).
--       The stock layout grants no EXECUTE on extension routines to anon, authenticated or
--         service_role: routines keep the PostgreSQL default (EXECUTE for PUBLIC), and
--         pg_stat_statements/pg_stat_monitor restrict their own. Schema USAGE is the gate,
--         and this migration touches no routine ACL for those roles.
--   * graphql (pg_graphql; the 17.6.1.166 trigger, migrations/20260421000001_rescope_pg_graphql_access_trigger.sql)
--       :39 USAGE for postgres, anon, authenticated, service_role; :40 EXECUTE on
--         graphql.resolve for them; :41 USAGE for postgres WITH GRANT OPTION.
--       Not restored: the table, function and sequence grants and the default privileges the
--         earlier trigger (migrations/20220613123923_pg_graphql-pg-dump-perms.sql:42-47,
--         20231017062225:42-47) added. 20260421000000 drops the extension and the schema with
--         it, and the rescoped trigger no longer grants them.
--   * graphql_public
--       migrations/20220317095840_pg_graphql.sql:35 USAGE for postgres, anon, authenticated,
--         service_role; :40-45 default privileges FOR ROLE supabase_admin (tables, functions,
--         sequences) for the same four roles.
--       migrations/20260421000001_rescope_pg_graphql_access_trigger.sql:42 USAGE for postgres
--         WITH GRANT OPTION; :17-33 the wrapper graphql_public.graphql("operationName", query,
--         variables, extensions) that calls graphql.resolve. It is created only when it is
--         missing and pg_graphql is installed, and it is not attached to the extension
--         (:37 does, but production's trigger does not and an attached function is left out
--         of pg_dump, which is how a restore loses it).
--   * pgbouncer
--       init-scripts/00-schema.sql:5 the schema is AUTHORIZATION pgbouncer.
--       migrations/20251121132723_correct_search_path_pgbouncer.sql:23-25 get_auth() loses
--         PUBLIC and postgres and is executable by pgbouncer. The function stays owned by
--         supabase_admin (migrations/20250312095419_pgbouncer_ownership.sql:2).
--   * realtime
--       migrations/20211122051245_update-realtime-permissions.sql:4-7 USAGE for postgres; ALL
--         on tables, sequences and routines for postgres and dashboard_user.
--       migrations/20211130151719_update-realtime-permissions.sql:4-6 the matching default
--         privileges FOR ROLE supabase_admin.
-- Already matching stock on production, left alone: cron, vault, supabase_functions, public,
-- storage (20261125000000) and auth (20261125040000). net and pgsodium carry USAGE for PUBLIC
-- where stock names roles; that is wider than the explicit list but covers it, and narrowing
-- it risks callers nothing here can see, so it is not touched.
--
-- No data, RLS policy or object definition changes, except the missing graphql wrapper
-- function. Idempotent: repeated GRANTs, default privileges and the owner change are
-- no-ops, and the wrapper is created only when absent. Each block skips where its schema
-- or role does not exist, so the migration only acts on a real Supabase database (and on
-- the oracle's stub schemas, where it only changes grants).
DO $$
DECLARE
  api_roles text;      -- anon, authenticated, service_role
  app_roles text;      -- postgres + api_roles
  admin_roles text;    -- postgres, dashboard_user
  has_admin boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin');
BEGIN
  SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname) INTO api_roles
  FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role');
  SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname) INTO app_roles
  FROM pg_roles WHERE rolname IN ('postgres', 'anon', 'authenticated', 'service_role');
  SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname) INTO admin_roles
  FROM pg_roles WHERE rolname IN ('postgres', 'dashboard_user');

  -- extensions ------------------------------------------------------------------------
  IF to_regnamespace('extensions') IS NOT NULL THEN
    IF app_roles IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SCHEMA extensions TO %s', app_roles);
    END IF;
    IF admin_roles IS NOT NULL THEN
      EXECUTE format('GRANT ALL ON SCHEMA extensions TO %s', admin_roles);
      EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA extensions TO %s', admin_roles);
      EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO %s', admin_roles);
      EXECUTE format('GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO %s', admin_roles);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
      -- postgres owns nothing here on a real database; where it does (the oracle's stubs) a
      -- grant back to the owner is meaningless and PostgreSQL rejects the grant option.
      IF NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace = 'extensions'::regnamespace
                     AND pg_get_userbyid(c.relowner) = 'postgres') THEN
        GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres WITH GRANT OPTION;
        GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres WITH GRANT OPTION;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.pronamespace = 'extensions'::regnamespace
                     AND pg_get_userbyid(p.proowner) = 'postgres') THEN
        GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres WITH GRANT OPTION;
      END IF;
      IF has_admin THEN
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON ROUTINES TO postgres WITH GRANT OPTION;
        ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;
      END IF;
    END IF;
  END IF;

  -- graphql ---------------------------------------------------------------------------
  IF to_regnamespace('graphql') IS NOT NULL THEN
    IF app_roles IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SCHEMA graphql TO %s', app_roles);
      IF to_regprocedure('graphql.resolve(text, jsonb, text, jsonb)') IS NOT NULL THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION graphql.resolve(text, jsonb, text, jsonb) TO %s', app_roles);
      END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
       AND pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname = 'graphql')) <> 'postgres' THEN
      GRANT USAGE ON SCHEMA graphql TO postgres WITH GRANT OPTION;
    END IF;
  END IF;

  -- graphql_public --------------------------------------------------------------------
  IF to_regnamespace('graphql_public') IS NOT NULL THEN
    IF app_roles IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SCHEMA graphql_public TO %s', app_roles);
      IF has_admin THEN
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO %s', app_roles);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO %s', app_roles);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO %s', app_roles);
      END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres')
       AND pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname = 'graphql_public')) <> 'postgres' THEN
      GRANT USAGE ON SCHEMA graphql_public TO postgres WITH GRANT OPTION;
    END IF;
    -- The wrapper the stock trigger installs. It is created with the ACL the stock default
    -- privileges give it: the four roles, and not PUBLIC.
    IF to_regprocedure('graphql.resolve(text, jsonb, text, jsonb)') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace = 'graphql_public'::regnamespace AND proname = 'graphql') THEN
      CREATE FUNCTION graphql_public.graphql(
        "operationName" text DEFAULT NULL,
        query text DEFAULT NULL,
        variables jsonb DEFAULT NULL,
        extensions jsonb DEFAULT NULL
      )
        RETURNS jsonb
        LANGUAGE sql
      AS $wrapper$
        SELECT graphql.resolve(
          query := query,
          variables := coalesce(variables, '{}'),
          "operationName" := "operationName",
          extensions := extensions
        );
      $wrapper$;
      IF has_admin THEN
        ALTER FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) OWNER TO supabase_admin;
      END IF;
      REVOKE ALL ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) FROM PUBLIC;
      IF app_roles IS NOT NULL THEN
        EXECUTE format('GRANT ALL ON FUNCTION graphql_public.graphql(text, text, jsonb, jsonb) TO %s', app_roles);
      END IF;
    END IF;
  END IF;

  -- pgbouncer -------------------------------------------------------------------------
  IF to_regnamespace('pgbouncer') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pgbouncer') THEN
    IF pg_get_userbyid((SELECT nspowner FROM pg_namespace WHERE nspname = 'pgbouncer')) <> 'pgbouncer' THEN
      ALTER SCHEMA pgbouncer OWNER TO pgbouncer;
    END IF;
    IF to_regprocedure('pgbouncer.get_auth(text)') IS NOT NULL THEN
      REVOKE ALL ON FUNCTION pgbouncer.get_auth(text) FROM PUBLIC;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        REVOKE EXECUTE ON FUNCTION pgbouncer.get_auth(text) FROM postgres;
      END IF;
      GRANT EXECUTE ON FUNCTION pgbouncer.get_auth(text) TO pgbouncer;
    END IF;
  END IF;

  -- realtime --------------------------------------------------------------------------
  IF to_regnamespace('realtime') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
      GRANT USAGE ON SCHEMA realtime TO postgres;
    END IF;
    IF admin_roles IS NOT NULL THEN
      EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA realtime TO %s', admin_roles);
      EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA realtime TO %s', admin_roles);
      EXECUTE format('GRANT ALL ON ALL ROUTINES IN SCHEMA realtime TO %s', admin_roles);
      IF has_admin THEN
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO %s', admin_roles);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO %s', admin_roles);
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON ROUTINES TO %s', admin_roles);
      END IF;
    END IF;
  END IF;
END
$$;
