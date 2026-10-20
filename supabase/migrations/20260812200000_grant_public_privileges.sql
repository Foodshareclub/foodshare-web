GRANT USAGE ON SCHEMA public TO postgres, service_role;

-- Explicit function grants – only service_role may execute privileged functions.
-- Sensitive functions (get_vault_secret, get_secrets, get_secret_audited, execute_readonly_query)
-- are deliberately not granted to anon/authenticated; grant EXECUTE only to service_role.
GRANT EXECUTE ON FUNCTION get_vault_secret(text) TO service_role;
GRANT EXECUTE ON FUNCTION get_secrets(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_secret_audited(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION execute_readonly_query(text) TO service_role;

-- All other functions remain ungranted to public roles; add explicit grants as needed.
-- NOTE: never grant ALL PRIVILEGES ON ALL FUNCTIONS to anon/authenticated in production.

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
