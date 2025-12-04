/**
 * Zustand Stores Index
 * Centralized exports for all Zustand stores
 */

// Auth Store (authentication state)
export * from "./useAuthStore";

// UI Store (theme, language, location, accessibility)
export * from "./useUIStore";

// Chat Store (real-time messaging)
export * from "./useChatStore";

// Forum Store (forum UI state, notifications)
export * from "./useForumStore";

// Admin Store (admin UI state, modal, filters)
export * from "./useAdminStore";
