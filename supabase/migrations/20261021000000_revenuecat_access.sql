-- RevenueCat identity is an administrator-verified association, never a client claim.
--
-- The billing schema is created here because nothing else creates it. It is
-- the Supabase platform's own schema, so a database built by the platform
-- has it and this statement is a no-op; the self-hosted image this estate
-- runs does not have it at all, and the table below has nowhere to go
-- without it. IF NOT EXISTS so both kinds of database are served by the
-- same migration.
CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE billing.revenuecat_identities (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text UNIQUE NOT NULL CHECK (length(customer_id) BETWEEN 1 AND 1500),
  verification_reference text NOT NULL CHECK (length(verification_reference) > 0),
  verified_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  has_access boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  reconciled_at timestamptz
);
ALTER TABLE billing.revenuecat_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON billing.revenuecat_identities FROM PUBLIC, anon, authenticated, service_role;

-- Called only after server-side identity verification. No public binding RPC.
COMMENT ON TABLE billing.revenuecat_identities IS
  'Verified FoodShare-to-RevenueCat links. Never populate by client ID or email-only matching. Entitlement: maps; production only.';

CREATE FUNCTION public.revenuecat_begin_reconciliation(p_customer_id text)
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE billing.revenuecat_identities SET revision = revision + 1
  WHERE customer_id = p_customer_id RETURNING revision;
$$;

CREATE FUNCTION public.revenuecat_commit(
  p_customer_id text, p_revision bigint, p_has_access boolean, p_expires_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE billing.revenuecat_identities
  SET has_access = p_has_access, expires_at = p_expires_at, reconciled_at = now()
  WHERE customer_id = p_customer_id AND revision = p_revision;
  RETURN FOUND;
END;
$$;

CREATE FUNCTION public.revenuecat_my_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((
    SELECT jsonb_build_object(
      'identity_ready', true, 'customer_id', customer_id,
      'has_access', coalesce(has_access AND reconciled_at > now() - interval '1 hour'
        AND (expires_at IS NULL OR expires_at > now()), false),
      'expires_at', expires_at, 'reconciled_at', reconciled_at
    ) FROM billing.revenuecat_identities WHERE user_id = auth.uid()
  ), jsonb_build_object('identity_ready', false, 'has_access', false));
$$;

REVOKE ALL ON FUNCTION public.revenuecat_begin_reconciliation(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revenuecat_commit(text, bigint, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revenuecat_my_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revenuecat_begin_reconciliation(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revenuecat_commit(text, bigint, boolean, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.revenuecat_my_status() TO authenticated;
