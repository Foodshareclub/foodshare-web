"use client";

/**
 * Email CRM Realtime Hook
 *
 * Replaces polling-based refetchInterval with Supabase Realtime subscriptions.
 * Automatically invalidates React Query cache when email data changes.
 *
 * Benefits:
 * - Immediate updates when quotas change
 * - Live email send progress
 * - Reduced network overhead (1 WebSocket vs 7 HTTP polls)
 * - Better admin experience
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ConnectionStatus } from "../useRealtimeSubscription";
import { emailCRMKeys } from "./useEmailCRM";
import { createClient } from "@/lib/supabase/client";

interface UseEmailCRMRealtimeOptions {
  /** Whether realtime is enabled (default: true) */
  enabled?: boolean;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
}

interface UseEmailCRMRealtimeReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Manually reconnect */
  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

/**
 * Tables that trigger cache invalidation:
 * - email_quotas_usage: Quota changes
 * - newsletter_campaigns: Campaign status changes
 * - newsletter_subscribers: Subscriber changes
 * - email_preferences: User preferences changes
 * - email_suppression_list: Bounces/unsubscribes
 * - email_automation_enrollments: Automation progress
 */
const EMAIL_TABLES = [
  { table: "email_quotas_usage", keys: [emailCRMKeys.quotas(), emailCRMKeys.stats()] },
  { table: "newsletter_campaigns", keys: [emailCRMKeys.campaigns(), emailCRMKeys.stats()] },
  { table: "newsletter_subscribers", keys: [emailCRMKeys.segments(), emailCRMKeys.stats()] },
  { table: "email_preferences", keys: [emailCRMKeys.segments(), emailCRMKeys.stats()] },
  { table: "email_suppression_list", keys: [emailCRMKeys.bounces(), emailCRMKeys.stats()] },
  { table: "email_automation_enrollments", keys: [emailCRMKeys.automations()] },
  { table: "email_provider_health", keys: [emailCRMKeys.health()] },
] as const;

/**
 * Hook to subscribe to Email CRM realtime updates.
 * Automatically invalidates relevant React Query caches when data changes.
 *
 * Use alongside the existing useEmailCRM hooks - this replaces refetchInterval
 * with push-based updates for immediate feedback.
 */
export function useEmailCRMRealtime({
  enabled = true,
  onStatusChange,
}: UseEmailCRMRealtimeOptions = {}): UseEmailCRMRealtimeReturn {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const subscribeRef = useRef<() => void>(undefined);

  // Track status changes
  const updateStatus = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  // Cleanup channel
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

  // Invalidate cache for changed table
  const handleTableChange = useCallback(
    (tableName: string) => {
      const tableConfig = EMAIL_TABLES.find((t) => t.table === tableName);
      if (tableConfig) {
        for (const key of tableConfig.keys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    },
    [queryClient]
  );

  // Subscribe to all email tables
  const subscribe = useCallback(() => {
    if (!enabled) return;

    cleanup();

    const supabase = createClient();
    let channel = supabase.channel("email-crm-realtime");

    // Add subscription for each email table
    for (const { table } of EMAIL_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        (payload) => {
          // Invalidate relevant queries when data changes
          handleTableChange(payload.table);
        }
      );
    }

    // Subscribe with reconnection handling
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
  }, [enabled, handleTableChange, updateStatus, cleanup]);

  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  // Manual reconnect
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

/**
 * Connection status indicator component helper
 */
export function getConnectionStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "reconnecting":
      return "bg-yellow-500 animate-pulse";
    case "disconnected":
      return "bg-red-500";
  }
}

export function getConnectionStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Live";
    case "reconnecting":
      return "Reconnecting...";
    case "disconnected":
      return "Disconnected";
  }
}
