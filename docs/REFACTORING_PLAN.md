# FoodShare Codebase Refactoring Plan

## Executive Summary

After analyzing the codebase, it's already well-architected following Next.js 16 best practices. This document outlines targeted optimizations to further improve performance, maintainability, and developer experience.

## Current State Assessment

### ✅ Already Well-Implemented

- Server-first architecture with proper Server/Client component separation
- Centralized cache management (`cache-keys.ts`)
- Proper Supabase client separation (server vs client)
- Zustand for UI-only state (no Redux)
- Standardized error handling (`lib/errors.ts`)
- TypeScript strict mode
- Proper i18n setup with next-intl
- Dynamic imports for Leaflet/maps (already using `ssr: false`)

## Completed Optimizations ✅

### 1. Server Actions (`src/app/actions/products.ts`)

- ✅ Added conditional `devLog()` helper - only logs in development
- ✅ Created `invalidateProductCaches()` for batch cache invalidation
- ✅ Refactored `createProduct()`, `updateProduct()`, `deleteProduct()` with cleaner code
- ✅ Fire-and-forget analytics (non-blocking)

### 2. Storage Actions (`src/app/actions/storage.ts`)

- ✅ Added conditional `devLog()` and `devWarn()` helpers
- ✅ Replaced all verbose console.log with conditional logging
- ✅ Kept console.error for actual errors (important for debugging)

### 3. Home Page (`src/app/page.tsx`)

- ✅ Extracted `generateJsonLdScripts()` helper function
- ✅ Extracted `fetchHomeData()` async function (fixes lint error)
- ✅ Simplified main `Home` component

### 4. Providers (`src/app/providers.tsx`)

- ✅ Added singleton pattern for QueryClient
- ✅ Fixed lint error: replaced `useState` + `useEffect` with `useSyncExternalStore` for client detection
- ✅ Batched state updates in async IIFE to avoid cascading renders

## Remaining Optimizations (Future)

### Low Priority - Already Good

- Dynamic imports: Leaflet already uses `dynamic()` with `ssr: false`
- Recharts in admin dashboard: Admin routes are lazy-loaded by Next.js

### Consider for Future

- Generate TypeScript types from Supabase schema
- Add more granular Suspense boundaries for streaming
- Review other server actions for logging optimization

## Verification

All changes pass:

- ✅ TypeScript type-check (`npm run type-check`)
- ✅ ESLint (`npm run lint`) - no new errors
- ✅ IDE diagnostics - no issues in modified files
