/**
 * Safe Auth Helpers
 * 
 * These functions wrap Supabase auth calls to gracefully handle
 * database unavailability during maintenance periods.
 * 
 * When the DB is down, these return null/false instead of throwing.
 */

import { createClient } from './server';
import type { User, Session } from '@supabase/supabase-js';

export interface SafeAuthUser {
  id: string;
  email: string | undefined;
  profile?: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
    user_role: string | null;
    email: string | null;
  } | null;
}

/**
 * Safely get current session
 * Returns null if DB is unavailable
 */
export async function safeGetSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Safely get current user
 * Returns null if DB is unavailable
 */
export async function safeGetUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Safely get current user with profile
 * Returns null if DB is unavailable
 */
export async function safeGetUserWithProfile(): Promise<SafeAuthUser | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) return null;

    // Try to get profile, but don't fail if it errors
    let profile = null;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, second_name, avatar_url, user_role, email')
        .eq('id', data.user.id)
        .single();
      profile = profileData;
    } catch {
      // Profile fetch failed, continue without it
    }

    return {
      id: data.user.id,
      email: data.user.email,
      profile,
    };
  } catch {
    return null;
  }
}

/**
 * Safely check if user is admin
 * Returns false if DB is unavailable
 */
export async function safeCheckIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_role')
      .eq('id', data.user.id)
      .single();

    return profile?.user_role === 'admin' || profile?.user_role === 'superadmin';
  } catch {
    return false;
  }
}

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
