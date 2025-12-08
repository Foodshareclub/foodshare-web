'use client';

/**
 * Unified Chat Hook
 * Real-time subscriptions for food sharing chat system
 * Includes typing indicators, presence, and read receipts
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useChatStore } from '@/store/zustand/useChatStore';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RoomParticipantsType } from '@/api/chatAPI';

type TypingUser = {
  id: string;
  name: string;
  avatarUrl?: string;
};

type PresenceUser = {
  id: string;
  name: string;
  avatarUrl?: string;
  online_at: string;
};

type UseUnifiedChatOptions = {
  userId: string | null;
  userName?: string;
  userAvatar?: string;
  roomId?: string; // Food sharing room ID
  onNewFoodMessage?: (message: RoomParticipantsType) => void;
  onTypingChange?: (users: TypingUser[]) => void;
  onPresenceChange?: (users: PresenceUser[]) => void;
  onMessageRead?: (messageId: string, readBy: string) => void;
};

/**
 * Hook for real-time chat subscriptions
 * Handles food sharing rooms with typing indicators and presence
 */
export function useUnifiedChat({
  userId,
  userName = '',
  userAvatar = '',
  roomId,
  onNewFoodMessage,
  onTypingChange,
  onPresenceChange,
  onMessageRead,
}: UseUnifiedChatOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const { addMessage, setNewMessage, updateRoomInList } = useChatStore();

  // Subscribe to food sharing room messages
  useEffect(() => {
    if (!userId || !roomId) return;

    const supabase = createClient();
    
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as RoomParticipantsType;
          
          // Only process messages from other users
          if (newMessage.profile_id !== userId) {
            addMessage(newMessage);
            setNewMessage(newMessage);
            onNewFoodMessage?.(newMessage);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, roomId, addMessage, setNewMessage, onNewFoodMessage]);

  // Subscribe to presence and typing indicators
  useEffect(() => {
    if (!userId || !roomId) return;

    const supabase = createClient();
    
    // Clean up existing channel
    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
    }

    const channel = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ id: string; name: string; avatarUrl?: string; online_at: string }>();
      const users: PresenceUser[] = [];
      
      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (presence.id !== userId) {
            users.push(presence);
          }
        });
      });
      
      setOnlineUsers(users);
      onPresenceChange?.(users);
    });

    // Handle typing broadcasts
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== userId) {
        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.id === payload.userId);
          if (payload.isTyping && !exists) {
            return [...prev, { id: payload.userId, name: payload.userName, avatarUrl: payload.avatarUrl }];
          } else if (!payload.isTyping) {
            return prev.filter((u) => u.id !== payload.userId);
          }
          return prev;
        });
        onTypingChange?.(typingUsers);
      }
    });

    // Handle read receipts
    channel.on('broadcast', { event: 'read' }, ({ payload }) => {
      if (payload.userId !== userId) {
        onMessageRead?.(payload.messageId, payload.userId);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: userId,
          name: userName,
          avatarUrl: userAvatar,
          online_at: new Date().toISOString(),
        });
      }
    });

    presenceChannelRef.current = channel;

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [userId, userName, userAvatar, roomId, onPresenceChange, onTypingChange, onMessageRead, typingUsers]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((typing: boolean) => {
    if (!presenceChannelRef.current || !userId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing status
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId,
        userName,
        avatarUrl: userAvatar,
        isTyping: typing,
      },
    });

    setIsTyping(typing);

    // Auto-stop typing after 3 seconds
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 3000);
    }
  }, [userId, userName, userAvatar]);

  // Send read receipt
  const sendReadReceipt = useCallback((messageId: string) => {
    if (!presenceChannelRef.current || !userId) return;

    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'read',
      payload: {
        userId,
        messageId,
        readAt: new Date().toISOString(),
      },
    });
  }, [userId]);

  // Subscribe to all rooms for unread indicators
  const subscribeToAllRooms = useCallback(() => {
    if (!userId) return null;

    const supabase = createClient();
    
    const channel = supabase
      .channel('all-rooms')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
        },
        (payload) => {
          const updatedRoom = payload.new as {
            id: string;
            last_message: string;
            last_message_time: string;
            last_message_sent_by: string;
            last_message_seen_by: string;
          };
          
          // Update room in store
          updateRoomInList(updatedRoom.id, {
            last_message: updatedRoom.last_message,
            last_message_time: updatedRoom.last_message_time,
            last_message_sent_by: updatedRoom.last_message_sent_by,
            last_message_seen_by: updatedRoom.last_message_seen_by,
          });
        }
      )
      .subscribe();

    return channel;
  }, [userId, updateRoomInList]);

  return {
    subscribeToAllRooms,
    typingUsers,
    onlineUsers,
    isTyping,
    sendTypingIndicator,
    sendReadReceipt,
  };
}

/**
 * Hook for global unread message count
 * Subscribes to changes in rooms
 */
export function useUnreadCount(userId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    
    // Subscribe to room updates for unread count
    const channel = supabase
      .channel('unread-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        () => {
          // Trigger a re-fetch of unread count
          // This will be handled by the component using this hook
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return { unreadCount, setUnreadCount };
}

/**
 * Hook for user online status
 */
export function useOnlineStatus(userId: string | null) {
  const [isOnline, setIsOnline] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    
    const channel = supabase.channel('online-status', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    // Handle visibility change
    const handleVisibilityChange = () => {
      setIsOnline(!document.hidden);
      if (!document.hidden && channelRef.current) {
        channelRef.current.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return isOnline;
}
