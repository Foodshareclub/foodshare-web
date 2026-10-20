/**
 * API Layer Index
 * Central export point for all API modules
 * Following clean architecture principles
 *
 * Note: Auth has been moved to @/lib/auth for better organization
 */

// Authentication - Use @/lib/auth instead
// Backward compatibility re-export
export { auth, type AuthPayload, type ProviderType } from "@/lib/auth";

// Storage
export * from "./storageAPI";

// Chat
export * from "./chatAPI";

// Admin - Use server actions from @/app/actions/admin.ts and @/app/actions/admin-listings.ts
// Client-side admin API removed in favor of server-first architecture

// Theme
export * from "./themeAPI";

// Forum
export * from "./forumAPI";
