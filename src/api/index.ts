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

// Profile & User
export * from "./profileAPI";

// Storage
export * from "./storageAPI";

// Products
export * from "./productAPI";

// Chat
export * from "./chatAPI";

// Admin
export * from "./adminAPI";

// Theme
export * from "./themeAPI";

// Forum
export * from "./forumAPI";
