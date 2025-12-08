'use server';

/**
 * Chat Server Actions
 * Mutations for food sharing chat system
 */

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

// ============================================================================
// Food Sharing Chat Actions
// ============================================================================

/**
 * Send a message in a food sharing chat room
 */
export async function sendFoodChatMessage(formData: FormData) {
  const roomId = formData.get('roomId') as string;
  const text = formData.get('text') as string;
  const image = formData.get('image') as string | null;

  if (!roomId || !text?.trim()) {
    return { error: 'Room ID and message text are required' };
  }

  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  // Insert message
  const { error: messageError } = await supabase
    .from('room_participants')
    .insert({
      room_id: roomId,
      profile_id: user.id,
      text: text.trim(),
      image: image || null,
    });

  if (messageError) {
    console.error('Error sending message:', messageError);
    return { error: 'Failed to send message' };
  }

  // Update room with last message info
  const { error: roomError } = await supabase
    .from('rooms')
    .update({
      last_message: text.trim(),
      last_message_sent_by: user.id,
      last_message_seen_by: user.id,
      last_message_time: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (roomError) {
    console.error('Error updating room:', roomError);
  }

  // Invalidate cache
  invalidateTag(CACHE_TAGS.CHATS);
  invalidateTag(CACHE_TAGS.CHAT(roomId));
  invalidateTag(CACHE_TAGS.CHAT_MESSAGES(roomId));

  return { success: true };
}

/**
 * Mark food chat room as read
 */
export async function markFoodChatAsRead(roomId: string) {
  if (!roomId) {
    return { error: 'Room ID is required' };
  }

  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('rooms')
    .update({ last_message_seen_by: user.id })
    .eq('id', roomId);

  if (error) {
    console.error('Error marking as read:', error);
    return { error: 'Failed to mark as read' };
  }

  invalidateTag(CACHE_TAGS.CHATS);
  invalidateTag(CACHE_TAGS.CHAT(roomId));

  return { success: true };
}

/**
 * Create a new food sharing chat room
 */
export async function createFoodChatRoom(postId: number, sharerId: string) {
  if (!postId || !sharerId) {
    return { error: 'Post ID and sharer ID are required' };
  }

  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: 'Not authenticated' };
  }

  // Check if room already exists
  const { data: existingRoom } = await supabase
    .from('rooms')
    .select('id')
    .eq('post_id', postId)
    .eq('sharer', sharerId)
    .eq('requester', user.id)
    .single();

  if (existingRoom) {
    return { success: true, roomId: existingRoom.id };
  }

  // Create new room
  const { data: newRoom, error } = await supabase
    .from('rooms')
    .insert({
      post_id: postId,
      sharer: sharerId,
      requester: user.id,
      last_message: '',
      last_message_sent_by: user.id,
      last_message_seen_by: user.id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating room:', error);
    return { error: 'Failed to create chat room' };
  }

  invalidateTag(CACHE_TAGS.CHATS);

  return { success: true, roomId: newRoom.id };
}
