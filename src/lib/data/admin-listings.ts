/**
 * Admin Listings Data Layer
 * Server-side data fetching for admin CRM listings management
 * Uses unstable_cache for server-side caching with tag-based invalidation
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface AdminListing {
  id: number;
  profile_id: string;
  post_name: string;
  post_description: string | null;
  post_type: string;
  pickup_time: string | null;
  available_hours: string | null;
  post_address: string | null;
  images: string[] | null;
  is_active: boolean;
  is_arranged: boolean;
  post_arranged_to: string | null;
  post_arranged_at: string | null;
  post_views: number;
  post_like_counter: number;
  created_at: string;
  updated_at: string;
  // Admin fields
  admin_notes: string | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  // Joined profile data
  profile: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface AdminListingsFilter {
  status?: "all" | "pending" | "approved" | "rejected" | "flagged";
  category?: string;
  search?: string;
  sortBy?: "created_at" | "updated_at" | "post_name" | "post_views";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface AdminListingsResult {
  listings: AdminListing[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListingStats {
  total: number;
  active: number;
  inactive: number;
  arranged: number;
  byCategory: Record<string, number>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Derive status from listing fields
 */
function deriveStatus(listing: {
  is_active: boolean;
  is_arranged: boolean;
}): AdminListing["status"] {
  if (!listing.is_active) return "pending";
  if (listing.is_arranged) return "approved";
  return "approved";
}

// ============================================================================
// Data Functions
// ============================================================================

/**
 * Get admin listings with filters and pagination
 */
export async function getAdminListings(
  filters: AdminListingsFilter = {}
): Promise<AdminListingsResult> {
  const supabase = await createClient();

  const {
    status = "all",
    category,
    search,
    sortBy = "created_at",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = filters;

  const offset = (page - 1) * limit;

  let query = supabase.from("posts").select(
    `
      id,
      profile_id,
      post_name,
      post_description,
      post_type,
      pickup_time,
      available_hours,
      post_address,
      images,
      is_active,
      is_arranged,
      post_arranged_to,
      post_arranged_at,
      post_views,
      post_like_counter,
      created_at,
      updated_at,
      admin_notes,
      profile:profiles!profile_id(id, first_name, second_name, email, avatar_url)
    `,
    { count: "exact" }
  );

  // Apply status filter
  if (status !== "all") {
    if (status === "pending") {
      query = query.eq("is_active", false);
    } else if (status === "approved") {
      query = query.eq("is_active", true);
    }
  }

  // Apply category filter
  if (category && category !== "all") {
    query = query.eq("post_type", category);
  }

  // Apply search filter
  if (search?.trim()) {
    query = query.or(`post_name.ilike.%${search}%,post_description.ilike.%${search}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw new Error(error.message);

  const listings: AdminListing[] = (data ?? []).map((item) => ({
    ...item,
    status: deriveStatus(item),
    profile: extractFirst(item.profile as Array<AdminListing["profile"]>),
  }));

  return {
    listings,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

/**
 * Get cached admin listings
 */
export const getCachedAdminListings = unstable_cache(
  async (filters: AdminListingsFilter = {}): Promise<AdminListingsResult> => {
    return getAdminListings(filters);
  },
  ["admin-listings"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.ADMIN_LISTINGS, CACHE_TAGS.ADMIN],
  }
);

/**
 * Get single listing by ID for admin
 */
export async function getAdminListingById(id: number): Promise<AdminListing | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      profile_id,
      post_name,
      post_description,
      post_type,
      pickup_time,
      available_hours,
      post_address,
      images,
      is_active,
      is_arranged,
      post_arranged_to,
      post_arranged_at,
      post_views,
      post_like_counter,
      created_at,
      updated_at,
      admin_notes,
      profile:profiles!profile_id(id, first_name, second_name, email, avatar_url)
    `
    )
    .eq("id", id)
    .single();

  if (error) return null;

  return {
    ...data,
    status: deriveStatus(data),
    profile: extractFirst(data.profile as Array<AdminListing["profile"]>),
  };
}

/**
 * Get listing statistics for admin dashboard
 */
export const getListingStats = unstable_cache(
  async (): Promise<ListingStats> => {
    const supabase = await createClient();

    const [
      { count: total },
      { count: active },
      { count: inactive },
      { count: arranged },
      { data: categoryData },
    ] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_active", false),
      supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_arranged", true),
      supabase.from("posts").select("post_type"),
    ]);

    // Count by category
    const byCategory: Record<string, number> = {};
    (categoryData ?? []).forEach((item) => {
      const type = item.post_type || "unknown";
      byCategory[type] = (byCategory[type] || 0) + 1;
    });

    return {
      total: total ?? 0,
      active: active ?? 0,
      inactive: inactive ?? 0,
      arranged: arranged ?? 0,
      byCategory,
    };
  },
  ["admin-listing-stats"],
  {
    revalidate: CACHE_DURATIONS.ADMIN_STATS,
    tags: [CACHE_TAGS.ADMIN_STATS, CACHE_TAGS.ADMIN],
  }
);

// Admin auth utilities moved to @/lib/data/admin-auth
export { getAdminAuth, requireAdmin } from "./admin-auth";
