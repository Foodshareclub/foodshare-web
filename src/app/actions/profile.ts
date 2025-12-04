'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  role: string;
  is_volunteer: boolean;
  created_at: string;
  updated_at: string;
}

// Full profile type matching database schema
export interface PublicProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  username: string | null;
  avatar_url: string | null;
  about_me: string | null;
  user_location: string | null;
  created_time: string | null;
  role: {
    admin: boolean;
    volunteer: boolean;
    subscriber: boolean;
    organization: boolean;
  } | null;
}

export interface ProfileStats {
  totalProducts: number;
  activeProducts: number;
  totalReviews: number;
  averageRating: number;
}

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get public profile for viewing (used on /profile/[id] page)
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, second_name, username, avatar_url, about_me, user_location, created_time, role')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return getProfile(user.id);
}

/**
 * Update profile
 */
export async function updateProfile(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const profileData: Record<string, unknown> = {};

  const fields = ['name', 'bio', 'phone', 'location'];
  for (const field of fields) {
    const value = formData.get(field);
    if (value !== null) {
      profileData[field] = value;
    }
  }

  const isVolunteer = formData.get('is_volunteer');
  if (isVolunteer !== null) {
    profileData.is_volunteer = isVolunteer === 'true';
  }

  profileData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/profile/${user.id}`);

  return { success: true };
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const file = formData.get('avatar') as File;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/profile/${user.id}`);

  return { success: true, url: publicUrl };
}

/**
 * Get volunteers list
 */
export async function getVolunteers(): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_volunteer', true)
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<ProfileStats> {
  const supabase = await createClient();

  // Get product counts
  const { count: totalProducts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId);

  const { count: activeProducts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('is_active', true);

  // Get review stats
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('reviewed_user_id', userId);

  const totalReviews = reviews?.length ?? 0;
  const averageRating = totalReviews > 0
    ? (reviews?.reduce((sum, r) => sum + (r.rating || 0), 0) ?? 0) / totalReviews
    : 0;

  return {
    totalProducts: totalProducts ?? 0,
    activeProducts: activeProducts ?? 0,
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

/**
 * Get profile reviews
 */
export async function getProfileReviews(userId: string): Promise<Array<{
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: { name: string; avatar_url: string | null } | null;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer:profiles!reviewer_id(name, avatar_url)
    `)
    .eq('reviewed_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map(review => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    reviewer: extractFirst(review.reviewer as Array<{ name: string; avatar_url: string | null }>),
  }));
}
