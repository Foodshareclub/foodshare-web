-- Fix: Ensure supabase_auth_admin has USAGE and CREATE on the auth schema.
-- Root cause: The auth schema is owned by supabase_admin, and supabase_auth_admin
-- had lost its privileges, causing GoTrue to crash-loop with SQLSTATE 3F000
-- ("no schema has been selected to create in").
--
-- NOTE: This migration MUST be run as supabase_admin (the schema owner),
-- because the postgres role is NOT a superuser in this Supabase setup.

GRANT USAGE  ON SCHEMA auth TO supabase_auth_admin;
GRANT CREATE ON SCHEMA auth TO supabase_auth_admin;

-- Ensure full access to existing objects
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;

-- Ensure future objects created in auth schema are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
  GRANT ALL ON TABLES    TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth
  GRANT ALL ON SEQUENCES TO supabase_auth_admin;
