-- Migration: Add secret SENTRY_DSN to Vault
--
-- This migration ensures that the secret key exists in the Supabase Vault.
-- The value is set to a placeholder if it doesn't already exist.
-- Update the actual value via: ./scripts/deploy.sh set-secret SENTRY_DSN <value>

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'SENTRY_DSN') THEN
    PERFORM vault.create_secret('PLACEHOLDER_CHANGE_ME', 'SENTRY_DSN', 'Created via migration');
  END IF;
END $$;
