/**
 * Admin Data Layer
 *
 * Cached data fetching functions for admin dashboard.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS } from './cache-keys';

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  activeProducts: number;
  pendingProducts: number;
  totalChats: number;
  newUsersThisWeek: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  details: Record<string, unknown>;
  created_at: string;
  user: { name: string; email: string } | null;
}

export interface PendingListing {
  id: number;
  post_name: string;
  post_type: string;
  created_at: string;
  profile: { name: string; email: string } | null;
}

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get dashboard statistics with caching
 */
export const getDashboardStats = unstable_cache(
  async (): Promise<DashboardStats> => {
    const supabase = await createClient();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      { count: totalUsers },
      { count: totalProducts },
      { count: activeProducts },
      { count: pendingProducts },
      { count: totalChats },
      { count: newUsersThisWeek },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_active', false),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_time', oneWeekAgo.toISOString()),
    ]);

    return {
      totalUsers: totalUsers ?? 0,
      totalProducts: totalProducts ?? 0,
      activeProducts: activeProducts ?? 0,
      pendingProducts: pendingProducts ?? 0,
      totalChats: totalChats ?? 0,
      newUsersThisWeek: newUsersThisWeek ?? 0,
    };
  },
  ['admin-dashboard-stats'],
  {
    revalidate: CACHE_DURATIONS.ADMIN_STATS,
    tags: [CACHE_TAGS.ADMIN_STATS, CACHE_TAGS.ADMIN],
  }
);

/**
 * Get recent audit logs with caching
 */
export const getAuditLogs = unstable_cache(
  async (limit: number = 20): Promise<AuditLog[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        admin_id,
        metadata,
        created_at,
        admin:profiles!admin_id(first_name, second_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch audit logs:', error.message);
      return [];
    }

    return (data ?? []).map(log => {
      const admin = extractFirst(log.admin as Array<{ first_name: string; second_name: string; email: string }>);
      const fullName = admin ? [admin.first_name, admin.second_name].filter(Boolean).join(' ') : null;
      return {
        id: log.id,
        action: log.action,
        entity_type: log.resource_type || '',
        entity_id: log.resource_id || '',
        user_id: log.admin_id,
        details: (log.metadata as Record<string, unknown>) || {},
        created_at: log.created_at,
        user: admin ? { name: fullName || 'Unknown', email: admin.email || '' } : null,
      };
    });
  },
  ['admin-audit-logs'],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.AUDIT_LOGS, CACHE_TAGS.ADMIN],
  }
);

/**
 * Get listings pending approval with caching
 */
export const getPendingListings = unstable_cache(
  async (): Promise<PendingListing[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        post_name,
        post_type,
        created_at,
        profile:profiles!profile_id(first_name, second_name, email)
      `)
      .eq('is_active', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch pending listings:', error.message);
      return [];
    }

    return (data ?? []).map(listing => {
      const profile = extractFirst(listing.profile as Array<{ first_name: string; second_name: string; email: string }>);
      const fullName = profile ? [profile.first_name, profile.second_name].filter(Boolean).join(' ') : null;
      return {
        id: listing.id,
        post_name: listing.post_name || '',
        post_type: listing.post_type || '',
        created_at: listing.created_at,
        profile: profile ? { name: fullName || 'Unknown', email: profile.email || '' } : null,
      };
    });
  },
  ['admin-pending-listings'],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.ADMIN_LISTINGS, CACHE_TAGS.ADMIN],
  }
);
