/**
 * Multi-Factor Authentication (MFA) Service
 * Enterprise-grade MFA implementation with SMS and Email verification
 *
 * Security Features:
 * - Rate limiting (5 attempts per 15 minutes)
 * - Code expiration (5 minutes)
 * - Bcrypt hashing for code storage
 * - AAL2 session management
 * - Comprehensive audit logging
 *
 * @module lib/security/mfa
 */

import { supabase } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger("MFAService");

// ============================================================================
// Types
// ============================================================================

export type MFAMethod = 'sms' | 'email' | 'both';
export type AALLevel = 'aal1' | 'aal2';

export interface MFAConfiguration {
  id: string;
  profile_id: string;
  is_mfa_enabled: boolean;
  mfa_method: MFAMethod | null;
  phone_verified: boolean;
  email_verified: boolean;
  require_mfa_for_admin: boolean;
  backup_codes: string[] | null;
  backup_codes_used: string[] | null;
  mfa_enabled_at: string | null;
  last_mfa_verification_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MFAChallenge {
  success: boolean;
  challenge_id?: string;
  code?: string; // Only for sending via email/SMS
  expires_at?: string;
  method?: MFAMethod;
  error?: string;
  locked_until?: string;
}

export interface MFAVerificationResult {
  success: boolean;
  session_id?: string;
  aal?: AALLevel;
  verified_at?: string;
  error?: string;
  attempts_remaining?: number;
}

export interface MFASession {
  id: string;
  profile_id: string;
  session_id: string;
  current_aal: AALLevel;
  mfa_verified_at: string | null;
  mfa_method_used: MFAMethod | null;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  last_activity_at: string;
  is_active: boolean;
  created_at: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  locked_until?: string;
  reason?: string;
  window_reset_at?: string;
  attempts?: number;
}

// ============================================================================
// MFA Service
// ============================================================================

export class MFAService {
  /**
   * Check if user has MFA enabled
   */
  static async isMFAEnabled(profileId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('mfa_configuration')
      .select('is_mfa_enabled')
      .eq('profile_id', profileId)
      .single();

    if (error || !data) return false;
    return data.is_mfa_enabled;
  }

  /**
   * Check if user requires MFA (admins always require it)
   */
  static async requiresMFA(profileId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('requires_mfa', {
      p_profile_id: profileId,
    });

    if (error) {
      logger.error("Error checking MFA requirement", error);
      return false;
    }

    return data as boolean;
  }

  /**
   * Get current Authenticator Assurance Level
   */
  static async getCurrentAAL(profileId: string): Promise<AALLevel> {
    const { data, error } = await supabase.rpc('get_current_aal', {
      p_profile_id: profileId,
    });

    if (error) {
      logger.error("Error getting AAL", error);
      return 'aal1';
    }

    return (data as AALLevel) || 'aal1';
  }

  /**
   * Get user's MFA configuration
   */
  static async getConfiguration(profileId: string): Promise<MFAConfiguration | null> {
    const { data, error } = await supabase
      .from('mfa_configuration')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      logger.error("Error fetching configuration", error);
      return null;
    }

    return data as MFAConfiguration;
  }

  /**
   * Create MFA verification challenge
   * This generates a code and sends it via SMS or Email
   */
  static async createChallenge(
    profileId: string,
    method: 'sms' | 'email'
  ): Promise<MFAChallenge> {
    try {
      // Get IP address and user agent for rate limiting
      const ipAddress = await this.getClientIPAddress();
      const userAgent = navigator.userAgent;

      // Create challenge via database function
      const { data, error } = await supabase.rpc('create_mfa_challenge', {
        p_profile_id: profileId,
        p_method: method,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
      });

      if (error) {
        logger.error("Error creating challenge", error);
        return {
          success: false,
          error: error.message,
        };
      }

      const result = data as MFAChallenge;

      // If successful, send the code
      if (result.success && result.code) {
        await this.sendVerificationCode(profileId, method, result.code);
      }

      return result;
    } catch (error) {
      logger.error("Exception creating challenge", error as Error);
      return {
        success: false,
        error: 'Failed to create MFA challenge',
      };
    }
  }

  /**
   * Verify MFA challenge code
   */
  static async verifyChallenge(
    challengeId: string,
    code: string,
    profileId: string
  ): Promise<MFAVerificationResult> {
    try {
      const { data, error } = await supabase.rpc('verify_mfa_challenge', {
        p_challenge_id: challengeId,
        p_code: code,
        p_profile_id: profileId,
      });

      if (error) {
        logger.error("Error verifying challenge", error);
        return {
          success: false,
          error: error.message,
        };
      }

      const result = data as MFAVerificationResult;

      // Log successful verification
      if (result.success) {
        logger.info("Challenge verified successfully", {
          session_id: result.session_id,
          aal: result.aal,
        });
      }

      return result;
    } catch (error) {
      logger.error("Exception verifying challenge", error as Error);
      return {
        success: false,
        error: 'Failed to verify MFA code',
      };
    }
  }

  /**
   * Enroll user in MFA
   */
  static async enrollMFA(
    profileId: string,
    method: MFAMethod,
    phoneNumber?: string
  ): Promise<{ success: boolean; error?: string; backup_codes?: string[] }> {
    try {
      // Generate backup codes
      const { data: backupCodes, error: backupError } = await supabase.rpc(
        'generate_backup_codes',
        { count: 10 }
      );

      if (backupError) {
        logger.error("Error generating backup codes", backupError);
        return { success: false, error: backupError.message };
      }

      // Create or update MFA configuration
      const { error: configError } = await supabase
        .from('mfa_configuration')
        .upsert({
          profile_id: profileId,
          is_mfa_enabled: true,
          mfa_method: method,
          backup_codes: backupCodes as string[],
          backup_codes_used: [],
          mfa_enabled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (configError) {
        logger.error("Error saving configuration", configError);
        return { success: false, error: configError.message };
      }

      // If enrolling with phone, update profile
      if (method === 'sms' && phoneNumber) {
        await supabase
          .from('profiles')
          .update({ phone: phoneNumber })
          .eq('id', profileId);
      }

      return {
        success: true,
        backup_codes: backupCodes as string[],
      };
    } catch (error) {
      logger.error("Exception enrolling MFA", error as Error);
      return {
        success: false,
        error: 'Failed to enroll in MFA',
      };
    }
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('mfa_configuration')
        .update({
          is_mfa_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', profileId);

      if (error) {
        logger.error("Error disabling MFA", error);
        return { success: false, error: error.message };
      }

      // Invalidate all active sessions
      await supabase
        .from('mfa_sessions')
        .update({ is_active: false })
        .eq('profile_id', profileId)
        .eq('is_active', true);

      return { success: true };
    } catch (error) {
      logger.error("Exception disabling MFA", error as Error);
      return { success: false, error: 'Failed to disable MFA' };
    }
  }

  /**
   * Get active MFA session
   */
  static async getActiveSession(profileId: string): Promise<MFASession | null> {
    const { data, error } = await supabase
      .from('mfa_sessions')
      .select('*')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data as MFASession;
  }

  /**
   * Update session activity (extend session)
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    await supabase
      .from('mfa_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Extend by 1 hour
      })
      .eq('session_id', sessionId);
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(
    profileId: string,
    code: string
  ): Promise<MFAVerificationResult> {
    try {
      // Get MFA configuration
      const config = await this.getConfiguration(profileId);
      if (!config || !config.backup_codes) {
        return {
          success: false,
          error: 'No backup codes available',
        };
      }

      // Check if code exists and hasn't been used
      const codeIndex = config.backup_codes.indexOf(code);
      if (codeIndex === -1) {
        return {
          success: false,
          error: 'Invalid backup code',
        };
      }

      if (config.backup_codes_used?.includes(code)) {
        return {
          success: false,
          error: 'Backup code already used',
        };
      }

      // Mark code as used
      const usedCodes = [...(config.backup_codes_used || []), code];
      await supabase
        .from('mfa_configuration')
        .update({
          backup_codes_used: usedCodes,
          last_mfa_verification_at: new Date().toISOString(),
        })
        .eq('profile_id', profileId);

      // Create MFA session
      const sessionId = crypto.randomUUID();
      await supabase.from('mfa_sessions').insert({
        profile_id: profileId,
        session_id: sessionId,
        current_aal: 'aal2',
        mfa_verified_at: new Date().toISOString(),
        mfa_method_used: 'backup_code',
      });

      return {
        success: true,
        session_id: sessionId,
        aal: 'aal2',
        verified_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Exception verifying backup code", error as Error);
      return {
        success: false,
        error: 'Failed to verify backup code',
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Send verification code via SMS or Email
   */
  private static async sendVerificationCode(
    profileId: string,
    method: 'sms' | 'email',
    code: string
  ): Promise<void> {
    try {
      // Get user details
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone, first_name')
        .eq('id', profileId)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      if (method === 'email') {
        // Send email via email queue
        await supabase.from('email_queue').insert({
          recipient_id: profileId,
          recipient_email: profile.email,
          email_type: 'mfa_verification',
          subject: 'Your verification code',
          template_data: {
            first_name: profile.first_name,
            code: code,
            expires_in: '5 minutes',
          },
          priority: 'high',
        });

        logger.info("Verification code sent via email", { email: profile.email });
      } else if (method === 'sms') {
        // TODO: Integrate with SMS provider (Twilio, MessageBird, etc.)
        // For now, log the code (in production, this should send actual SMS)
        if (process.env.NODE_ENV !== 'production') {
          logger.debug("SMS verification code (dev mode)", { code, phone: profile.phone });
        }

        // In production, you would call an SMS API here:
        // await this.sendSMS(profile.phone, `Your verification code is: ${code}`);
      }
    } catch (error) {
      logger.error("Error sending verification code", error as Error);
      throw error;
    }
  }

  /**
   * Get client IP address (best effort)
   */
  private static async getClientIPAddress(): Promise<string> {
    try {
      // In a real application, you might get this from a header set by your server
      // For now, return a placeholder
      return '0.0.0.0';
    } catch {
      return '0.0.0.0';
    }
  }
}

// ============================================================================
// MFA Hooks for React Components
// ============================================================================

/**
 * Check if admin requires MFA verification
 * Returns true if user is admin and hasn't verified MFA in current session
 */
export async function checkAdminMFARequired(): Promise<{
  required: boolean;
  currentAAL: AALLevel;
  isAdmin: boolean;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { required: false, currentAAL: 'aal1', isAdmin: false };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const roles = (profile?.role as Record<string, boolean>) || {};
    const isAdmin = roles.admin === true || roles.superadmin === true;

    if (!isAdmin) {
      return { required: false, currentAAL: 'aal1', isAdmin: false };
    }

    // Check current AAL level
    const currentAAL = await MFAService.getCurrentAAL(user.id);

    // Admins need AAL2
    const required = currentAAL !== 'aal2';

    return { required, currentAAL, isAdmin: true };
  } catch (error) {
    logger.error("Error checking admin MFA requirement", error as Error);
    return { required: false, currentAAL: 'aal1', isAdmin: false };
  }
}

/**
 * Validate admin has AAL2 before allowing sensitive operations
 */
export async function validateAdminAAL2(): Promise<{
  valid: boolean;
  error?: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { valid: false, error: 'Not authenticated' };
  }

  const currentAAL = await MFAService.getCurrentAAL(user.id);

  if (currentAAL !== 'aal2') {
    return {
      valid: false,
      error: 'Multi-factor authentication required for this action',
    };
  }

  return { valid: true };
}
