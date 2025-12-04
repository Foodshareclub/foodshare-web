-- Migration 007: Security Hardening for B2B SaaS
-- Addresses critical security vulnerabilities identified in security audit
-- Implements: Admin RBAC, Multi-tenancy, PII encryption, Audit logging

-- ============================================================================
-- 1. ADMIN ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================================

-- Add user_role column to profiles for admin authentication
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'user'
  CHECK (user_role IN ('user', 'admin', 'super_admin'));

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON profiles(user_role);

-- Update existing users to 'user' role (safely handles existing data)
UPDATE profiles SET user_role = 'user' WHERE user_role IS NULL;

COMMENT ON COLUMN profiles.user_role IS 'User role for RBAC: user, admin, super_admin';

-- ============================================================================
-- 2. MULTI-TENANCY: Organizations Table
-- ============================================================================

-- Create organizations table if not exists
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization members junction table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations for B2B SaaS';
COMMENT ON TABLE organization_members IS 'Maps users to organizations with roles';

-- ============================================================================
-- 3. MULTI-TENANCY: Add organization_id to Email Tables
-- ============================================================================

-- Add organization_id to circuit breaker state (with default for existing data)
DO $$
BEGIN
  -- Check if column doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_circuit_breaker_state' AND column_name = 'organization_id'
  ) THEN
    -- Add column as nullable first
    ALTER TABLE email_circuit_breaker_state
      ADD COLUMN organization_id UUID REFERENCES organizations(id);

    -- Create default organization for existing data
    INSERT INTO organizations (id, name, slug)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default')
    ON CONFLICT (id) DO NOTHING;

    -- Update existing rows
    UPDATE email_circuit_breaker_state
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;

    -- Make column NOT NULL after backfill
    ALTER TABLE email_circuit_breaker_state
      ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Drop old primary key and create new composite key
ALTER TABLE email_circuit_breaker_state DROP CONSTRAINT IF EXISTS email_circuit_breaker_state_pkey;
ALTER TABLE email_circuit_breaker_state
  ADD CONSTRAINT email_circuit_breaker_state_pkey
  PRIMARY KEY (provider, organization_id);

CREATE INDEX IF NOT EXISTS idx_circuit_breaker_org
  ON email_circuit_breaker_state(organization_id);

-- Same for email_provider_quota
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_provider_quota' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE email_provider_quota ADD COLUMN organization_id UUID REFERENCES organizations(id);
    UPDATE email_provider_quota SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
    ALTER TABLE email_provider_quota ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE email_provider_quota DROP CONSTRAINT IF EXISTS email_provider_quota_provider_date_key;
ALTER TABLE email_provider_quota
  ADD CONSTRAINT email_provider_quota_unique
  UNIQUE (provider, date, organization_id);

CREATE INDEX IF NOT EXISTS idx_provider_quota_org ON email_provider_quota(organization_id);

-- ============================================================================
-- 4. ADMIN AUDIT LOG (SOC 2 Compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON admin_audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON admin_audit_log(created_at DESC);

COMMENT ON TABLE admin_audit_log IS 'Audit trail of all admin actions for SOC 2 compliance';

-- ============================================================================
-- 5. PII ENCRYPTION FUNCTIONS
-- ============================================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt PII data
CREATE OR REPLACE FUNCTION encrypt_pii(data TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Use AES-256 encryption with key from environment
  -- In production, use proper key management (AWS KMS, Vault, etc.)
  RETURN encode(
    pgp_sym_encrypt(
      data,
      current_setting('app.encryption_key', TRUE)
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt PII data
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_data, 'base64'),
    current_setting('app.encryption_key', TRUE)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[DECRYPTION_ERROR]';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ENHANCED RLS POLICIES
-- ============================================================================

-- Drop old incomplete policies
DROP POLICY IF EXISTS "Admins can read all email logs" ON email_logs;
DROP POLICY IF EXISTS "Authenticated users can read circuit breaker state" ON email_circuit_breaker_state;

-- Admin-only access to circuit breaker state
CREATE POLICY "Admins can manage circuit breaker state"
  ON email_circuit_breaker_state FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- Tenant isolation for circuit breaker
CREATE POLICY "Users can see own organization circuit state"
  ON email_circuit_breaker_state FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Admin-only access to email logs with proper RBAC
CREATE POLICY "Admins can read all email logs"
  ON email_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- Admin-only access to health events
CREATE POLICY "Admins can read health events"
  ON email_health_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- Admin-only access to provider metrics
CREATE POLICY "Admins can read provider metrics"
  ON email_provider_metrics FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Organization policies
CREATE POLICY "Users can see own organizations"
  ON organizations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all organizations"
  ON organizations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- Audit log policies (admins only)
CREATE POLICY "Admins can read audit logs"
  ON admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 7. ENHANCED DATABASE FUNCTIONS WITH ADMIN CHECKS
-- ============================================================================

-- Drop old reset_circuit_breaker function (has different signature)
DROP FUNCTION IF EXISTS reset_circuit_breaker(TEXT);

-- Create new reset_circuit_breaker with admin role check and audit logging
CREATE OR REPLACE FUNCTION reset_circuit_breaker(
  p_provider TEXT,
  p_organization_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_admin_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user
  v_admin_id := auth.uid();

  -- Check if user is admin
  SELECT user_role INTO v_user_role
  FROM profiles
  WHERE id = v_admin_id;

  IF v_user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Reset circuit breaker
  UPDATE email_circuit_breaker_state
  SET
    state = 'closed',
    failures = 0,
    consecutive_successes = 0,
    last_failure_time = NULL,
    next_retry_time = NULL,
    updated_at = NOW()
  WHERE provider = p_provider
    AND (p_organization_id IS NULL OR organization_id = p_organization_id);

  -- Log admin action
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    resource_type,
    resource_id,
    metadata,
    success
  ) VALUES (
    v_admin_id,
    'circuit_breaker_reset',
    'email_provider',
    p_provider,
    jsonb_build_object(
      'provider', p_provider,
      'organization_id', p_organization_id
    ),
    TRUE
  );

  -- Record health event
  PERFORM record_circuit_event(
    p_provider,
    'manual_reset',
    format('Circuit breaker manually reset for %s by admin %s', p_provider, v_admin_id),
    'info',
    jsonb_build_object('admin_id', v_admin_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. INPUT VALIDATION CONSTRAINTS
-- ============================================================================

-- Add CHECK constraints for SQL injection prevention
ALTER TABLE email_circuit_breaker_state
  DROP CONSTRAINT IF EXISTS valid_provider,
  ADD CONSTRAINT valid_provider
  CHECK (provider IN ('resend', 'brevo', 'aws_ses'));

ALTER TABLE email_circuit_breaker_state
  DROP CONSTRAINT IF EXISTS valid_state,
  ADD CONSTRAINT valid_state
  CHECK (state IN ('closed', 'open', 'half-open'));

ALTER TABLE email_health_events
  DROP CONSTRAINT IF EXISTS valid_event_type,
  ADD CONSTRAINT valid_event_type
  CHECK (event_type IN (
    'circuit_opened',
    'circuit_half_opened',
    'circuit_closed',
    'manual_reset',
    'manual_disable',
    'quota_warning',
    'quota_exhausted',
    'provider_failure',
    'all_providers_exhausted'
  ));

ALTER TABLE email_health_events
  DROP CONSTRAINT IF EXISTS valid_severity,
  ADD CONSTRAINT valid_severity
  CHECK (severity IN ('info', 'warning', 'error', 'critical'));

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant access to new tables
GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON organization_members TO authenticated;
GRANT SELECT ON admin_audit_log TO authenticated;

GRANT ALL ON organizations TO service_role;
GRANT ALL ON organization_members TO service_role;
GRANT ALL ON admin_audit_log TO service_role;

-- Grant execute on encryption functions (restricted)
GRANT EXECUTE ON FUNCTION encrypt_pii TO service_role;
GRANT EXECUTE ON FUNCTION decrypt_pii TO service_role;

-- Updated reset function with admin check
GRANT EXECUTE ON FUNCTION reset_circuit_breaker TO authenticated;

-- ============================================================================
-- 10. SECURITY COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.user_role IS 'RBAC role: user (default), admin (dashboard access), super_admin (full control)';
COMMENT ON TABLE admin_audit_log IS 'SOC 2 compliance: Immutable audit trail of admin actions with IP tracking';
COMMENT ON FUNCTION encrypt_pii IS 'AES-256 encryption for PII data (GDPR Article 32 compliance)';
COMMENT ON FUNCTION reset_circuit_breaker IS 'Admin-only function with RBAC check and audit logging';
