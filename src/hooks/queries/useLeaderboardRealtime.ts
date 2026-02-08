"use client";

/**
 * Leaderboard Realtime Hook
 *
 * Provides live updates to the challenge leaderboard.
 * Invalidates React Query cache when users complete challenges.
 *
 * Benefits:
 * - Live competition updates
 * - Immediate rank feedback
 * - Better engagement
 */

import { useEffect, useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ConnectionStatus } from "../useRealtimeSubscription";
import { leaderboardKeys } from "./useChallengeLeaderboard";
import { createClient } from "@/lib/supabase/client";

interface UseLeaderboardRealtimeOptions {
  /** Whether realtime is enabled (default: true) */
  enabled?: boolean;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when leaderboard updates (for confetti/animations) */
  onLeaderboardUpdate?: () => void;
}

interface UseLeaderboardRealtimeReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Manually reconnect */
  reconnect: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

/**
 * Hook to subscribe to leaderboard realtime updates.
 * Invalidates React Query cache when users complete challenges.
 */
export function useLeaderboardRealtime({
  enabled = true,
  onStatusChange,
  onLeaderboardUpdate,
}: UseLeaderboardRealtimeOptions = {}): UseLeaderboardRealtimeReturn {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const subscribeRef = useRef<() => void>(undefined);

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

  const handleLeaderboardChange = useCallback(() => {
    // Invalidate all leaderboard queries
    queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
    // Notify for animations (e.g., confetti when someone completes)
    onLeaderboardUpdate?.();
  }, [queryClient, onLeaderboardUpdate]);

  const subscribe = useCallback(() => {
    if (!enabled) return;

    cleanup();

    const supabase = createClient();

    // Subscribe to challenge_participants for completion updates
    // This is the main table that determines leaderboard rankings
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes" as const,
        {
          event: "UPDATE" as "INSERT",
          schema: "public",
          table: "challenge_participants",
        },
        (payload) => {
          // Only refresh if a challenge was completed
          const newRecord = payload.new as { is_completed?: boolean };
          const oldRecord = payload.old as { is_completed?: boolean };

          if (newRecord.is_completed && !oldRecord.is_completed) {
            handleLeaderboardChange();
          }
        }
      )
      .on(
        "postgres_changes" as const,
        {
          event: "INSERT" as const,
          schema: "public",
          table: "challenge_activities",
        },
        (payload) => {
          // Refresh when a completion activity is logged
          const newRecord = payload.new as { user_completed_challenge?: string };
          if (newRecord.user_completed_challenge) {
            handleLeaderboardChange();
          }
        }
      )
      .subscribe((status) => {
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
  }, [enabled, handleLeaderboardChange, updateStatus, cleanup]);

  useEffect(() => {
    subscribeRef.current = subscribe;
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
