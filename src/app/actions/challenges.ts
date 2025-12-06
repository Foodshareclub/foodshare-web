'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';
import { revalidatePath } from 'next/cache';

/**
 * Accept a challenge - adds user to challenge_participants
 */
export async function acceptChallenge(
  challengeId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if already accepted
  const { data: existing } = await supabase
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    return { success: true }; // Already accepted
  }

  // Insert participation
  const { error } = await supabase.from('challenge_participants').insert({
    challenge_id: challengeId,
    profile_id: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Update challenged_people count
  await supabase.rpc('increment_challenged_people', { challenge_id: challengeId });

  invalidateTag(CACHE_TAGS.CHALLENGES);
  revalidatePath(`/challenge/${challengeId}`);

  return { success: true };
}

/**
 * Check if user has accepted a challenge
 */
export async function hasAcceptedChallenge(
  challengeId: number
): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data } = await supabase
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('profile_id', user.id)
    .single();

  return !!data;
}

/**
 * Toggle like on a challenge
 */
export async function toggleChallengeLike(
  challengeId: number
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, isLiked: false, error: 'Not authenticated' };
  }

  // For now, just update the counter (simplified - no separate likes table)
  // In production, you'd want a challenge_likes table similar to post_likes
  const { error } = await supabase
    .from('challenges')
    .update({ challenge_likes_counter: supabase.rpc('increment', { x: 1 }) })
    .eq('id', challengeId);

  if (error) {
    return { success: false, isLiked: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.CHALLENGES);
  return { success: true, isLiked: true };
}
