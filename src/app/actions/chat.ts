'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';

export interface Chat {
  id: string;
  created_at: string;
  updated_at: string;
  product_id: number | null;
  last_message: string | null;
  last_message_at: string | null;
  participants: Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>;
  unread_count: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender: {
    name: string;
    avatar_url: string | null;
  } | null;
}

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Get current user's chat list
 */
export async function getChats(): Promise<Chat[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('chats')
    .select(`
      id,
      created_at,
      updated_at,
      product_id,
      last_message,
      last_message_at,
      chat_participants!inner(
        profile:profiles(id, name, avatar_url)
      )
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw new Error(error.message);

  // Transform data to match Chat interface
  return (data ?? []).map(chat => {
    const participants = (chat.chat_participants as Array<{ profile: unknown }>)
      .map(p => extractFirst(p.profile as Array<{ id: string; name: string; avatar_url: string | null }>))
      .filter((p): p is { id: string; name: string; avatar_url: string | null } => p !== null && p.id !== user.id);

    return {
      id: chat.id,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      product_id: chat.product_id,
      last_message: chat.last_message,
      last_message_at: chat.last_message_at,
      participants,
      unread_count: 0,
    };
  });
}

/**
 * Get a single chat by ID with messages
 */
export async function getChatById(chatId: string): Promise<{
  chat: Chat | null;
  messages: Message[];
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { chat: null, messages: [] };

  // Get chat
  const { data: chatData } = await supabase
    .from('chats')
    .select(`
      id,
      created_at,
      updated_at,
      product_id,
      last_message,
      last_message_at,
      chat_participants(
        profile:profiles(id, name, avatar_url)
      )
    `)
    .eq('id', chatId)
    .single();

  // Get messages
  const { data: messagesData } = await supabase
    .from('messages')
    .select(`
      id,
      chat_id,
      sender_id,
      content,
      created_at,
      is_read,
      sender:profiles!sender_id(name, avatar_url)
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (!chatData) return { chat: null, messages: [] };

  const participants = (chatData.chat_participants as Array<{ profile: unknown }>)
    .map(p => extractFirst(p.profile as Array<{ id: string; name: string; avatar_url: string | null }>))
    .filter((p): p is { id: string; name: string; avatar_url: string | null } => p !== null && p.id !== user.id);

  const chat: Chat = {
    id: chatData.id,
    created_at: chatData.created_at,
    updated_at: chatData.updated_at,
    product_id: chatData.product_id,
    last_message: chatData.last_message,
    last_message_at: chatData.last_message_at,
    participants,
    unread_count: 0,
  };

  const messages: Message[] = (messagesData ?? []).map(msg => ({
    id: msg.id,
    chat_id: msg.chat_id,
    sender_id: msg.sender_id,
    content: msg.content,
    created_at: msg.created_at,
    is_read: msg.is_read,
    sender: extractFirst(msg.sender as Array<{ name: string; avatar_url: string | null }>),
  }));

  return { chat, messages };
}

/**
 * Get messages for a chat
 */
export async function getMessages(
  chatId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      chat_id,
      sender_id,
      content,
      created_at,
      is_read,
      sender:profiles!sender_id(name, avatar_url)
    `)
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return (data ?? []).reverse().map(msg => ({
    id: msg.id,
    chat_id: msg.chat_id,
    sender_id: msg.sender_id,
    content: msg.content,
    created_at: msg.created_at,
    is_read: msg.is_read,
    sender: extractFirst(msg.sender as Array<{ name: string; avatar_url: string | null }>),
  }));
}

/**
 * Send a new message
 */
export async function sendMessage(
  formData: FormData
): Promise<{ success: boolean; message?: Message; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const chatId = formData.get('chat_id') as string;
  const content = formData.get('content') as string;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: user.id,
      content,
    })
    .select(`
      id,
      chat_id,
      sender_id,
      content,
      created_at,
      is_read,
      sender:profiles!sender_id(name, avatar_url)
    `)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update chat's last message
  await supabase
    .from('chats')
    .update({
      last_message: content,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', chatId);

  const message: Message = {
    id: data.id,
    chat_id: data.chat_id,
    sender_id: data.sender_id,
    content: data.content,
    created_at: data.created_at,
    is_read: data.is_read,
    sender: extractFirst(data.sender as Array<{ name: string; avatar_url: string | null }>),
  };

  return { success: true, message };
}

/**
 * Create a new chat
 */
export async function createChat(
  participantId: string,
  productId?: number
): Promise<{ success: boolean; chatId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if chat already exists between these users
  const { data: existingChat } = await supabase
    .from('chats')
    .select(`
      id,
      chat_participants!inner(profile_id)
    `)
    .eq('chat_participants.profile_id', participantId);

  // Find a chat where both users are participants
  const chatWithBoth = existingChat?.find(chat =>
    (chat.chat_participants as Array<{ profile_id: string }>).some(p => p.profile_id === user.id) &&
    (chat.chat_participants as Array<{ profile_id: string }>).some(p => p.profile_id === participantId)
  );

  if (chatWithBoth) {
    return { success: true, chatId: chatWithBoth.id };
  }

  // Create new chat
  const { data: newChat, error: chatError } = await supabase
    .from('chats')
    .insert({
      product_id: productId,
    })
    .select('id')
    .single();

  if (chatError) {
    return { success: false, error: chatError.message };
  }

  // Add participants
  const { error: participantsError } = await supabase
    .from('chat_participants')
    .insert([
      { chat_id: newChat.id, profile_id: user.id },
      { chat_id: newChat.id, profile_id: participantId },
    ]);

  if (participantsError) {
    return { success: false, error: participantsError.message };
  }

  return { success: true, chatId: newChat.id };
}

/**
 * Mark chat messages as read
 */
export async function markAsRead(chatId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', user.id)
    .eq('is_read', false);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.CHATS);
  invalidateTag(CACHE_TAGS.CHAT(chatId));
  return { success: true };
}
