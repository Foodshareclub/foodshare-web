'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// Re-export cached data functions for backward compatibility
export {
  getProfile,
  getPublicProfile,
  getUserStats,
  getVolunteers,
  getProfileReviews,
} from '@/lib/data/profiles';

export type {
  Profile,
  PublicProfile,
  ProfileStats,
  ProfileReview,
} from '@/lib/data/profiles';

import { getProfile, type Profile } from '@/lib/data/profiles';

/**
 * Get current user's profile (not cached - depends on auth)
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

  // Invalidate profile caches
  invalidateTag(CACHE_TAGS.PROFILES);
  invalidateTag(CACHE_TAGS.PROFILE(user.id));

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

  // Invalidate profile caches
  invalidateTag(CACHE_TAGS.PROFILES);
  invalidateTag(CACHE_TAGS.PROFILE(user.id));

  return { success: true, url: publicUrl };
}
