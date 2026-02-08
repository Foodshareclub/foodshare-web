"use client";

/**
 * Product Realtime Hook
 *
 * Provides live updates for product listings.
 * Notifies when new products are added or existing ones change status.
 *
 * Benefits:
 * - New listings appear on map immediately
 * - Status changes (claimed, completed) update in real-time
 * - Better user experience without page refresh
 */

import { useEffect, useCallback, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ConnectionStatus } from "./useRealtimeSubscription";
import { createClient } from "@/lib/supabase/client";

// Product record from realtime payload
interface ProductRecord {
  id: number;
  post_type?: string;
  is_active?: boolean;
  status?: string;
  [key: string]: unknown;
}

// Lightweight product update payload (not full product data)
export interface ProductUpdate {
  id: number;
  type: "INSERT" | "UPDATE" | "DELETE";
  post_type?: string;
  is_active?: boolean;
  status?: string;
}

interface UseProductRealtimeOptions {
  /** Whether realtime is enabled (default: true) */
  enabled?: boolean;
  /** Filter by post_type (optional) */
  postType?: string;
  /** Callback when a product is added/updated/deleted */
  onProductChange?: (update: ProductUpdate) => void;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
}

interface UseProductRealtimeReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Recent product updates (last 10) */
  recentUpdates: ProductUpdate[];
  /** Manually reconnect */
  reconnect: () => void;
  /** Clear recent updates */
  clearUpdates: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const MAX_RECENT_UPDATES = 10;

/**
 * Hook to subscribe to product listing updates in real-time.
 * Use this on map/list views for live updates.
 */
export function useProductRealtime({
  enabled = true,
  postType,
  onProductChange,
  onStatusChange,
}: UseProductRealtimeOptions = {}): UseProductRealtimeReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribeRef = useRef<() => void>(undefined);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [recentUpdates, setRecentUpdates] = useState<ProductUpdate[]>([]);

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

  const handleChange = useCallback(
    (
      type: "INSERT" | "UPDATE" | "DELETE",
      payload: { new: Record<string, unknown>; old: Record<string, unknown> }
    ) => {
      const record = (type === "DELETE" ? payload.old : payload.new) as ProductRecord | undefined;
      if (!record?.id) return;

      // Filter by post_type if specified
      if (postType && record.post_type !== postType) return;

      const update: ProductUpdate = {
        id: record.id,
        type,
        post_type: record.post_type,
        is_active: record.is_active,
        status: record.status,
      };

      // Add to recent updates (keep last N)
      setRecentUpdates((prev) => {
        const filtered = prev.filter((u) => u.id !== update.id);
        return [update, ...filtered].slice(0, MAX_RECENT_UPDATES);
      });

      // Notify callback
      onProductChange?.(update);
    },
    [postType, onProductChange]
  );

  const subscribe = useCallback(() => {
    if (!enabled) return;

    cleanup();

    const supabase = createClient();
    const channelName = postType ? `products-${postType}` : "products-all";

    // Build filter if post_type is specified
    const filter = postType ? `post_type=eq.${postType}` : undefined;

    let channel = supabase.channel(channelName);

    // Subscribe to INSERT events
    channel = channel.on(
      "postgres_changes" as const,
      {
        event: "INSERT" as const,
        schema: "public",
        table: "posts",
        ...(filter ? { filter } : {}),
      },
      (payload) =>
        handleChange(
          "INSERT",
          payload as { new: Record<string, unknown>; old: Record<string, unknown> }
        )
    );

    // Subscribe to UPDATE events
    channel = channel.on(
      "postgres_changes" as const,
      {
        event: "UPDATE" as "INSERT",
        schema: "public",
        table: "posts",
        ...(filter ? { filter } : {}),
      },
      (payload) =>
        handleChange(
          "UPDATE",
          payload as { new: Record<string, unknown>; old: Record<string, unknown> }
        )
    );

    // Subscribe to DELETE events
    channel = channel.on(
      "postgres_changes" as const,
      {
        event: "DELETE" as "INSERT",
        schema: "public",
        table: "posts",
        ...(filter ? { filter } : {}),
      },
      (payload) =>
        handleChange(
          "DELETE",
          payload as { new: Record<string, unknown>; old: Record<string, unknown> }
        )
    );

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
  }, [enabled, postType, handleChange, updateStatus, cleanup]);

  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    subscribe();
  }, [subscribe]);

  const clearUpdates = useCallback(() => {
    setRecentUpdates([]);
  }, []);

  useEffect(() => {
    subscribe();
    return cleanup;
  }, [subscribe, cleanup]);

  return {
    connectionStatus,
    recentUpdates,
    reconnect,
    clearUpdates,
  };
}

/**
 * Lightweight hook for just detecting new products.
 * Shows a "New listings available" banner without fetching data.
 */
export function useNewProductsIndicator(postType?: string) {
  const [newCount, setNewCount] = useState(0);

  const { connectionStatus } = useProductRealtime({
    postType,
    onProductChange: (update) => {
      if (update.type === "INSERT" && update.is_active) {
        setNewCount((prev) => prev + 1);
      }
    },
  });

  const clearNewCount = useCallback(() => {
    setNewCount(0);
  }, []);

  return {
    newCount,
    hasNew: newCount > 0,
    connectionStatus,
    clearNewCount,
  };
}
