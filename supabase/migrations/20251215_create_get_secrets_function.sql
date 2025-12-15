-- Migration: Create get_secrets batch function for Supabase Vault
-- Date: 2025-12-15
-- Purpose: Batch fetch multiple secrets from Supabase Vault for email providers

CREATE OR REPLACE FUNCTION public.get_secrets(secret_names text[])
RETURNS TABLE (
  name text,
  value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  secret_name text;
  secret_value text;
BEGIN
  -- Loop through each requested secret name
  FOREACH secret_name IN ARRAY secret_names
  LOOP
    BEGIN
      -- Fetch secret from Supabase Vault
      SELECT decrypted_secret INTO secret_value
      FROM vault.decrypted_secrets
      WHERE vault.decrypted_secrets.name = secret_name
      LIMIT 1;

      -- Return the secret if found
      IF secret_value IS NOT NULL THEN
        name := secret_name;
        value := secret_value;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other secrets
      RAISE WARNING 'Failed to fetch secret %: %', secret_name, SQLERRM;
    END;
  END LOOP;

  RETURN;
END;
$$;

-- Grant execute permission to authenticated users (service role will use this)
GRANT EXECUTE ON FUNCTION public.get_secrets(text[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_secrets(text[]) IS 'Batch fetch multiple secrets from Supabase Vault for email provider configuration';
