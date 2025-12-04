/**
 * URL Filters Hook
 * Manages filter state in URL search params for better UX:
 * - Shareable URLs with filters
 * - Browser back/forward navigation support
 * - Persisted filters across page reloads
 */

'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ProductFilters extends Record<string, unknown> {
  search: string;
  category: string;
  sortBy: 'created_at' | 'post_name' | 'post_views' | 'distance';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface AdminFilters extends Record<string, unknown> {
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'flagged';
  search: string;
  category: string;
  sortBy: 'created_at' | 'updated_at' | 'post_name' | 'status';
  sortOrder: 'asc' | 'desc';
  dateFrom: string | null;
  dateTo: string | null;
  flaggedOnly: boolean;
  page: number;
  limit: number;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultProductFilters: ProductFilters = {
  search: '',
  category: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

const defaultAdminFilters: AdminFilters = {
  status: 'all',
  search: '',
  category: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
  dateFrom: null,
  dateTo: null,
  flaggedOnly: false,
  page: 1,
  limit: 20,
};

// ============================================================================
// Generic URL Filters Hook
// ============================================================================

/**
 * Generic hook for managing filters in URL search params
 */
export function useUrlFilters<T extends Record<string, unknown>>(
  defaults: T,
  options?: {
    /**
     * Keys to exclude from URL (e.g., sensitive data)
     */
    excludeFromUrl?: (keyof T)[];
    /**
     * Custom serializers for specific keys
     */
    serializers?: Partial<Record<keyof T, (value: T[keyof T]) => string>>;
    /**
     * Custom parsers for specific keys
     */
    parsers?: Partial<Record<keyof T, (value: string) => T[keyof T]>>;
  }
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Parse filters from URL
  const filters = useMemo(() => {
    const result = { ...defaults };

    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const urlValue = searchParams.get(String(key));
      if (urlValue !== null) {
        // Use custom parser if available
        if (options?.parsers?.[key]) {
          result[key] = options.parsers[key]!(urlValue);
        } else {
          // Default parsing based on type
          const defaultValue = defaults[key];
          if (typeof defaultValue === 'number') {
            result[key] = parseInt(urlValue, 10) as T[keyof T];
          } else if (typeof defaultValue === 'boolean') {
            result[key] = (urlValue === 'true') as T[keyof T];
          } else {
            result[key] = urlValue as T[keyof T];
          }
        }
      }
    }

    return result;
  }, [searchParams, defaults, options?.parsers]);

  // Update URL with new filters
  const setFilters = useCallback(
    (newFilters: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(newFilters)) {
        // Skip excluded keys
        if (options?.excludeFromUrl?.includes(key as keyof T)) {
          continue;
        }

        // Remove default values from URL
        if (value === defaults[key as keyof T] || value === null || value === '') {
          params.delete(key);
        } else {
          // Use custom serializer if available
          if (options?.serializers?.[key as keyof T]) {
            params.set(key, options.serializers[key as keyof T]!(value as T[keyof T]));
          } else {
            params.set(key, String(value));
          }
        }
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, pathname, router, defaults, options?.excludeFromUrl, options?.serializers]
  );

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router]);

  // Set a single filter value
  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFilters({ [key]: value } as unknown as Partial<T>);
    },
    [setFilters]
  );

  return {
    filters,
    setFilters,
    setFilter,
    resetFilters,
    isPending,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Product listing filters hook
 */
export function useProductUrlFilters() {
  return useUrlFilters(defaultProductFilters);
}

/**
 * Admin listings filters hook
 */
export function useAdminUrlFilters() {
  return useUrlFilters(defaultAdminFilters, {
    parsers: {
      flaggedOnly: (v) => v === 'true',
      page: (v) => parseInt(v, 10),
      limit: (v) => parseInt(v, 10),
    },
  });
}

// ============================================================================
// Utility: Create URL with filters
// ============================================================================

/**
 * Create a URL string with filters applied
 * Useful for generating shareable links
 */
export function createFilteredUrl<T extends Record<string, unknown>>(
  basePath: string,
  filters: Partial<T>,
  defaults?: T
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    // Skip null, undefined, empty, and default values
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      (defaults && value === defaults[key as keyof T])
    ) {
      continue;
    }
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
