'use server';

/**
 * Email Preferences Server Actions
 * Handles all email preference operations with proper server-side validation
 */

import { createClient } from '@/lib/supabase/server';
import { serverActionError, successVoid, type ServerActionResult } from '@/lib/errors';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// ============================================================================
// Types
// ============================================================================

export interface EmailPreferences {
  chat_notifications: boolean;
  food_listings_notifications: boolean;
  feedback_notifications: boolean;
  review_reminders: boolean;
  notification_frequency: 'instant' | 'daily_digest' | 'weekly_digest';
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Get email preferences for the current user
 */
export async function getEmailPreferences(): Promise<ServerActionResult<EmailPreferences | null>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError('You must be logged in to view preferences', 'UNAUTHORIZED');
    }

    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('profile_id', user.id)
      .single();

    // PGRST116 means no rows found - return default preferences
    if (error && error.code === 'PGRST116') {
      return {
        success: true,
        data: null,
      };
    }

    if (error) {
      return serverActionError(error.message, 'DATABASE_ERROR');
    }

    return {
      success: true,
      data: {
        chat_notifications: data.chat_notifications,
        food_listings_notifications: data.food_listings_notifications,
        feedback_notifications: data.feedback_notifications,
        review_reminders: data.review_reminders,
        notification_frequency: data.notification_frequency,
        quiet_hours_start: data.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end,
      },
    };
  } catch (error) {
    console.error('Failed to get email preferences:', error);
    return serverActionError('Failed to load preferences', 'UNKNOWN_ERROR');
  }
}

/**
 * Update email preferences for the current user
 */
export async function updateEmailPreferences(
  preferences: EmailPreferences
): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError('You must be logged in to update preferences', 'UNAUTHORIZED');
    }

    const { error } = await supabase
      .from('email_preferences')
      .upsert({
        profile_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return serverActionError(error.message, 'DATABASE_ERROR');
    }

    invalidateTag(CACHE_TAGS.PROFILES);

    return successVoid();
  } catch (error) {
    console.error('Failed to update email preferences:', error);
    return serverActionError('Failed to save preferences', 'UNKNOWN_ERROR');
  }
}

/**
 * Reset email preferences to defaults
 */
export async function resetEmailPreferences(): Promise<ServerActionResult<void>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError('You must be logged in to reset preferences', 'UNAUTHORIZED');
    }

    const { error } = await supabase
      .from('email_preferences')
      .delete()
      .eq('profile_id', user.id);

    if (error) {
      return serverActionError(error.message, 'DATABASE_ERROR');
    }

    invalidateTag(CACHE_TAGS.PROFILES);

    return successVoid();
  } catch (error) {
    console.error('Failed to reset email preferences:', error);
    return serverActionError('Failed to reset preferences', 'UNKNOWN_ERROR');
  }
}
