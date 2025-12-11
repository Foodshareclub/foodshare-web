# Refactoring & Improvement Tasks

This document outlines identified areas for improvement and refactoring in the FoodShare codebase, organized by priority and category.

## High Priority

### 0. Role System Migration (COMPLETED)

The role system has been consolidated to use `user_roles` junction table as the single source of truth.

**Changes Made:**

- ✅ Removed `role` field from `Profile` interface in `src/lib/data/profiles.ts`
- ✅ `checkIsAdmin()` in `src/lib/data/auth.ts` now queries `user_roles` table exclusively
- ✅ Removed `jsonbRoles` from return type (backward compatibility no longer needed)
- ✅ Updated documentation to remove references to deprecated JSONB `profiles.role` field:
  - `docs/03-features/authentication/README.md` - Updated admin checking docs
  - `docs/02-development/ARCHITECTURE.md` - Updated admin role checking description
  - `docs/05-reference/API_REFERENCE.md` - Removed role from AuthUser interface
  - `docs/02-development/DATABASE_SCHEMA.md` - Clarified user_roles as source of truth
- ✅ **Database functions migrated** (migration: `migrate_role_functions_to_user_roles`):
  - `is_admin()` - Now uses `user_roles` table
  - `is_admin_jsonb()` - Now uses `user_roles` table
  - `has_role(uuid, text)` - Now uses `user_roles` table
  - `get_secret_audited()` - Now uses `user_roles` table
  - `reset_circuit_breaker()` - Now uses `user_roles` table
  - `requires_mfa()` - Now uses `user_roles` table
  - `notify_new_user()` - Removed reference to non-existent `user_role` column
  - `notify_new_feedback()` - Fixed to use `user_roles` table instead of deprecated `is_admin` column (migration: `fix_notify_new_feedback_use_user_roles`)

**Migration Pattern:**

```typescript
// ❌ Old pattern (deprecated)
const isAdmin = profile?.role?.admin === true;

// ✅ New pattern - use checkIsAdmin()
import { checkIsAdmin } from "@/lib/data/auth";
const { isAdmin, roles } = await checkIsAdmin(userId);

// ✅ Get user roles
import { getUserRoles } from "@/lib/data/profiles";
const roles = await getUserRoles(userId); // ['admin', 'volunteer']
```

**Reference:** See `docs/02-development/DATABASE_SCHEMA.md` for the updated role system documentation.

### 1. Type Safety Improvements

Replace `any` types with proper TypeScript types across the codebase.

| File                                          | Issue                                                       | Action                                                          |
| --------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | ----------- |
| `src/api/admin/emailManagement.ts`            | ✅ Already has proper inline types (`RawQuota`, `LogEntry`) | Done                                                            |
| `src/api/adminAPI.ts`                         | ✅ Fixed `any` in updatePostStatus/bulkUpdateStatus         | Created inline `PostUpdateData` and `BulkUpdateData` interfaces |
| `src/lib/email/test-providers.ts`             | ✅ Fixed `details?: any`                                    | Changed to `Record<string, unknown>`                            |
| `src/utils/translationClient.ts`              | ✅ Fixed `any` in StorageAdapter                            | Changed to `unknown` type, typed getHeaders options             |
| `src/api/adminAPI.ts`                         | ✅ Fixed `any` return types                                 | Defined explicit `Error                                         | null` types |
| `src/api/crmAPI.ts`                           | ✅ Fixed `any` in data transformations                      | Created inline `RawCustomer` types                              |
| `src/api/segmentBuilderAPI.ts`                | ✅ Fixed `applySegmentFilters(query: any, ...)`             | Typed Supabase query builder                                    |
| `src/api/chatAPI.ts`                          | ✅ Fixed `any` return types                                 | Defined proper `PostgrestSingleResponse` types                  |
| `src/api/campaignAPI.ts`                      | ✅ Fixed `any` in map transformations                       | Created inline raw data types                                   |
| `src/api/admin/emailManagementOptimized.ts`   | ✅ Fixed `any` in map functions                             | Created inline `RawQuotaData` and `RawEmailLog` types           |
| `src/hooks/useDistanceWorker.ts`              | ✅ Fixed `[key: string]: any` in interface                  | Used proper union type                                          |
| `src/hooks/useProductDistanceCalculation.ts`  | ✅ Fixed `.then((result: any) => ...)`                      | Typed worker result                                             |
| `src/utils/webVitals.ts`                      | ✅ Fixed `onPerfEntry?: (metric: any)`                      | Used `web-vitals` `Metric` type                                 |
| `src/lib/auth/api.ts`                         | ✅ Fixed `onAuthStateChange` callback types                 | Used Supabase `Session` type                                    |
| `src/workers/distance.worker.ts`              | ✅ Fixed `any` in Product interface                         | Created `PostGISPoint` type                                     |
| `src/utils/performanceMonitor.ts`             | ✅ Fixed `any` in CLS/TBT methods                           | Created `LayoutShiftEntry` interface                            |
| `src/api/notifications/emailNotifications.ts` | ✅ Fixed `any` in admin map                                 | Created `AdminProfile` interface                                |

### 2. Server Component Migration

Convert client pages to Server Components where possible for better performance.

| Page                              | Current   | Action                                                            |
| --------------------------------- | --------- | ----------------------------------------------------------------- |
| `src/app/admin/listings/page.tsx` | Client    | Migrate to Server Component with data fetching                    |
| `src/app/admin/users/page.tsx`    | Client    | Migrate to Server Component                                       |
| `src/app/admin/reports/page.tsx`  | ✅ Server | Migrated to Server Component with `AdminReportsClient` + Suspense |
| `src/app/admin/email/page.tsx`    | ✅ Server | Migrated to Server Component with `EmailCRMClient` + Suspense     |
| `src/app/profile/edit/page.tsx`   | Client    | Migrate to Server Component with client form                      |

### 3. Remove Direct Supabase Client Usage in Components

Components should use data layer functions or Server Actions, not direct Supabase calls.

| Component                                                     | Issue                                                               | Action                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✅ `src/components/emailPreferences/EmailPreferencesForm.tsx` | ~~Direct `supabase` import~~                                        | Server Action created (`saveEmailPreferences`)                         |
| `src/components/modals/PasswordRecoveryModal.tsx`             | ✅ Uses client Supabase correctly for auth state changes (realtime) | Valid use case - Done                                                  |
| ✅ `src/components/modals/FeedbackModal.tsx`                  | ~~Direct `supabase` import~~                                        | Server Actions created (`submitFeedback`, `getCurrentUserInfo`)        |
| ✅ `src/components/admin/LocalizationMonitoring.tsx`          | ~~Direct `supabase` import~~                                        | Created `lib/data/localization.ts`, removed `React.memo`/`useCallback` |

## Medium Priority

### 4. Remove Unnecessary Memoization

React Compiler handles memoization automatically. Remove manual `useMemo`/`useCallback` where not needed.

| File                                                                 | Issue                                                                   | Action                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/components/oneProduct/OneProduct.tsx`                           | ✅ Removed `useMemo`                                                    | Let compiler optimize                                              |
| `src/components/header/CategoryFilterComponent.tsx`                  | ✅ Removed `useCallback`                                                | Simplified callbacks                                               |
| `src/components/header/navbar/SearchBar.tsx`                         | ✅ Removed `memo`, `useCallback`                                        | Simplified component                                               |
| `src/app/food/[id]/ProductDetailClient.tsx`                          | ✅ Removed `useCallback`                                                | Simplified handlers                                                |
| `src/components/modals/publish-listing/components/SharePreview.tsx`  | ✅ Removed `useCallback`                                                | Simplified copyLink                                                |
| `src/components/modals/publish-listing/components/ImageLightbox.tsx` | ✅ Removed `useCallback`                                                | Simplified navigation                                              |
| `src/components/modals/publish-listing/components/VoiceInput.tsx`    | ✅ Removed `useCallback`                                                | Simplified toggleListening                                         |
| `src/components/alert/AlertComponent.tsx`                            | ✅ Removed `useCallback`                                                | Inlined dismiss logic                                              |
| `src/components/admin/ListingDetailModal.tsx`                        | ✅ Removed `memo`, `useCallback`, `useMemo`; migrated to Server Actions | Simplified component, uses local state for mutation pending states |
| `src/components/theme/theme-customizer/PresetCard.tsx`               | ✅ Removed `memo`, `useCallback`                                        | Simplified handlers                                                |
| `src/components/theme/theme-customizer/AccentColorPicker.tsx`        | ✅ Removed `forwardRef`, `displayName`                                  | Simplified to plain function                                       |
| `src/components/carousel/Carousel.tsx`                               | ✅ Removed `memo`, `useCallback`                                        | Simplified component                                               |
| `src/components/minifiedUserInfo/MinifiedUserInfo.tsx`               | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/CompactSearchButton.tsx`                      | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/chat/ContactsBlock.tsx`                              | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/modals/SearchModal.tsx`                              | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/modals/NavDrawer.tsx`                                | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/NavbarLogo.tsx`                        | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/atoms/CategoryItem.tsx`                | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/atoms/IconButton.tsx`                  | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/atoms/MenuItem.tsx`                    | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/chat/InputSection.tsx`                               | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/navigateButtons/NavigateButtons.tsx`                 | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/Header.tsx`                                   | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/ProfileSettings.tsx`                          | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/organisms/NavbarActions.tsx`           | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/organisms/DesktopMenu.tsx`             | ✅ Removed `memo`                                                       | Simplified component                                               |
| `src/components/header/navbar/organisms/MobileMenu.tsx`              | ✅ Removed `memo`                                                       | Simplified component                                               |

**Additional components with memo removed:**
| `src/components/admin/EmailQuotaDashboard.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/admin/EmailSendingHistory.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/admin/ManualEmailSender.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/admin/EmailStatsDashboard.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/ThemeToast.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/FloatingThemeToggle.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/ThemeSettingsPanel.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/theme-customizer/index.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/theme-customizer/AccentColorPicker.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/theme-customizer/ColorBlindnessSelector.tsx` | ✅ Removed `memo`, `forwardRef`, `displayName` | Simplified to plain function |
| `src/components/theme/theme-customizer/ContrastSelector.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/theme-customizer/FontScaleSelector.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/theme/theme-customizer/SeasonalPresetCard.tsx` | ✅ Removed `memo` | Simplified component |
| `src/components/ui/theme-toggle.tsx` | ✅ Removed `memo` | Simplified component |
| `src/app/admin/AdminDashboardClient.tsx` | ✅ Removed `memo` | Simplified component |
| `src/app/admin/layout.tsx` | ✅ Removed `memo` | Simplified component |
| `src/app/admin/ai-insights/page.tsx` | ✅ Removed `memo` import | Simplified component |

**Note:** Keep `useMemo`/`useCallback`/`memo` only for:

- Expensive computations (>10ms)
- Dependencies for `useEffect`
- Passing to third-party libraries that require stable references
- Custom comparison functions in memo (e.g., `MessageItem.tsx` and `MessagesWindow.tsx` for chat performance)

### 5. Create Missing Data Layer Functions

Add cached data functions for features currently fetching directly.

| Feature            | Action                                                    |
| ------------------ | --------------------------------------------------------- |
| Email preferences  | ✅ Created `src/lib/data/email-preferences.ts`            |
| Localization stats | ✅ Created `src/lib/data/localization.ts`                 |
| Feedback           | ✅ Created `src/app/actions/feedback.ts` (Server Actions) |
| CRM customers      | ✅ Created `src/lib/data/crm.ts`                          |

### 6. Consolidate API Layer

The `src/api/` directory has overlap with `src/lib/data/`. Consolidate:

| Current                 | Target                                | Status |
| ----------------------- | ------------------------------------- | ------ |
| `src/api/productAPI.ts` | Migrate to `src/lib/data/products.ts` | Pending |
| `src/api/profileAPI.ts` | Migrate to `src/lib/data/profiles.ts` | Pending |
| `src/api/forumAPI.ts`   | Migrate to `src/lib/data/forum.ts`    | Pending |
| `src/api/adminAPI.ts`   | Migrate to server actions             | ✅ Done |

Keep `src/api/` only for:

- Client-side API calls (realtime, storage)
- Third-party integrations

### 7. Complete TODO Items

| File                                   | TODO                            | Action                             |
| -------------------------------------- | ------------------------------- | ---------------------------------- |
| `src/lib/performance/monitoring.ts`    | Send to analytics service       | Implement analytics integration    |
| `src/lib/security/mfa.ts`              | Integrate SMS provider          | Add Twilio/MessageBird integration |
| `src/hooks/useProfile.ts`              | Implement country fetching      | Add countries API                  |
| `src/utils/productionErrorReporter.ts` | Replace error reporting service | Integrate Sentry or similar        |

## Low Priority

### 8. Code Organization

#### Consolidate Hooks

```
src/hooks/
├── queries/           # TanStack Query hooks (keep)
├── mutations/         # Mutation hooks (keep)
├── ui/                # UI-related hooks
│   ├── useMediaQuery.ts
│   ├── useGridSize.ts
│   ├── useScrollCompact.ts
│   └── useAdvancedScroll.ts
├── map/               # Map-related hooks
│   ├── useMapPosition.ts
│   ├── useMapZoom.ts
│   ├── useMarkerIcon.ts
│   └── useDefaultMapCenter.ts
├── performance/       # Performance hooks
│   ├── useHighRefreshRate.ts
│   ├── useRAFThrottle.ts
│   └── useWebGLRenderer.ts
└── index.ts           # Barrel exports
```

#### Consolidate Utils

```
src/utils/
├── error-handling/    # Error utilities
│   ├── globalErrorHandler.ts
│   ├── storageErrorHandler.ts
│   ├── chunkLoadErrorHandler.ts
│   └── buildErrorDetector.ts
├── geo/               # Geographic utilities
│   ├── getDistanceFromLatLonInKm.ts
│   ├── getDistanceFromUserToProduct.ts
│   └── postgis.ts
├── i18n/              # i18n utilities
│   ├── i18n.ts
│   ├── i18n-backend.ts
│   └── translationClient.ts
└── index.ts
```

### 9. Testing Improvements

| Area           | Action                                      |
| -------------- | ------------------------------------------- |
| Data layer     | Add tests for `src/lib/data/*.ts` functions |
| Server Actions | Add tests for `src/app/actions/*.ts`        |
| Hooks          | Increase coverage for custom hooks          |
| Components     | Add integration tests for key flows         |

### 10. Documentation

| Area                 | Action                                 |
| -------------------- | -------------------------------------- |
| API documentation    | Document all `src/lib/data/` functions |
| Component storybook  | Add Storybook for UI components        |
| Architecture diagram | Update with current data flow          |

## Implementation Order

1. **Week 1-2:** Type safety improvements (High Priority #1)
2. **Week 3-4:** Server Component migration (High Priority #2)
3. **Week 5:** Remove direct Supabase usage (High Priority #3)
4. **Week 6:** Remove unnecessary memoization (Medium Priority #4)
5. **Week 7-8:** Create missing data layer functions (Medium Priority #5)
6. **Week 9-10:** Consolidate API layer (Medium Priority #6)
7. **Ongoing:** Complete TODOs, code organization, testing

## Quick Wins (Can be done immediately)

1. ✅ Add `placeholderData` to all TanStack Query hooks
2. ✅ Add cache logging in development
3. ✅ Remove simple `useCallback` wrappers in components (`CategoryFilterComponent.tsx`)
4. ✅ Remove unnecessary `useMemo` (`OneProduct.tsx`)
5. ✅ Fix `any` return types in `chatAPI.ts` (`getRoom`, `getAllRoomsForCurrentUser`)
6. ✅ Fix `any` types in `segmentBuilderAPI.ts`, `campaignAPI.ts`, `emailManagementOptimized.ts`
7. ✅ Fix `any` types in `webVitals.ts`, `useDistanceWorker.ts`, `useProductDistanceCalculation.ts`
8. ✅ Refactor `EmailPreferencesForm` to use Server Actions
9. ✅ Refactor `FeedbackModal` to use Server Actions
10. ✅ Remove `memo` and `useCallback` from `SearchBar.tsx`
11. ✅ Fix `any` types in `distance.worker.ts`, `performanceMonitor.ts`, `auth/api.ts`
12. ✅ Fix `any` types in `emailNotifications.ts`
13. ✅ Refactor `LocalizationMonitoring.tsx` - removed `React.memo`/`useCallback`, added types
14. ✅ Refactor `PublishListingModal.tsx` - removed `React.memo`
15. ✅ Remove `memo`/`useCallback` from 25+ components (ProductDetailClient, Carousel, NavDrawer, etc.)
16. ✅ Fix `any` types in `adminAPI.ts` (updatePostStatus, bulkUpdateStatus)
17. ✅ Fix `any` types in `test-providers.ts`, `translationClient.ts`
18. Add explicit return types to exported functions
19. Replace `any` with `unknown` where type is truly unknown

## Metrics to Track

- TypeScript strict mode errors: Target 0
- `any` usage count: Target < 10 (justified cases only)
- Client Component pages: Target < 5 (auth, chat, realtime only)
- Test coverage: Target > 80%
- Bundle size: Monitor for regressions
