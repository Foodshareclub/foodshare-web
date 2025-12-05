'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

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

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
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

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    throw new Error('Admin access required');
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
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
}

/**
 * Get recent audit logs
 */
export async function getAuditLogs(limit: number = 20): Promise<AuditLog[]> {
  await requireAdmin();
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
}

/**
 * Get listings pending approval
 */
export async function getPendingListings(): Promise<Array<{
  id: number;
  post_name: string;
  post_type: string;
  created_at: string;
  profile: { name: string; email: string } | null;
}>> {
  await requireAdmin();
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
    .select('id, name, email, role, created_at, is_active', { count: 'exact' });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (role) {
    query = query.eq('role', role);
  }
  if (is_active !== undefined) {
    query = query.eq('is_active', is_active);
  }

  query = query
    .order('created_at', { ascending: false })
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
    .update({ role })
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
