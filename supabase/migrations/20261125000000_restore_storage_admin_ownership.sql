-- Migration: Give the storage schema's objects back to supabase_storage_admin
-- The R2 restore recreated every table, function and type in `storage` as
-- supabase_admin and dropped supabase_storage_admin's access to the schema.
-- storage-api connects as supabase_storage_admin with search_path=storage, so
-- it could not see `storage.migrations` and failed at start (42P01) while the
-- deploy's storage unit hit its start limit (t_5f961bca, t_111c4d0a).
--
-- Stock layout, from the supabase/postgres:17.6.1.166 image and storage-api v1.71.0:
--   * init-scripts/00000000000002-storage-schema.sql:3  the schema is created
--     AUTHORIZATION supabase_admin, so the schema owner stays supabase_admin.
--   * init-scripts/00000000000002-storage-schema.sql:17 `grant all on schema storage
--     to supabase_storage_admin with grant option`.
--   * init-scripts/00000000000002-storage-schema.sql:12-15 usage on the schema and
--     default privileges on tables, functions and sequences for postgres, anon,
--     authenticated and service_role.
--   * storage-api migrations/tenant/0002-storage-schema.sql:176-182 and the later
--     tenant migrations create and own the tables, functions and types as
--     supabase_storage_admin.
--   * migrations/20250709135250 grants postgres usage on the schema with grant option;
--     20250623125453 grants postgres all on buckets and objects with grant option;
--     20250421084701 revokes everything on storage.migrations from postgres and the API roles.
--
-- No data, RLS policy or existing anon/authenticated/service_role grant changes.
-- Idempotent: ALTER ... OWNER to the current owner and repeated GRANTs are no-ops.
-- Skips entirely where the storage schema or the role does not exist (the oracle
-- and the corpus replay databases), so it only acts on a real Supabase database.
DO $$
DECLARE
  r record;
BEGIN
  IF to_regnamespace('storage') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    RAISE NOTICE 'storage schema or supabase_storage_admin missing; nothing to restore';
    RETURN;
  END IF;

  -- Schema access first: ALTER ... OWNER needs CREATE on the schema for the new owner.
  GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;

  -- Tables, views, materialized views, partitioned tables. Indexes, TOAST tables and
  -- row types follow their table. Sequences owned by a column are listed too; identity
  -- sequences follow their table and cannot be changed on their own.
  FOR r IN
    SELECT c.oid::regclass AS rel, c.relkind
    FROM pg_class c
    WHERE c.relnamespace = 'storage'::regnamespace
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('e', 'i'))
      AND pg_get_userbyid(c.relowner) <> 'supabase_storage_admin'
    ORDER BY c.oid
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO supabase_storage_admin',
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
    WHERE p.pronamespace = 'storage'::regnamespace
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
      AND pg_get_userbyid(p.proowner) <> 'supabase_storage_admin'
    ORDER BY p.oid
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO supabase_storage_admin',
      CASE r.prokind WHEN 'p' THEN 'PROCEDURE' WHEN 'a' THEN 'AGGREGATE' ELSE 'FUNCTION' END,
      r.fn
    );
  END LOOP;

  -- Standalone enum and domain types (storage.buckettype). Array types and row types
  -- follow their element or table.
  FOR r IN
    SELECT t.oid::regtype AS typ, t.typtype
    FROM pg_type t
    WHERE t.typnamespace = 'storage'::regnamespace
      AND t.typtype IN ('e', 'd')
      AND t.typelem = 0
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
      AND pg_get_userbyid(t.typowner) <> 'supabase_storage_admin'
    ORDER BY t.oid
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO supabase_storage_admin',
      CASE r.typtype WHEN 'd' THEN 'DOMAIN' ELSE 'TYPE' END,
      r.typ
    );
  END LOOP;

  -- Stock grants to postgres (demote-postgres, 20250709 and 20250623 upstream migrations).
  -- postgres keeps usage with grant option and no CREATE on the schema, and no access to
  -- storage.migrations.
  GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
  GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres;
  GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO postgres;
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    GRANT ALL ON storage.buckets TO postgres WITH GRANT OPTION;
  END IF;
  IF to_regclass('storage.objects') IS NOT NULL THEN
    GRANT ALL ON storage.objects TO postgres WITH GRANT OPTION;
  END IF;
  IF to_regclass('storage.migrations') IS NOT NULL THEN
    REVOKE ALL ON storage.migrations FROM postgres;
  END IF;

  -- Default privileges, as the upstream init script and storage-api's own 0002 migration
  -- set them. Objects storage-api creates later are made by supabase_storage_admin;
  -- the init script's defaults apply to supabase_admin.
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
    GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
    GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
    GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA storage
    GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA storage
    GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA storage
    GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
END
$$;
