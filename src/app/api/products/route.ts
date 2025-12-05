/**
 * Products API Route
 * Client-safe endpoint for fetching products
 * Includes cache headers for CDN/browser caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Cache durations in seconds
const CACHE_DURATIONS = {
  PRODUCTS: 60,
  PRODUCT_DETAIL: 120,
  LOCATIONS: 300,
  SEARCH: 30,
  USER_PRODUCTS: 60,
} as const;

/**
 * Create response with cache headers
 */
function jsonWithCache(
  data: unknown,
  maxAge: number,
  staleWhileRevalidate: number = maxAge
): NextResponse {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const userId = searchParams.get('userId');
  const search = searchParams.get('search');
  const locations = searchParams.get('locations') === 'true';

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

    // Get products by type (or all)
    let query = supabase
      .from('posts_with_location')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('post_type', type.toLowerCase());
    }

    const { data, error } = await query;
    if (error) throw error;
    return jsonWithCache(data ?? [], CACHE_DURATIONS.PRODUCTS);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
