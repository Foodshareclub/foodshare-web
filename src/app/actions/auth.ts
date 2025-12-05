'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { User, Session } from '@supabase/supabase-js';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

export interface AuthUser {
  id: string;
  email: string | undefined;
  profile?: {
    id: string;
    name: string;
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
    role: string;
    email: string | null;
  } | null;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user with profile
 */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, first_name, second_name, avatar_url, role, email')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    profile,
  };
}

/**
 * Check if current user is admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin' || profile?.role === 'superadmin';
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
  const name = formData.get('name') as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
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
      name,
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
  provider: 'google' | 'github' | 'facebook'
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
