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
      supabase.from('chats').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
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
      .from('audit_logs')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        created_at,
        user:profiles!user_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return (data ?? []).map(log => ({
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      user_id: log.user_id,
      details: log.details as Record<string, unknown>,
      created_at: log.created_at,
      user: extractFirst(log.user as Array<{ name: string; email: string }>),
    }));
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
        profile:profiles!profile_id(name, email)
      `)
      .eq('is_active', false)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map(listing => ({
      id: listing.id,
      post_name: listing.post_name,
      post_type: listing.post_type,
      created_at: listing.created_at,
      profile: extractFirst(listing.profile as Array<{ name: string; email: string }>),
    }));
  },
  ['admin-pending-listings'],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.ADMIN_LISTINGS, CACHE_TAGS.ADMIN],
  }
);
