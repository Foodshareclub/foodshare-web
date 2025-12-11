/**
 * Query Hooks Index
 * Centralized exports for all TanStack Query hooks
 */

// Auth
export * from "./useAuthQueries";

// Profile
export * from "./useProfileQueries";

// Products
export * from "./useProductQueries";

// Chat
export * from "./useChatQueries";

// Forum
export * from "./useForumQueries";

// Admin - Removed: Use server actions from @/app/actions/admin.ts instead
// TanStack Query for admin data violates server-first architecture
