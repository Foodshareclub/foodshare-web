'use server';

/**
 * Feedback Server Actions
 * Handles feedback submission with proper server-side validation
 */

import { createClient } from '@/lib/supabase/server';
import { serverActionError, type ServerActionResult } from '@/lib/errors';

// ============================================================================
// Types
// ============================================================================

export type FeedbackType = 'general' | 'bug' | 'feature' | 'complaint';

export interface FeedbackData {
  name: string;
  email: string;
  subject: string;
  message: string;
  feedback_type: FeedbackType;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Submit feedback from a user
 */
export async function submitFeedback(
  data: FeedbackData
): Promise<ServerActionResult<{ id: number }>> {
  try {
    const supabase = await createClient();

    // Validate inputs
    if (!data.name?.trim()) {
      return serverActionError('Name is required', 'VALIDATION_ERROR');
    }
    if (!data.email?.trim()) {
      return serverActionError('Email is required', 'VALIDATION_ERROR');
    }
    if (!data.subject?.trim()) {
      return serverActionError('Subject is required', 'VALIDATION_ERROR');
    }
    if (!data.message?.trim()) {
      return serverActionError('Message is required', 'VALIDATION_ERROR');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return serverActionError('Please enter a valid email address', 'VALIDATION_ERROR');
    }

    // Get current user ID if authenticated (optional)
    const { data: { user } } = await supabase.auth.getUser();

    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        profile_id: user?.id ?? null,
        name: data.name.trim(),
        email: data.email.trim(),
        subject: data.subject.trim(),
        message: data.message.trim(),
        feedback_type: data.feedback_type,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      return serverActionError(error.message, 'DATABASE_ERROR');
    }

    return {
      success: true,
      data: { id: feedback.id },
    };
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return serverActionError('Failed to submit feedback. Please try again.', 'UNKNOWN_ERROR');
  }
}

/**
 * Get user's previous feedback submissions
 */
export async function getUserFeedback(): Promise<ServerActionResult<FeedbackData[]>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError('You must be logged in to view feedback', 'UNAUTHORIZED');
    }

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return serverActionError(error.message, 'DATABASE_ERROR');
    }

    return {
      success: true,
      data: data ?? [],
    };
  } catch (error) {
    console.error('Failed to get user feedback:', error);
    return serverActionError('Failed to load feedback', 'UNKNOWN_ERROR');
  }
}
