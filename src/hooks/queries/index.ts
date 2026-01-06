/**
 * Query Hooks Index
 * Centralized exports for active TanStack Query hooks
 *
 * Note: Most data fetching uses Server Components + Server Actions.
 * These hooks are only for cases requiring client-side state:
 * - Real-time updates (challenges, map viewport)
 * - Complex client interactions
 */

// Challenges - deck swiping, leaderboard
export * from "./useChallenges";
export * from "./useChallengeLeaderboard";
export * from "./useActiveChallenges";

// Map - viewport-based location loading
export * from "./useViewportLocations";

// Admin - email CRM dashboard
export * from "./useEmailCRM";

// Products - infinite scroll, pagination
export * from "./useProducts";
