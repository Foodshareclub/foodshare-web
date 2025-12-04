-- Migration 008: Admin MFA Security Implementation
-- Implements enterprise-grade MFA for admin access with SMS and Email verification
-- Security features: Rate limiting, audit logging, session management, AAL enforcement

-- ============================================================================
-- 1. MFA CONFIGURATION TABLE
-- ============================================================================

-- Store MFA configuration settings
CREATE TABLE IF NOT EXISTS mfa_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- MFA Settings
  is_mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_method TEXT CHECK (mfa_method IN ('sms', 'email', 'both')),
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,

  -- Security Settings
  require_mfa_for_admin BOOLEAN DEFAULT TRUE,
  backup_codes TEXT[], -- Encrypted backup codes for recovery
  backup_codes_used TEXT[], -- Track which codes have been used

  -- Timestamps
  mfa_enabled_at TIMESTAMPTZ,
  last_mfa_verification_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_config_profile ON mfa_configuration(profile_id);
CREATE INDEX idx_mfa_config_enabled ON mfa_configuration(is_mfa_enabled) WHERE is_mfa_enabled = TRUE;

COMMENT ON TABLE mfa_configuration IS 'MFA configuration and enrollment status for admin users';

-- ============================================================================
-- 2. MFA VERIFICATION ATTEMPTS (Rate Limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Attempt Details
  verification_method TEXT NOT NULL CHECK (verification_method IN ('sms', 'email')),
  code_hash TEXT NOT NULL, -- bcrypt hash of the code
  attempts_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,

  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_attempts_profile ON mfa_verification_attempts(profile_id, created_at DESC);
CREATE INDEX idx_mfa_attempts_expires ON mfa_verification_attempts(expires_at) WHERE is_expired = FALSE;

COMMENT ON TABLE mfa_verification_attempts IS 'Track MFA verification attempts for rate limiting and security';

-- ============================================================================
-- 3. MFA SESSION TRACKING (AAL Enforcement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID NOT NULL,

  -- Assurance Level
  current_aal TEXT NOT NULL CHECK (current_aal IN ('aal1', 'aal2')),
  mfa_verified_at TIMESTAMPTZ,
  mfa_method_used TEXT CHECK (mfa_method_used IN ('sms', 'email', 'backup_code')),

  -- Session Security
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,

  -- Session Lifecycle
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mfa_sessions_profile ON mfa_sessions(profile_id, created_at DESC);
CREATE INDEX idx_mfa_sessions_active ON mfa_sessions(session_id) WHERE is_active = TRUE;
CREATE INDEX idx_mfa_sessions_expires ON mfa_sessions(expires_at) WHERE is_active = TRUE;

COMMENT ON TABLE mfa_sessions IS 'Track MFA-verified sessions for AAL2 enforcement';

-- ============================================================================
-- 4. ADMIN ACCESS LOG (Enhanced Audit Trail)
-- ============================================================================

-- Extend existing admin_audit_log with MFA context
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS aal_level TEXT CHECK (aal_level IN ('aal1', 'aal2')),
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100);

CREATE INDEX idx_audit_mfa_verified ON admin_audit_log(mfa_verified, created_at DESC);
CREATE INDEX idx_audit_aal_level ON admin_audit_log(aal_level) WHERE aal_level = 'aal2';

COMMENT ON COLUMN admin_audit_log.mfa_verified IS 'Whether the admin action was performed with MFA verification';
COMMENT ON COLUMN admin_audit_log.aal_level IS 'Authenticator Assurance Level at time of action';
COMMENT ON COLUMN admin_audit_log.risk_score IS 'Calculated risk score (0-100) based on action context';

-- ============================================================================
-- 5. SECURITY RATE LIMITING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address INET,

  -- Rate Limit Type
  limit_type TEXT NOT NULL CHECK (limit_type IN (
    'mfa_attempts',
    'login_attempts',
    'admin_actions',
    'api_calls'
  )),

  -- Rate Limit Tracking
  attempt_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_duration INTERVAL DEFAULT INTERVAL '15 minutes',
  max_attempts INTEGER DEFAULT 5,

  -- Lockout Status
  is_locked_out BOOLEAN DEFAULT FALSE,
  locked_until TIMESTAMPTZ,

  -- Metadata
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,

  -- Unique constraint to prevent duplicates
  UNIQUE(profile_id, ip_address, limit_type, window_start)
);

CREATE INDEX idx_rate_limits_profile ON security_rate_limits(profile_id, limit_type);
CREATE INDEX idx_rate_limits_ip ON security_rate_limits(ip_address, limit_type);
CREATE INDEX idx_rate_limits_locked ON security_rate_limits(is_locked_out, locked_until) WHERE is_locked_out = TRUE;

COMMENT ON TABLE security_rate_limits IS 'Implement rate limiting for security-sensitive operations';

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE mfa_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rate_limits ENABLE ROW LEVEL SECURITY;

-- MFA Configuration Policies
CREATE POLICY "Users can read own MFA configuration"
  ON mfa_configuration FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own MFA configuration"
  ON mfa_configuration FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can read all MFA configurations"
  ON mfa_configuration FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- MFA Sessions Policies
CREATE POLICY "Users can read own MFA sessions"
  ON mfa_sessions FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins can read all MFA sessions"
  ON mfa_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- Rate Limits Policies (Admins only)
CREATE POLICY "Admins can read rate limits"
  ON security_rate_limits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 7. SECURITY FUNCTIONS
-- ============================================================================

-- Generate MFA code (6-digit numeric)
CREATE OR REPLACE FUNCTION generate_mfa_code()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hash MFA code using bcrypt
CREATE OR REPLACE FUNCTION hash_mfa_code(code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(code, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify MFA code
CREATE OR REPLACE FUNCTION verify_mfa_code(code TEXT, code_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN code_hash = crypt(code, code_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate backup codes
CREATE OR REPLACE FUNCTION generate_backup_codes(count INTEGER DEFAULT 10)
RETURNS TEXT[] AS $$
DECLARE
  codes TEXT[] := ARRAY[]::TEXT[];
  i INTEGER;
BEGIN
  FOR i IN 1..count LOOP
    codes := array_append(codes,
      encode(gen_random_bytes(6), 'base64')::TEXT
    );
  END LOOP;
  RETURN codes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_profile_id UUID,
  p_ip_address INET,
  p_limit_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_duration INTERVAL DEFAULT INTERVAL '15 minutes'
)
RETURNS JSONB AS $$
DECLARE
  v_record RECORD;
  v_is_allowed BOOLEAN;
  v_remaining INTEGER;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_record
  FROM security_rate_limits
  WHERE profile_id = p_profile_id
    AND ip_address = p_ip_address
    AND limit_type = p_limit_type
    AND window_start > (NOW() - p_window_duration)
  ORDER BY window_start DESC
  LIMIT 1;

  -- Check if locked out
  IF v_record.is_locked_out AND v_record.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'remaining', 0,
      'locked_until', v_record.locked_until,
      'reason', 'locked_out'
    );
  END IF;

  -- Reset if window expired
  IF v_record.window_start IS NULL OR v_record.window_start <= (NOW() - p_window_duration) THEN
    INSERT INTO security_rate_limits (
      profile_id, ip_address, limit_type, max_attempts, window_duration
    ) VALUES (
      p_profile_id, p_ip_address, p_limit_type, p_max_attempts, p_window_duration
    )
    ON CONFLICT (profile_id, ip_address, limit_type, window_start)
    DO UPDATE SET
      attempt_count = 1,
      last_attempt_at = NOW();

    RETURN jsonb_build_object(
      'allowed', TRUE,
      'remaining', p_max_attempts - 1,
      'window_reset_at', NOW() + p_window_duration
    );
  END IF;

  -- Check if attempts exceeded
  v_remaining := p_max_attempts - v_record.attempt_count;
  v_is_allowed := v_record.attempt_count < p_max_attempts;

  -- Update attempt count
  UPDATE security_rate_limits
  SET
    attempt_count = attempt_count + 1,
    last_attempt_at = NOW(),
    is_locked_out = CASE WHEN attempt_count + 1 >= p_max_attempts THEN TRUE ELSE FALSE END,
    locked_until = CASE WHEN attempt_count + 1 >= p_max_attempts THEN NOW() + INTERVAL '1 hour' ELSE NULL END
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'remaining', GREATEST(v_remaining - 1, 0),
    'window_reset_at', v_record.window_start + p_window_duration,
    'attempts', v_record.attempt_count + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create MFA verification challenge
CREATE OR REPLACE FUNCTION create_mfa_challenge(
  p_profile_id UUID,
  p_method TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_code TEXT;
  v_code_hash TEXT;
  v_challenge_id UUID;
  v_rate_limit JSONB;
BEGIN
  -- Check rate limit
  v_rate_limit := check_rate_limit(
    p_profile_id,
    COALESCE(p_ip_address, '0.0.0.0'::INET),
    'mfa_attempts',
    5,
    INTERVAL '15 minutes'
  );

  IF NOT (v_rate_limit->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'rate_limit_exceeded',
      'locked_until', v_rate_limit->>'locked_until'
    );
  END IF;

  -- Expire old challenges
  UPDATE mfa_verification_attempts
  SET is_expired = TRUE
  WHERE profile_id = p_profile_id
    AND is_verified = FALSE
    AND is_expired = FALSE;

  -- Generate code and hash it
  v_code := generate_mfa_code();
  v_code_hash := hash_mfa_code(v_code);

  -- Create challenge
  INSERT INTO mfa_verification_attempts (
    profile_id,
    verification_method,
    code_hash,
    ip_address,
    user_agent
  ) VALUES (
    p_profile_id,
    p_method,
    v_code_hash,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_challenge_id;

  -- Return challenge details (code only returned here, not stored in DB)
  RETURN jsonb_build_object(
    'success', TRUE,
    'challenge_id', v_challenge_id,
    'code', v_code, -- ONLY for sending via email/SMS, not stored
    'expires_at', NOW() + INTERVAL '5 minutes',
    'method', p_method
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify MFA challenge
CREATE OR REPLACE FUNCTION verify_mfa_challenge(
  p_challenge_id UUID,
  p_code TEXT,
  p_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_challenge RECORD;
  v_is_valid BOOLEAN;
  v_session_id UUID;
BEGIN
  -- Get challenge
  SELECT * INTO v_challenge
  FROM mfa_verification_attempts
  WHERE id = p_challenge_id
    AND profile_id = p_profile_id
    AND is_expired = FALSE;

  IF v_challenge.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'invalid_challenge'
    );
  END IF;

  -- Check if expired
  IF v_challenge.expires_at < NOW() THEN
    UPDATE mfa_verification_attempts
    SET is_expired = TRUE
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'challenge_expired'
    );
  END IF;

  -- Check max attempts
  IF v_challenge.attempts_count >= v_challenge.max_attempts THEN
    UPDATE mfa_verification_attempts
    SET is_expired = TRUE
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'max_attempts_exceeded'
    );
  END IF;

  -- Verify code
  v_is_valid := verify_mfa_code(p_code, v_challenge.code_hash);

  -- Update attempt count
  UPDATE mfa_verification_attempts
  SET
    attempts_count = attempts_count + 1,
    is_verified = v_is_valid,
    verified_at = CASE WHEN v_is_valid THEN NOW() ELSE NULL END
  WHERE id = p_challenge_id;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'invalid_code',
      'attempts_remaining', v_challenge.max_attempts - v_challenge.attempts_count - 1
    );
  END IF;

  -- Create MFA session
  INSERT INTO mfa_sessions (
    profile_id,
    session_id,
    current_aal,
    mfa_verified_at,
    mfa_method_used,
    ip_address,
    user_agent
  ) VALUES (
    p_profile_id,
    gen_random_uuid(),
    'aal2',
    NOW(),
    v_challenge.verification_method,
    v_challenge.ip_address,
    v_challenge.user_agent
  )
  RETURNING session_id INTO v_session_id;

  -- Update last verification time
  UPDATE mfa_configuration
  SET last_mfa_verification_at = NOW()
  WHERE profile_id = p_profile_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'session_id', v_session_id,
    'aal', 'aal2',
    'verified_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user requires MFA
CREATE OR REPLACE FUNCTION requires_mfa(p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_mfa_enabled BOOLEAN;
BEGIN
  -- Get user role
  SELECT user_role INTO v_user_role
  FROM profiles
  WHERE id = p_profile_id;

  -- Check if MFA is enabled
  SELECT is_mfa_enabled INTO v_mfa_enabled
  FROM mfa_configuration
  WHERE profile_id = p_profile_id;

  -- Admins and super_admins must use MFA
  IF v_user_role IN ('admin', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Otherwise, check if user has opted in
  RETURN COALESCE(v_mfa_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current AAL level
CREATE OR REPLACE FUNCTION get_current_aal(p_profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Get most recent active session
  SELECT * INTO v_session
  FROM mfa_sessions
  WHERE profile_id = p_profile_id
    AND is_active = TRUE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN 'aal1';
  END IF;

  RETURN v_session.current_aal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. CLEANUP FUNCTIONS (For expired records)
-- ============================================================================

-- Function to cleanup expired MFA challenges
CREATE OR REPLACE FUNCTION cleanup_expired_mfa_challenges()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM mfa_verification_attempts
  WHERE (expires_at < NOW() OR is_expired = TRUE)
    AND created_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_mfa_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE mfa_sessions
  SET is_active = FALSE
  WHERE (expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '24 hours')
    AND is_active = TRUE;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ENHANCED RLS POLICIES FOR ADMIN ACCESS
-- ============================================================================

-- Create restrictive policy for admin email CRM access
-- This ensures only AAL2 authenticated admins can access sensitive admin pages
CREATE POLICY "Admin pages require AAL2 for admins"
  ON email_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    -- If user is admin/super_admin, require AAL2
    CASE
      WHEN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin', 'super_admin')
      )
      THEN
        -- Check AAL level
        get_current_aal(auth.uid()) = 'aal2'
      ELSE
        -- Non-admins don't have access anyway
        FALSE
    END
  );

-- Apply same policy to other sensitive admin tables
CREATE POLICY "Admin circuit breaker requires AAL2"
  ON email_circuit_breaker_state AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    CASE
      WHEN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin', 'super_admin')
      )
      THEN get_current_aal(auth.uid()) = 'aal2'
      ELSE FALSE
    END
  );

CREATE POLICY "Admin provider quota requires AAL2"
  ON email_provider_quota AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    CASE
      WHEN EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.user_role IN ('admin', 'super_admin')
      )
      THEN get_current_aal(auth.uid()) = 'aal2'
      ELSE FALSE
    END
  );

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON mfa_configuration TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mfa_verification_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mfa_sessions TO authenticated;
GRANT SELECT ON security_rate_limits TO authenticated;

GRANT ALL ON mfa_configuration TO service_role;
GRANT ALL ON mfa_verification_attempts TO service_role;
GRANT ALL ON mfa_sessions TO service_role;
GRANT ALL ON security_rate_limits TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_mfa_code TO authenticated;
GRANT EXECUTE ON FUNCTION create_mfa_challenge TO authenticated;
GRANT EXECUTE ON FUNCTION verify_mfa_challenge TO authenticated;
GRANT EXECUTE ON FUNCTION requires_mfa TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_aal TO authenticated;

-- Service role needs additional permissions
GRANT EXECUTE ON FUNCTION hash_mfa_code TO service_role;
GRANT EXECUTE ON FUNCTION verify_mfa_code TO service_role;
GRANT EXECUTE ON FUNCTION generate_backup_codes TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_mfa_challenges TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_inactive_mfa_sessions TO service_role;

-- ============================================================================
-- 11. CREATE INITIAL MFA CONFIGURATION FOR EXISTING ADMINS
-- ============================================================================

-- Auto-create MFA configuration for all admin users
INSERT INTO mfa_configuration (profile_id, require_mfa_for_admin)
SELECT id, TRUE
FROM profiles
WHERE user_role IN ('admin', 'super_admin')
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'Migration 008: Admin MFA security system with AAL2 enforcement, rate limiting, and comprehensive audit logging for SOC 2 and GDPR compliance';
