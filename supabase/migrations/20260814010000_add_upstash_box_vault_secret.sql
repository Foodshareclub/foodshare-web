-- Migration: Add UPSTASH_BOX_API_KEY and UPSTASH_BOX_NAME placeholders to Supabase Vault
-- Purpose: Schema initialization for Upstash Box sandbox credentials (actual values injected via CI/CD)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'vault' AND tablename = 'secrets') THEN
    -- 1. UPSTASH_BOX_API_KEY
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'UPSTASH_BOX_API_KEY') THEN
      PERFORM vault.create_secret(
        'PLACEHOLDER_CHANGE_ME',
        'UPSTASH_BOX_API_KEY',
        'Upstash Box CLI API key for agent sandbox'
      );
    END IF;

    -- 2. UPSTASH_BOX_NAME
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'UPSTASH_BOX_NAME') THEN
      PERFORM vault.create_secret(
        'alert-prawn-36841',
        'UPSTASH_BOX_NAME',
        'Upstash Box default box name/id'
      );
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Vault secret creation skipped: %', SQLERRM;
END;
$$;
