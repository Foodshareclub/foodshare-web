GRANT USAGE ON SCHEMA public TO postgres, service_role;

-- Explicit function grants – only service_role may execute privileged functions.
-- Sensitive functions (get_vault_secret, get_secrets, get_secret_audited, execute_readonly_query)
-- are deliberately not granted to anon/authenticated; grant EXECUTE only to service_role.
GRANT EXECUTE ON FUNCTION get_vault_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_secrets(text[]) TO service_role;
-- The signature is the function's own: get_secret_audited(secret_name text,
-- requesting_user_id uuid, request_metadata jsonb), as the baseline declares
-- it. A grant naming a signature that does not exist is an error, not a
-- no-op -- and the signature it named before, (text, text, text), is not
-- the function's, so the grant failed on every database this migration
-- was applied to, and service_role was left without the one function here
-- that reads the Vault.
GRANT EXECUTE ON FUNCTION get_secret_audited(text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION execute_readonly_query(text) TO service_role;

-- All other functions remain ungranted to public roles; add explicit grants as needed.
-- NOTE: never grant ALL PRIVILEGES ON ALL FUNCTIONS to anon/authenticated in production.

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
