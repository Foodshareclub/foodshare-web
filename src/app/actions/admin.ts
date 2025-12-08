'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// Re-export types from data layer for backwards compatibility
export type {
  DashboardStats,
  AuditLog,
  PendingListing,
} from '@/lib/data/admin';

// Re-export cached data functions for backwards compatibility
export {
  getDashboardStats,
  getAuditLogs,
  getPendingListings,
} from '@/lib/data/admin';

export interface AdminUser {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string;
  user_role: string | null;
  created_time: string | null;
  is_active: boolean;
  products_count: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Check if current user is admin (throws if not)
 */
async function requireAdmin(): Promise<void> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role')
    .eq('id', user.id)
    .single();

  if (profile?.user_role !== 'admin' && profile?.user_role !== 'superadmin') {
    throw new Error('Admin access required');
  }
}

/**
 * Approve a listing
 */
export async function approveListing(id: number): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('posts')
    .update({ is_active: true })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    action: 'approve_listing',
    entity_type: 'post',
    entity_id: String(id),
    user_id: user?.id,
    details: { listing_id: id },
  });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.PRODUCTS);
  invalidateTag(CACHE_TAGS.PRODUCT(id));

  return { success: true };
}

/**
 * Reject a listing
 */
export async function rejectListing(
  id: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    action: 'reject_listing',
    entity_type: 'post',
    entity_id: String(id),
    user_id: user?.id,
    details: { listing_id: id, reason },
  });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);

  return { success: true };
}

/**
 * Get users list with filters
 */
export async function getUsers(filters: UserFilters = {}): Promise<{
  users: AdminUser[];
  total: number;
}> {
  await requireAdmin();
  const supabase = await createClient();

  const { search, role, is_active, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('profiles')
    .select('id, first_name, second_name, email, user_role, created_time, is_active', { count: 'exact' });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,second_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq('user_role', role);
  }
  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }

  query = query
    .order('created_time', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw new Error(error.message);

  // Get product counts for each user
  const usersWithCounts = await Promise.all(
    (data ?? []).map(async (user) => {
      const { count: productsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user.id);

      return {
        ...user,
        products_count: productsCount ?? 0,
      };
    })
  );

  return {
    users: usersWithCounts,
    total: count ?? 0,
  };
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Prevent changing own role
  if (user?.id === userId) {
    return { success: false, error: 'Cannot change your own role' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ user_role: role })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log the action
  await supabase.from('audit_logs').insert({
    action: 'update_user_role',
    entity_type: 'profile',
    entity_id: userId,
    user_id: user?.id,
    details: { target_user_id: userId, new_role: role },
  });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.PROFILES);

  return { success: true };
}

/**
 * Ban a user
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Prevent banning yourself
  if (user?.id === userId) {
    return { success: false, error: 'Cannot ban yourself' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, ban_reason: reason })
    .eq('id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Deactivate all user's listings
  await supabase
    .from('posts')
    .update({ is_active: false })
    .eq('profile_id', userId);

  // Log the action
  await supabase.from('audit_logs').insert({
    action: 'ban_user',
    entity_type: 'profile',
    entity_id: userId,
    user_id: user?.id,
    details: { target_user_id: userId, reason },
  });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.PROFILES);
  invalidateTag(CACHE_TAGS.PRODUCTS);

  return { success: true };
}
