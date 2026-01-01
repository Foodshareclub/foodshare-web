/**
 * Centralized Realtime Manager
 *
 * Single connection for all subscriptions with:
 * - Automatic reconnection with exponential backoff
 * - Subscription deduplication
 * - Connection quality monitoring
 * - Event batching
 *
 * SYNC: Mirrors Android RealtimeChannelManager patterns
 *
 * @module lib/realtime/manager
 */

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

// =============================================================================
// Types
// =============================================================================

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";
export type ConnectionStatus = "connected" | "disconnected" | "reconnecting" | "error";

export interface SubscriptionConfig<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique subscription ID */
  id?: string;
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
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface SubscriptionHandle {
  /** Unique subscription ID */
  id: string;
  /** Channel name */
  channel: string;
  /** Table being subscribed to */
  table: string;
  /** Filter applied */
  filter?: string;
  /** Unsubscribe function */
  unsubscribe: () => void;
}

export interface RealtimeManagerConfig {
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms (default: 1000) */
  initialReconnectDelayMs?: number;
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelayMs?: number;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatIntervalMs?: number;
  /** Enable event batching (default: true) */
  enableBatching?: boolean;
  /** Batch window in ms (default: 100) */
  batchWindowMs?: number;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when connection quality changes */
  onQualityChange?: (quality: ConnectionQuality) => void;
}

export interface ConnectionQuality {
  /** Latency in ms */
  latencyMs: number;
  /** Messages received in last minute */
  messagesPerMinute: number;
  /** Reconnection count */
  reconnectCount: number;
  /** Quality rating */
  rating: "excellent" | "good" | "fair" | "poor";
}

export interface RealtimeMetrics {
  /** Current connection status */
  status: ConnectionStatus;
  /** Active subscription count */
  subscriptionCount: number;
  /** Total messages received */
  totalMessages: number;
  /** Messages in last minute */
  messagesPerMinute: number;
  /** Reconnection count */
  reconnectCount: number;
  /** Average latency */
  avgLatencyMs: number;
  /** Connection uptime in ms */
  uptimeMs: number;
}

// =============================================================================
// Realtime Manager
// =============================================================================

const DEFAULT_CONFIG: Required<RealtimeManagerConfig> = {
  maxReconnectAttempts: 10,
  initialReconnectDelayMs: 1000,
  maxReconnectDelayMs: 30000,
  heartbeatIntervalMs: 30000,
  enableBatching: true,
  batchWindowMs: 100,
  onStatusChange: () => {},
  onQualityChange: () => {},
};

/**
 * Centralized Realtime Manager
 *
 * @example
 * ```ts
 * const manager = RealtimeManager.getInstance();
 *
 * const handle = manager.subscribe({
 *   table: 'messages',
 *   event: 'INSERT',
 *   filter: 'room_id=eq.123',
 *   onData: (payload) => console.log('New message:', payload.new),
 * });
 *
 * // Later...
 * handle.unsubscribe();
 * ```
 */
export class RealtimeManager {
  private static instance: RealtimeManager | null = null;

  private config: Required<RealtimeManagerConfig>;
  private client: SupabaseClient;
  private channels = new Map<string, RealtimeChannel>();
  private subscriptions = new Map<string, SubscriptionConfig[]>();
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectedAt: number | null = null;

  // Metrics
  private totalMessages = 0;
  private messageTimestamps: number[] = [];
  private latencies: number[] = [];

  // Batching
  private batchedEvents = new Map<string, RealtimePostgresChangesPayload<Record<string, unknown>>[]>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();

  private constructor(config: RealtimeManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = supabase;
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: RealtimeManagerConfig): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager(config);
    }
    return RealtimeManager.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (RealtimeManager.instance) {
      RealtimeManager.instance.destroy();
      RealtimeManager.instance = null;
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get realtime metrics
   */
  getMetrics(): RealtimeMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.messageTimestamps = this.messageTimestamps.filter((t) => t > oneMinuteAgo);

    // Calculate average latency
    const avgLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

    return {
      status: this.status,
      subscriptionCount: this.getTotalSubscriptionCount(),
      totalMessages: this.totalMessages,
      messagesPerMinute: this.messageTimestamps.length,
      reconnectCount: this.reconnectAttempts,
      avgLatencyMs: Math.round(avgLatency),
      uptimeMs: this.connectedAt ? now - this.connectedAt : 0,
    };
  }

  /**
   * Get connection quality
   */
  getConnectionQuality(): ConnectionQuality {
    const metrics = this.getMetrics();

    let rating: ConnectionQuality["rating"];
    if (metrics.avgLatencyMs < 100 && metrics.reconnectCount === 0) {
      rating = "excellent";
    } else if (metrics.avgLatencyMs < 300 && metrics.reconnectCount < 3) {
      rating = "good";
    } else if (metrics.avgLatencyMs < 1000 && metrics.reconnectCount < 5) {
      rating = "fair";
    } else {
      rating = "poor";
    }

    return {
      latencyMs: metrics.avgLatencyMs,
      messagesPerMinute: metrics.messagesPerMinute,
      reconnectCount: metrics.reconnectCount,
      rating,
    };
  }

  /**
   * Subscribe to a table
   */
  subscribe<T extends Record<string, unknown>>(
    config: SubscriptionConfig<T>
  ): SubscriptionHandle {
    const { table, schema = "public", event, filter } = config;
    const subscriptionId = config.id || crypto.randomUUID();
    const channelName = this.getChannelName(table, schema, filter);

    // Get or create channel
    let channel = this.channels.get(channelName);
    if (!channel) {
      channel = this.createChannel(channelName, table, schema, event, filter);
      this.channels.set(channelName, channel);
    }

    // Add subscription to channel
    const subs = this.subscriptions.get(channelName) || [];
    subs.push(config as SubscriptionConfig);
    this.subscriptions.set(channelName, subs);

    return {
      id: subscriptionId,
      channel: channelName,
      table,
      filter,
      unsubscribe: () => this.unsubscribe(channelName, subscriptionId),
    };
  }

  /**
   * Unsubscribe from a channel
   */
  private unsubscribe(channelName: string, subscriptionId: string): void {
    const subs = this.subscriptions.get(channelName);
    if (!subs) return;

    // Remove subscription
    const filtered = subs.filter((s) => s.id !== subscriptionId);
    this.subscriptions.set(channelName, filtered);

    // If no more subscriptions, remove channel
    if (filtered.length === 0) {
      const channel = this.channels.get(channelName);
      if (channel) {
        this.client.removeChannel(channel);
        this.channels.delete(channelName);
        this.subscriptions.delete(channelName);
      }
    }
  }

  /**
   * Create a new channel
   */
  private createChannel(
    channelName: string,
    table: string,
    schema: string,
    event: RealtimeEvent,
    filter?: string
  ): RealtimeChannel {
    const channel = this.client
      .channel(channelName)
      .on(
        "postgres_changes" as const,
        {
          event: event as "INSERT",
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload) => this.handlePayload(channelName, payload)
      )
      .subscribe((status) => this.handleChannelStatus(channelName, status));

    return channel;
  }

  /**
   * Handle incoming payload
   */
  private handlePayload(
    channelName: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    this.totalMessages++;
    this.messageTimestamps.push(Date.now());

    // Record latency if commit timestamp available
    if (payload.commit_timestamp) {
      const commitTime = new Date(payload.commit_timestamp).getTime();
      const latency = Date.now() - commitTime;
      this.latencies.push(latency);
      // Keep only last 100 latencies
      if (this.latencies.length > 100) {
        this.latencies.shift();
      }
    }

    if (this.config.enableBatching) {
      this.batchPayload(channelName, payload);
    } else {
      this.deliverPayload(channelName, payload);
    }
  }

  /**
   * Batch payloads to prevent UI thrashing
   */
  private batchPayload(
    channelName: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    const batch = this.batchedEvents.get(channelName) || [];
    batch.push(payload);
    this.batchedEvents.set(channelName, batch);

    // Clear existing timeout
    const existingTimeout = this.batchTimeouts.get(channelName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to flush batch
    const timeout = setTimeout(() => {
      this.flushBatch(channelName);
    }, this.config.batchWindowMs);

    this.batchTimeouts.set(channelName, timeout);
  }

  /**
   * Flush batched events
   */
  private flushBatch(channelName: string): void {
    const batch = this.batchedEvents.get(channelName);
    if (!batch || batch.length === 0) return;

    // Deliver each payload
    for (const payload of batch) {
      this.deliverPayload(channelName, payload);
    }

    // Clear batch
    this.batchedEvents.set(channelName, []);
    this.batchTimeouts.delete(channelName);
  }

  /**
   * Deliver payload to subscribers
   */
  private deliverPayload(
    channelName: string,
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>
  ): void {
    const subs = this.subscriptions.get(channelName);
    if (!subs) return;

    for (const sub of subs) {
      try {
        sub.onData(payload);
      } catch (error) {
        console.error("[RealtimeManager] Subscriber error:", error);
        sub.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Handle channel status changes
   */
  private handleChannelStatus(
    channelName: string,
    status: "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED"
  ): void {
    switch (status) {
      case "SUBSCRIBED":
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.connectedAt = Date.now();
        this.startHeartbeat();
        break;

      case "CHANNEL_ERROR":
      case "TIMED_OUT":
        this.setStatus("reconnecting");
        this.scheduleReconnect(channelName);
        break;

      case "CLOSED":
        this.setStatus("disconnected");
        this.stopHeartbeat();
        break;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(channelName: string): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus("error");
      console.error("[RealtimeManager] Max reconnection attempts reached");
      return;
    }

    const delay = Math.min(
      this.config.initialReconnectDelayMs * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelayMs
    );

    this.reconnectAttempts++;

    console.log(
      `[RealtimeManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnect(channelName);
    }, delay);
  }

  /**
   * Reconnect a channel
   */
  private reconnect(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (!channel) return;

    // Remove and recreate channel
    this.client.removeChannel(channel);

    const subs = this.subscriptions.get(channelName);
    if (!subs || subs.length === 0) return;

    const firstSub = subs[0];
    const newChannel = this.createChannel(
      channelName,
      firstSub.table,
      firstSub.schema || "public",
      firstSub.event,
      firstSub.filter
    );

    this.channels.set(channelName, newChannel);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      const quality = this.getConnectionQuality();
      this.config.onQualityChange(quality);
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set connection status
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.config.onStatusChange(status);
    }
  }

  /**
   * Get channel name
   */
  private getChannelName(table: string, schema: string, filter?: string): string {
    return filter ? `${schema}:${table}:${filter}` : `${schema}:${table}`;
  }

  /**
   * Get total subscription count
   */
  private getTotalSubscriptionCount(): number {
    let count = 0;
    for (const subs of this.subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  /**
   * Disconnect all channels
   */
  disconnect(): void {
    for (const channel of this.channels.values()) {
      this.client.removeChannel(channel);
    }
    this.channels.clear();
    this.subscriptions.clear();
    this.setStatus("disconnected");
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    this.disconnect();

    // Clear batching
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.batchTimeouts.clear();
    this.batchedEvents.clear();
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the realtime manager instance
 */
export function getRealtimeManager(config?: RealtimeManagerConfig): RealtimeManager {
  return RealtimeManager.getInstance(config);
}

/**
 * Subscribe to realtime changes
 */
export function subscribeToChanges<T extends Record<string, unknown>>(
  config: SubscriptionConfig<T>
): SubscriptionHandle {
  return getRealtimeManager().subscribe(config);
}

/**
 * Get realtime metrics
 */
export function getRealtimeMetrics(): RealtimeMetrics {
  return getRealtimeManager().getMetrics();
}

// Expose in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).realtimeMetrics = getRealtimeMetrics;
}
