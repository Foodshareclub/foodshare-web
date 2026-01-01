/**
 * Realtime Module
 *
 * Centralized realtime functionality for Supabase subscriptions.
 *
 * @module lib/realtime
 */

// Manager
export {
  RealtimeManager,
  getRealtimeManager,
  subscribeToChanges,
  getRealtimeMetrics,
} from "./manager";
export type {
  RealtimeEvent,
  ConnectionStatus,
  SubscriptionConfig,
  SubscriptionHandle,
  RealtimeManagerConfig,
  ConnectionQuality,
  RealtimeMetrics,
} from "./manager";

// Presence
export {
  trackPresence,
  createTypingIndicator,
} from "./presence";
export type {
  PresenceUser,
  PresenceConfig,
  PresenceHandle,
  TypingIndicatorConfig,
  TypingIndicatorHandle,
} from "./presence";
