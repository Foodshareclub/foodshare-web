/**
 * Database-Driven Default Distance Resolver
 *
 * Single source of truth: Supabase backend app_config and get_default_search_radius RPC.
 * Resolves regional default feed search distances:
 * - Miles-using countries (US, GB, MM, LR): 40 miles (~64,374 meters)
 * - Metric countries (rest of world): 40 km (40,000 meters)
 *
 * Features:
 * - Queries Supabase backend RPC `get_default_search_radius`
 * - Fallback to `app_config` table and local authoritative standards
 * - In-memory LRU cache to guarantee sub-millisecond SSR performance
 */

export interface DefaultDistanceResult {
  unit: "miles" | "km";
  distance: number;
  radiusMeters: number;
  radiusKm: number;
  source: "db_rpc" | "db_config" | "fallback";
}

/**
 * Countries that primarily use miles for distance (ISO 3166-1 alpha-2)
 */
export const MILES_COUNTRIES = new Set(["US", "GB", "MM", "LR"]);

/**
 * Conversion constant: 1 mile = 1609.344 meters
 */
export const METERS_PER_MILE = 1609.344;

/**
 * Standard default distances defined in the database
 */
export const DB_DEFAULT_MILES = 40;
export const DB_DEFAULT_KM = 40;
export const DB_DEFAULT_MILES_METERS = Math.round(DB_DEFAULT_MILES * METERS_PER_MILE); // 64374
export const DB_DEFAULT_KM_METERS = DB_DEFAULT_KM * 1000; // 40000

// In-memory cache for fast SSR lookups (TTL 1 hour)
interface CacheEntry {
  result: DefaultDistanceResult;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Detects whether a country or unit preference indicates miles
 */
export function isMilesRegion(countryCode?: string | null, unit?: string | null): boolean {
  if (unit) {
    const normalizedUnit = unit.toLowerCase().trim();
    if (normalizedUnit === "miles" || normalizedUnit === "mi" || normalizedUnit === "mile") {
      return true;
    }
    if (normalizedUnit === "km" || normalizedUnit === "kilometers" || normalizedUnit === "kilometer") {
      return false;
    }
  }

  if (countryCode) {
    const normalizedCountry = countryCode.toUpperCase().trim();
    return MILES_COUNTRIES.has(normalizedCountry);
  }

  return false;
}

/**
 * Generates local authoritative fallback matching database configuration
 */
export function getAuthoritativeFallback(isMiles: boolean): DefaultDistanceResult {
  if (isMiles) {
    return {
      unit: "miles",
      distance: DB_DEFAULT_MILES,
      radiusMeters: DB_DEFAULT_MILES_METERS,
      radiusKm: Number((DB_DEFAULT_MILES * 1.609344).toFixed(3)),
      source: "fallback",
    };
  }

  return {
    unit: "km",
    distance: DB_DEFAULT_KM,
    radiusMeters: DB_DEFAULT_KM_METERS,
    radiusKm: DB_DEFAULT_KM,
    source: "fallback",
  };
}

/**
 * Fetches the default search radius from the Supabase database.
 * Single source of truth for both anonymous and authenticated users.
 */
export async function getDefaultSearchDistance(
  countryCode?: string | null,
  unit?: string | null,
): Promise<DefaultDistanceResult> {
  const isMiles = isMilesRegion(countryCode, unit);
  const cacheKey = `${isMiles ? "miles" : "km"}:${countryCode ?? ""}`;

  // Check cache
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Attempt database RPC call
  try {
    const { createCachedClient } = await import("@/lib/supabase/server");
    const supabase = createCachedClient();

    const { data, error } = await supabase.rpc("get_default_search_radius", {
      p_country_code: countryCode ?? null,
      p_unit: unit ?? (isMiles ? "miles" : "km"),
    });

    if (!error && data && typeof data === "object") {
      const rpcResult = data as {
        unit?: string;
        distance?: number;
        radius_meters?: number;
        radius_km?: number;
      };

      if (rpcResult.distance && rpcResult.radius_meters) {
        const resolved: DefaultDistanceResult = {
          unit: rpcResult.unit === "miles" ? "miles" : "km",
          distance: Number(rpcResult.distance),
          radiusMeters: Number(rpcResult.radius_meters),
          radiusKm: Number(rpcResult.radius_km ?? (rpcResult.radius_meters / 1000)),
          source: "db_rpc",
        };

        cache.set(cacheKey, { result: resolved, timestamp: now });
        return resolved;
      }
    }
  } catch {
    // Database query failed or in test/offline environment — use authoritative fallback
  }

  // Fallback to authoritative database standard
  const fallback = getAuthoritativeFallback(isMiles);
  cache.set(cacheKey, { result: fallback, timestamp: now });
  return fallback;
}
