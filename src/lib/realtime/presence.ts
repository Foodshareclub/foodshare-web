/**
 * Presence Tracking
 *
 * Track online users and their activity in real-time.
 * Uses Supabase Realtime Presence for distributed state.
 *
 * @module lib/realtime/presence
 */

import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

// =============================================================================
// Types
// =============================================================================

export interface PresenceUser {
  /** User ID */
  id: string;
  /** Display name */
  name?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Current activity */
  activity?: string;
  /** Last seen timestamp */
  lastSeen: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface PresenceConfig {
  /** Room/channel name */
  room: string;
  /** Current user info */
  user: Omit<PresenceUser, "lastSeen">;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatIntervalMs?: number;
  /** Callback when presence changes */
  onSync?: (users: PresenceUser[]) => void;
  /** Callback when user joins */
  onJoin?: (user: PresenceUser) => void;
  /** Callback when user leaves */
  onLeave?: (user: PresenceUser) => void;
}

export interface PresenceHandle {
  /** Get current online users */
  getUsers: () => PresenceUser[];
  /** Update current user's presence */
  update: (data: Partial<Omit<PresenceUser, "id" | "lastSeen">>) => Promise<void>;
  /** Leave the room */
  leave: () => Promise<void>;
}

// =============================================================================
// Presence Manager
// =============================================================================

/**
 * Track presence in a room
 *
 * @example
 * ```ts
 * const presence = await trackPresence({
 *   room: 'chat:123',
 *   user: { id: 'user-1', name: 'John' },
 *   onSync: (users) => setOnlineUsers(users),
 *   onJoin: (user) => toast(`${user.name} joined`),
 *   onLeave: (user) => toast(`${user.name} left`),
 * });
 *
 * // Update activity
 * await presence.update({ activity: 'typing' });
 *
 * // Leave room
 * await presence.leave();
 * ```
 */
export async function trackPresence(config: PresenceConfig): Promise<PresenceHandle> {
  const {
    room,
    user,
    heartbeatIntervalMs = 30000,
    onSync,
    onJoin,
    onLeave,
  } = config;

  let channel: RealtimeChannel | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let currentPresence: PresenceUser = { ...user, lastSeen: Date.now() };

  // Parse presence state to user array
  const parsePresenceState = (state: RealtimePresenceState): PresenceUser[] => {
    const users: PresenceUser[] = [];

    for (const presences of Object.values(state)) {
      for (const presence of presences) {
        if (presence && typeof presence === "object") {
          users.push(presence as unknown as PresenceUser);
        }
      }
    }

    return users;
  };

  // Create channel and track presence
  channel = supabase.channel(room, {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  // Handle presence sync
  channel.on("presence", { event: "sync" }, () => {
    const state = channel?.presenceState() || {};
    const users = parsePresenceState(state);
    onSync?.(users);
  });

  // Handle user join
  channel.on("presence", { event: "join" }, ({ newPresences }) => {
    for (const presence of newPresences) {
      if (presence && typeof presence === "object") {
        onJoin?.(presence as unknown as PresenceUser);
      }
    }
  });

  // Handle user leave
  channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
    for (const presence of leftPresences) {
      if (presence && typeof presence === "object") {
        onLeave?.(presence as unknown as PresenceUser);
      }
    }
  });

  // Subscribe and track
  await channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel?.track(currentPresence);

      // Start heartbeat
      heartbeatInterval = setInterval(async () => {
        currentPresence.lastSeen = Date.now();
        await channel?.track(currentPresence);
      }, heartbeatIntervalMs);
    }
  });

  return {
    getUsers: () => {
      const state = channel?.presenceState() || {};
      return parsePresenceState(state);
    },

    update: async (data) => {
      currentPresence = {
        ...currentPresence,
        ...data,
        lastSeen: Date.now(),
      };
      await channel?.track(currentPresence);
    },

    leave: async () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      await channel?.untrack();
      supabase.removeChannel(channel!);
      channel = null;
    },
  };
}

// =============================================================================
// Typing Indicator
// =============================================================================

export interface TypingIndicatorConfig {
  /** Room/channel name */
  room: string;
  /** Current user ID */
  userId: string;
  /** Current user name */
  userName?: string;
  /** Typing timeout in ms (default: 3000) */
  typingTimeoutMs?: number;
  /** Callback when typing users change */
  onTypingChange?: (users: { id: string; name?: string }[]) => void;
}

export interface TypingIndicatorHandle {
  /** Start typing */
  startTyping: () => void;
  /** Stop typing */
  stopTyping: () => void;
  /** Get currently typing users */
  getTypingUsers: () => { id: string; name?: string }[];
  /** Cleanup */
  destroy: () => void;
}

/**
 * Typing indicator for chat rooms
 *
 * @example
 * ```ts
 * const typing = createTypingIndicator({
 *   room: 'chat:123',
 *   userId: 'user-1',
 *   userName: 'John',
 *   onTypingChange: (users) => setTypingUsers(users),
 * });
 *
 * // When user types
 * inputRef.current.addEventListener('input', () => typing.startTyping());
 *
 * // Cleanup
 * typing.destroy();
 * ```
 */
export function createTypingIndicator(
  config: TypingIndicatorConfig
): TypingIndicatorHandle {
  const {
    room,
    userId,
    userName,
    typingTimeoutMs = 3000,
    onTypingChange,
  } = config;

  const typingUsers = new Map<string, { name?: string; timeout: NodeJS.Timeout }>();
  let channel: RealtimeChannel | null = null;
  let isTyping = false;
  let typingTimeout: NodeJS.Timeout | null = null;

  // Create broadcast channel
  channel = supabase.channel(`typing:${room}`);

  channel.on("broadcast", { event: "typing" }, ({ payload }) => {
    const { userId: typingUserId, userName: typingUserName, isTyping: typing } = payload as {
      userId: string;
      userName?: string;
      isTyping: boolean;
    };

    // Ignore own typing events
    if (typingUserId === userId) return;

    if (typing) {
      // Clear existing timeout
      const existing = typingUsers.get(typingUserId);
      if (existing) {
        clearTimeout(existing.timeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        typingUsers.delete(typingUserId);
        notifyChange();
      }, typingTimeoutMs);

      typingUsers.set(typingUserId, { name: typingUserName, timeout });
    } else {
      const existing = typingUsers.get(typingUserId);
      if (existing) {
        clearTimeout(existing.timeout);
        typingUsers.delete(typingUserId);
      }
    }

    notifyChange();
  });

  channel.subscribe();

  const notifyChange = () => {
    const users = Array.from(typingUsers.entries()).map(([id, { name }]) => ({
      id,
      name,
    }));
    onTypingChange?.(users);
  };

  const broadcastTyping = (typing: boolean) => {
    channel?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, userName, isTyping: typing },
    });
  };

  return {
    startTyping: () => {
      if (!isTyping) {
        isTyping = true;
        broadcastTyping(true);
      }

      // Reset timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      typingTimeout = setTimeout(() => {
        isTyping = false;
        broadcastTyping(false);
      }, typingTimeoutMs);
    },

    stopTyping: () => {
      if (isTyping) {
        isTyping = false;
        broadcastTyping(false);
      }

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }
    },

    getTypingUsers: () => {
      return Array.from(typingUsers.entries()).map(([id, { name }]) => ({
        id,
        name,
      }));
    },

    destroy: () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      for (const { timeout } of typingUsers.values()) {
        clearTimeout(timeout);
      }
      typingUsers.clear();

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    },
  };
}
