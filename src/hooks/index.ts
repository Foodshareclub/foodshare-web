/**
 * Hooks Barrel Export
 * 
 * MIGRATION NOTE: TanStack Query has been removed.
 * - For data fetching: Use Server Components with lib/data/* functions
 * - For mutations: Use Server Actions from @/app/actions/*
 * - For auth: Use useAuth hook (client) or getAuthSession (server)
 * - For realtime: Use Supabase client subscriptions
 */

// Main auth hook (uses Server Actions + Supabase client for realtime)
export { useAuth } from './useAuth';

// Theme hook
export * from './useTheme';

// Utility hooks
export * from './useDebounce';
export * from './useMediaQuery';
export * from './usePosition';
export * from './useCustomBoolean';
export * from './useEvent';
export * from './useLatest';
export * from './useGridSize';
export * from './useScrollCompact';
export * from './useAdvancedScroll';
export * from './useHighRefreshRate';
export * from './useRAFThrottle';
export * from './useDistanceWorker';
export * from './useProductDistanceCalculation';
export * from './useSearchSuggestions';
export * from './getAllCountries';
export * from './useMarkerIcon';

// Unified Chat hooks (for realtime subscriptions)
export * from './useUnifiedChat';

// Image blob URL management (memory-safe blob URL handling)
export * from './useImageBlobUrl';
