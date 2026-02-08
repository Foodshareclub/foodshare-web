"use client";

/**
 * Shared Realtime Subscription Hook
 *
 * Provides a consistent pattern for Supabase Realtime subscriptions with:
 * - Connection status tracking
 * - Exponential backoff reconnection
 * - Proper cleanup
 * - Type-safe payloads
 *
 * Based on patterns from useUnifiedChat.ts and RealtimeComments.tsx
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

export interface RealtimeSubscriptionConfig<T extends Record<string, unknown>> {
  /** Channel name (unique identifier) */
  channel: string;
  /** Table to subscribe to */
  table: string;
  /** Database schema (default: 'public') */
  schema?: string;
  /** Event type to listen for */
  event: RealtimeEvent;
  /** Optional filter (e.g., 'id=eq.123') */
  filter?: string;
  /** Callback when data changes */
  onData: (payload: RealtimePostgresChangesPayload<T>) => void;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Whether subscription is enabled (default: true) */
  enabled?: boolean;
}

interface UseRealtimeSubscriptionReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Manually reconnect */
  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

/**
 * Hook for managing a single Supabase Realtime subscription
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>({
  channel: channelName,
  table,
  schema = "public",
  event,
  filter,
  onData,
  onStatusChange,
  enabled = true,
}: RealtimeSubscriptionConfig<T>): UseRealtimeSubscriptionReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribeRef = useRef<() => void>(undefined);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // Update status and notify callback
  const updateStatus = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  // Clean up channel
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Subscribe to channel
  const subscribe = useCallback(() => {
    if (!enabled) return;

    cleanup();

    const supabase = createClient();

    // Type assertion needed because event is a union type variable
    // Runtime behavior matches the working patterns in RealtimeComments.tsx
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as const,
        {
          event: event as "INSERT",
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          onData(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          updateStatus("connected");
          reconnectAttempts.current = 0;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          updateStatus("reconnecting");

          // Exponential backoff reconnection
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts.current), MAX_DELAY);
            reconnectAttempts.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
              cleanup();
              subscribeRef.current?.();
            }, delay);
          } else {
            updateStatus("disconnected");
          }
        } else if (status === "CLOSED") {
          updateStatus("disconnected");
        }
      });

    channelRef.current = channel;
  }, [enabled, channelName, table, schema, event, filter, onData, updateStatus, cleanup]);

  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  // Reconnect manually
  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    subscribe();
  }, [subscribe]);

  // Set up subscription
  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);

  return {
    connectionStatus,
    reconnect,
  };
}

// ============================================================================
// Multi-Table Subscription Hook
// ============================================================================

export interface MultiTableSubscription<T extends Record<string, unknown>> {
  table: string;
  event: RealtimeEvent;
  filter?: string;
  onData: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export interface MultiRealtimeSubscriptionConfig<T extends Record<string, unknown>> {
  /** Channel name (unique identifier) */
  channel: string;
  /** Schema (default: 'public') */
  schema?: string;
  /** Array of table subscriptions */
  subscriptions: MultiTableSubscription<T>[];
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Whether subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for managing multiple table subscriptions on a single channel
 * More efficient than multiple useRealtimeSubscription calls
 */
export function useMultiRealtimeSubscription<T extends Record<string, unknown>>({
  channel: channelName,
  schema = "public",
  subscriptions,
  onStatusChange,
  enabled = true,
}: MultiRealtimeSubscriptionConfig<T>): UseRealtimeSubscriptionReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const multiSubscribeRef = useRef<() => void>(undefined);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  const updateStatus = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const subscribe = useCallback(() => {
    if (!enabled || subscriptions.length === 0) return;

    cleanup();

    const supabase = createClient();
    let channel = supabase.channel(channelName);

    // Add all subscriptions to the channel
    // Type assertion needed because event is a union type variable
    for (const sub of subscriptions) {
      channel = channel.on(
        "postgres_changes" as const,
        {
          event: sub.event as "INSERT",
          schema,
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        },
        (payload) => {
          sub.onData(payload as RealtimePostgresChangesPayload<T>);
        }
      );
    }

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        updateStatus("connected");
        reconnectAttempts.current = 0;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        updateStatus("reconnecting");

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts.current), MAX_DELAY);
          reconnectAttempts.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            cleanup();
            multiSubscribeRef.current?.();
          }, delay);
        } else {
          updateStatus("disconnected");
        }
      } else if (status === "CLOSED") {
        updateStatus("disconnected");
      }
    });

    channelRef.current = channel;
  }, [enabled, channelName, schema, subscriptions, updateStatus, cleanup]);

  useEffect(() => {
    multiSubscribeRef.current = subscribe;
  }, [subscribe]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    subscribe();
  }, [subscribe]);

  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);

  return {
    connectionStatus,
    reconnect,
  };
}
