/**
 * Audit Logging Service
 * Records all admin actions for compliance and security monitoring
 *
 * Features:
 * - Automatic admin action logging
 * - IP address and user agent tracking
 * - Risk score calculation
 * - AAL level recording
 * - SOC 2 compliance support
 *
 * @module lib/security/auditLog
 */

import { supabase } from '@/lib/supabase/client';
import { MFAService } from './mfa';

export interface AuditLogEntry {
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  mfa_verified?: boolean;
  aal_level?: 'aal1' | 'aal2';
  session_id?: string;
  risk_score?: number;
}

export class AuditLogService {
  /**
   * Log an admin action
   */
  static async logAction(entry: Omit<AuditLogEntry, 'mfa_verified' | 'aal_level'>): Promise<void> {
    try {
      // Get current AAL level
      const currentAAL = await MFAService.getCurrentAAL(entry.admin_id);

      // Get active session
      const session = await MFAService.getActiveSession(entry.admin_id);

      // Calculate risk score
      const riskScore = this.calculateRiskScore({
        action: entry.action,
        aal_level: currentAAL,
        success: entry.success,
      });

      // Create audit log entry
      const { error } = await supabase.from('admin_audit_log').insert({
        ...entry,
        mfa_verified: currentAAL === 'aal2',
        aal_level: currentAAL,
        session_id: session?.session_id,
        risk_score: riskScore,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[AuditLog] Failed to log action:', error);
      }
    } catch (error) {
      console.error('[AuditLog] Exception logging action:', error);
    }
  }

  /**
   * Log successful admin action
   */
  static async logSuccess(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      success: true,
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
    });
  }

  /**
   * Log failed admin action
   */
  static async logFailure(
    adminId: string,
    action: string,
    resourceType: string,
    errorMessage: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logAction({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      success: false,
      error_message: errorMessage,
      ip_address: await this.getClientIP(),
      user_agent: navigator.userAgent,
    });
  }

  /**
   * Get recent audit logs for an admin
   */
  static async getAdminLogs(
    adminId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[AuditLog] Error fetching logs:', error);
      return [];
    }

    return data as AuditLogEntry[];
  }

  /**
   * Get all audit logs (super admin only)
   */
  static async getAllLogs(
    filters?: {
      action?: string;
      resource_type?: string;
      success?: boolean;
      aal_level?: 'aal1' | 'aal2';
      start_date?: string;
      end_date?: string;
    },
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters?.success !== undefined) {
      query = query.eq('success', filters.success);
    }
    if (filters?.aal_level) {
      query = query.eq('aal_level', filters.aal_level);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AuditLog] Error fetching all logs:', error);
      return [];
    }

    return data as AuditLogEntry[];
  }

  /**
   * Calculate risk score for an action
   * Returns 0-100 where higher is more risky
   */
  private static calculateRiskScore(params: {
    action: string;
    aal_level: 'aal1' | 'aal2';
    success: boolean;
  }): number {
    let score = 0;

    // Base score by action type
    const highRiskActions = [
      'user_delete',
      'role_change',
      'circuit_breaker_reset',
      'email_manual_send',
      'config_change',
    ];

    const mediumRiskActions = [
      'user_update',
      'email_view',
      'quota_adjust',
    ];

    if (highRiskActions.includes(params.action)) {
      score += 60;
    } else if (mediumRiskActions.includes(params.action)) {
      score += 30;
    } else {
      score += 10;
    }

    // Add score if not using MFA
    if (params.aal_level === 'aal1') {
      score += 30;
    }

    // Add score for failures
    if (!params.success) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Get client IP address
   */
  private static async getClientIP(): Promise<string> {
    // In production, get this from server-side headers
    // For now, return placeholder
    return '0.0.0.0';
  }
}

/**
 * Decorator to automatically log admin actions
 */
export function LogAdminAction(action: string, resourceType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const adminId = args[0]; // Assume first arg is admin ID

      try {
        const result = await originalMethod.apply(this, args);

        // Log success
        await AuditLogService.logSuccess(
          adminId,
          action,
          resourceType,
          args[1], // Assume second arg is resource ID
          { args }
        );

        return result;
      } catch (error) {
        // Log failure
        await AuditLogService.logFailure(
          adminId,
          action,
          resourceType,
          error instanceof Error ? error.message : 'Unknown error',
          args[1],
          { args }
        );

        throw error;
      }
    };

    return descriptor;
  };
}
