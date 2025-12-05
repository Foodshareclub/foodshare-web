/**
 * Products Data Layer
 *
 * Cached data fetching functions for products.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS } from './cache-keys';
import type { InitialProductStateType, LocationType } from '@/types/product.types';

// Re-export types for consumers
export type { InitialProductStateType, LocationType };

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get products by type with caching
 */
export const getProducts = unstable_cache(
  async (productType: string): Promise<InitialProductStateType[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('*')
      .eq('post_type', productType.toLowerCase())
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['products-by-type'],
  {
    revalidate: CACHE_DURATIONS.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS],
  }
);

/**
 * Get all active products with caching
 */
export const getAllProducts = unstable_cache(
  async (): Promise<InitialProductStateType[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['all-products'],
  {
    revalidate: CACHE_DURATIONS.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS],
  }
);

/**
 * Get single product by ID with caching
 */
export const getProductById = unstable_cache(
  async (productId: number): Promise<InitialProductStateType | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('*, reviews(*)')
      .eq('id', productId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },
  ['product-by-id'],
  {
    revalidate: CACHE_DURATIONS.PRODUCT_DETAIL,
    tags: [CACHE_TAGS.PRODUCTS],
  }
);

/**
 * Get product locations for map with caching
 */
export const getProductLocations = unstable_cache(
  async (productType: string): Promise<LocationType[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('id, location_json, post_name, post_type, images')
      .eq('post_type', productType.toLowerCase())
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['product-locations'],
  {
    revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
    tags: [CACHE_TAGS.PRODUCT_LOCATIONS],
  }
);

/**
 * Get all product locations for map (all types)
 */
export const getAllProductLocations = unstable_cache(
  async (): Promise<LocationType[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('id, location_json, post_name, post_type, images')
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['all-product-locations'],
  {
    revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
    tags: [CACHE_TAGS.PRODUCT_LOCATIONS],
  }
);

/**
 * Get products by user ID with caching
 */
export const getUserProducts = unstable_cache(
  async (userId: string): Promise<InitialProductStateType[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['user-products'],
  {
    revalidate: CACHE_DURATIONS.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS],
  }
);

/**
 * Search products with caching (shorter cache due to dynamic nature)
 */
export const searchProducts = unstable_cache(
  async (
    searchWord: string,
    productSearchType?: string
  ): Promise<InitialProductStateType[]> => {
    const supabase = await createClient();

    let query = supabase
      .from('posts_with_location')
      .select('*, reviews(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (productSearchType && productSearchType !== 'all') {
      query = query.eq('post_type', productSearchType.toLowerCase());
    }

    query = query.textSearch('post_name', searchWord, { type: 'websearch' });

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['product-search'],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.PRODUCT_SEARCH, CACHE_TAGS.PRODUCTS],
  }
);
