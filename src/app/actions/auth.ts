'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { User, Session } from '@supabase/supabase-js';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// Import and re-export AuthUser type from data layer for consistency
import type { AuthUser } from '@/lib/data/auth';
export type { AuthUser };

/**
 * Check if a string is a full URL (http/https)
 */
function isFullUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Resolve avatar URL to a public URL
 * If it's already a full URL, return as-is
 * If it's a storage path, generate the public URL
 */
async function resolveAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  avatarUrl: string | null
): Promise<string | null> {
  if (!avatarUrl || avatarUrl.trim() === '') return null;
  
  // If already a full URL, return as-is
  if (isFullUrl(avatarUrl)) return avatarUrl;
  
  // Otherwise, it's a storage path - get the public URL
  const { data } = supabase.storage.from('profiles').getPublicUrl(avatarUrl);
  return data?.publicUrl || null;
}

/**
 * Get current session
 * Returns null if DB is unavailable (graceful degradation)
 */
export async function getSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return null;
    return session;
  } catch {
    // DB unavailable - return null gracefully
    return null;
  }
}

/**
 * Get current user with profile
 * Returns null if DB is unavailable (graceful degradation)
 * Resolves avatar_url to a public URL if it's a storage path
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Auth error or no user = return null gracefully
    if (authError || !user) return null;

    // Get profile data - also wrapped in try-catch
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, second_name, nickname, avatar_url, email')
        .eq('id', user.id)
        .single();

      // Resolve avatar URL to public URL if needed
      const resolvedAvatarUrl = profile?.avatar_url 
        ? await resolveAvatarUrl(supabase, profile.avatar_url)
        : null;

      return {
        id: user.id,
        email: user.email,
        profile: profile ? {
          ...profile,
          avatar_url: resolvedAvatarUrl,
        } : null,
      };
    } catch {
      // Profile fetch failed, return user without profile
      return {
        id: user.id,
        email: user.email,
        profile: null,
      };
    }
  } catch {
    // DB unavailable - return null gracefully
    return null;
  }
}

/**
 * Check if current user is admin
 * Checks the user_roles junction table (source of truth)
 * Returns false if DB is unavailable (graceful degradation)
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return false;

    // Check user_roles table (source of truth for admin status)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('roles!inner(name)')
      .eq('profile_id', user.id)
      .in('roles.name', ['admin', 'superadmin'])
      .maybeSingle();

    return !!userRole;
  } catch {
    return false;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');
  invalidateTag(CACHE_TAGS.AUTH);
  return { success: true };
}

/**
 * Sign up with email and password
 */
export async function signUp(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string | null;
  const lastName = formData.get('lastName') as string | null;
  const name = formData.get('name') as string | null;

  // Build display name from firstName/lastName or use name directly
  const displayName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : firstName || name || '';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: displayName,
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Create profile
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      first_name: firstName || displayName,
      second_name: lastName || '',
      email,
    });
  }

  revalidatePath('/', 'layout');
  invalidateTag(CACHE_TAGS.AUTH);
  invalidateTag(CACHE_TAGS.PROFILES);
  return { success: true };
}

/**
 * Sign out and redirect
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  invalidateTag(CACHE_TAGS.AUTH);
  redirect('/');
}

/**
 * Request password reset
 */
export async function resetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update password (for authenticated users)
 */
export async function updatePassword(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const newPassword = formData.get('password') as string;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get OAuth sign in URL
 */
export async function getOAuthSignInUrl(
  provider: 'google' | 'github' | 'facebook' | 'apple'
): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data.url };
}
