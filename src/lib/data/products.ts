/**
 * Products Data Layer
 *
 * Cached data fetching functions for products.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 * 
 * NOTE: Uses createCachedClient() instead of createClient() because
 * cookies() cannot be called inside unstable_cache().
 */

import { unstable_cache } from 'next/cache';
import { createCachedClient } from '@/lib/supabase/server';
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
export async function getProducts(productType: string): Promise<InitialProductStateType[]> {
  const normalizedType = productType.toLowerCase();
  
  return unstable_cache(
    async (): Promise<InitialProductStateType[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('posts_with_location')
        .select('*')
        .eq('post_type', normalizedType)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`products-by-type-${normalizedType}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCTS,
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCTS_BY_TYPE(normalizedType)],
    }
  )();
}

/**
 * Get all active products with caching
 */
export const getAllProducts = unstable_cache(
  async (): Promise<InitialProductStateType[]> => {
    const supabase = createCachedClient();

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
export async function getProductById(productId: number): Promise<InitialProductStateType | null> {
  return unstable_cache(
    async (): Promise<InitialProductStateType | null> => {
      const supabase = createCachedClient();

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
    [`product-by-id-${productId}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCT_DETAIL,
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(productId)],
    }
  )();
}

/**
 * Get product locations for map with caching
 */
export async function getProductLocations(productType: string): Promise<LocationType[]> {
  const normalizedType = productType.toLowerCase();
  
  return unstable_cache(
    async (): Promise<LocationType[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('posts_with_location')
        .select('id, location_json, post_name, post_type, images')
        .eq('post_type', normalizedType)
        .eq('is_active', true);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`product-locations-${normalizedType}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
      tags: [CACHE_TAGS.PRODUCT_LOCATIONS, CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(normalizedType)],
    }
  )();
}

/**
 * Get all product locations for map (all types)
 */
export const getAllProductLocations = unstable_cache(
  async (): Promise<LocationType[]> => {
    const supabase = createCachedClient();

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
export async function getUserProducts(userId: string): Promise<InitialProductStateType[]> {
  return unstable_cache(
    async (): Promise<InitialProductStateType[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('posts_with_location')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`user-products-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCTS,
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.USER_PRODUCTS(userId)],
    }
  )();
}

/**
 * Search products with caching (shorter cache due to dynamic nature)
 */
export const searchProducts = unstable_cache(
  async (
    searchWord: string,
    productSearchType?: string
  ): Promise<InitialProductStateType[]> => {
    const supabase = createCachedClient();

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


/**
 * Get popular product IDs for static generation
 * Returns most recently created active products
 */
export const getPopularProductIds = unstable_cache(
  async (limit: number = 50): Promise<number[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('posts')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => p.id);
  },
  ['popular-product-ids'],
  {
    revalidate: CACHE_DURATIONS.LONG, // 1 hour - for build-time generation
    tags: [CACHE_TAGS.PRODUCTS],
  }
);
