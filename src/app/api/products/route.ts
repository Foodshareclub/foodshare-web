/**
 * Products API Route
 * Client-safe endpoint for fetching products
 * Optimized caching strategy:
 * - CDN caching with s-maxage for edge servers
 * - stale-while-revalidate for instant responses while revalidating
 * - Vary header for proper cache key differentiation
 * - ETag support for conditional requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Cache durations in seconds - optimized for infinite scroll
const CACHE_DURATIONS = {
  // Paginated products - shorter cache, frequently accessed
  PRODUCTS_PAGINATED: 60, // 1 minute
  // First page gets longer cache (most accessed)
  PRODUCTS_FIRST_PAGE: 120, // 2 minutes
  // Product detail - moderate cache
  PRODUCT_DETAIL: 180, // 3 minutes
  // Locations for map - longer cache (less frequent updates)
  LOCATIONS: 300, // 5 minutes
  // Search results - short cache (dynamic)
  SEARCH: 30, // 30 seconds
  // User products - moderate cache
  USER_PRODUCTS: 60, // 1 minute
} as const;

// Stale-while-revalidate multiplier (serve stale for this long while revalidating)
const SWR_MULTIPLIER = 2;

/**
 * Create response with optimized cache headers
 * Uses stale-while-revalidate for instant responses
 */
function jsonWithCache(
  data: unknown,
  maxAge: number,
  options?: {
    isFirstPage?: boolean;
    etag?: string;
  }
): NextResponse {
  const swr = maxAge * SWR_MULTIPLIER;
  
  const headers: HeadersInit = {
    // CDN caching with stale-while-revalidate
    'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    // Vary by query params for proper cache differentiation
    'Vary': 'Accept-Encoding',
  };

  // Add ETag for conditional requests (reduces bandwidth)
  if (options?.etag) {
    headers['ETag'] = options.etag;
  }

  return NextResponse.json(data, { headers });
}

/**
 * Generate simple ETag from data
 */
function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');
  const search = searchParams.get('search');
  const locations = searchParams.get('locations') === 'true';
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const supabase = await createClient();

  try {
    // Get single product by ID
    if (id) {
      const { data, error } = await supabase
        .from('posts_with_location')
        .select('*, reviews(*)')
        .eq('id', parseInt(id))
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(null);
        }
        throw error;
      }
      return jsonWithCache(data, CACHE_DURATIONS.PRODUCT_DETAIL);
    }

    // Get user's products (shorter cache - user-specific)
    if (userId) {
      const { data, error } = await supabase
        .from('posts_with_location')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return jsonWithCache(data ?? [], CACHE_DURATIONS.USER_PRODUCTS);
    }

    // Search products (short cache - dynamic)
    if (search) {
      let query = supabase
        .from('posts_with_location')
        .select('*, reviews(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (type && type !== 'all') {
        query = query.eq('post_type', type.toLowerCase());
      }

      query = query.textSearch('post_name', search, { type: 'websearch' });

      const { data, error } = await query;
      if (error) throw error;
      return jsonWithCache(data ?? [], CACHE_DURATIONS.SEARCH);
    }

    // Get locations for map (longer cache - less frequent updates)
    if (locations) {
      let query = supabase
        .from('posts_with_location')
        .select('id, location_json, post_name, post_type, images')
        .eq('is_active', true);

      if (type && type !== 'all') {
        query = query.eq('post_type', type.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      return jsonWithCache(data ?? [], CACHE_DURATIONS.LOCATIONS);
    }

    // Handle challenges separately - they come from the challenges table
    if (type === 'challenge') {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_published', true)
        .order('challenge_created_at', { ascending: false });

      if (error) throw error;
      return jsonWithCache(data ?? [], CACHE_DURATIONS.PRODUCTS_PAGINATED);
    }

    // Get products by type with cursor-based pagination
    // Order by id DESC for stable cursor pagination (id is sequential with creation)
    let query = supabase
      .from('posts_with_location')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check hasMore

    if (type && type !== 'all') {
      query = query.eq('post_type', type.toLowerCase());
    }

    // Cursor-based pagination: get items with ID less than cursor
    const isFirstPage = !cursor;
    if (cursor) {
      query = query.lt('id', parseInt(cursor));
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data ?? [];
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && resultItems.length > 0 
      ? resultItems[resultItems.length - 1].id 
      : null;

    const responseData = { data: resultItems, nextCursor, hasMore };
    
    // First page gets longer cache (most frequently accessed)
    // Subsequent pages get shorter cache (less frequently re-accessed)
    const cacheDuration = isFirstPage 
      ? CACHE_DURATIONS.PRODUCTS_FIRST_PAGE 
      : CACHE_DURATIONS.PRODUCTS_PAGINATED;

    return jsonWithCache(responseData, cacheDuration, {
      isFirstPage,
      etag: generateETag(responseData),
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
