/**
 * Geocoding Utility for Node.js
 *
 * Adapts the shared geocoding service for use in import scripts.
 * Uses OpenStreetMap Nominatim with proper rate limiting.
 */

import { NOMINATIM_BASE_URL, USER_AGENT, API_DELAY_MS } from '../config';
import type { Coordinates } from '../types';

// In-memory cache
const geocodeCache = new Map<string, Coordinates>();
let lastRequestTime = 0;

/**
 * Normalize address for consistent caching
 */
function normalizeAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(apt\.?|apartment|unit|#)\s*[\w-]+,?/gi, '')
    .replace(/\bUSA\b/gi, 'United States');
}

/**
 * Enforce rate limiting (1 request per second for Nominatim)
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < API_DELAY_MS) {
    const delay = API_DELAY_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * Validate coordinates
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat !== 0 &&
    lon !== 0 &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Geocode an address using Nominatim
 */
export async function geocodeAddress(
  address: string,
  verbose = false
): Promise<Coordinates | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  const normalized = normalizeAddress(address);

  // Check cache
  const cached = geocodeCache.get(normalized);
  if (cached) {
    if (verbose) {
      console.log(`      Cache hit for: ${address.substring(0, 50)}...`);
    }
    return cached;
  }

  // Rate limit
  await enforceRateLimit();

  try {
    const params = new URLSearchParams({
      format: 'json',
      q: normalized,
      limit: '1',
      addressdetails: '1',
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (verbose) {
        console.log(`      Geocoding HTTP error: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      const latitude = parseFloat(result.lat);
      const longitude = parseFloat(result.lon);

      if (isValidCoordinates(latitude, longitude)) {
        const coords: Coordinates = { latitude, longitude };
        geocodeCache.set(normalized, coords);

        if (verbose) {
          console.log(`      Geocoded: ${address.substring(0, 40)}... -> ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }

        return coords;
      }
    }

    if (verbose) {
      console.log(`      No results for: ${address.substring(0, 50)}...`);
    }

    return null;
  } catch (error) {
    if (verbose) {
      console.error(`      Geocoding error:`, error);
    }
    return null;
  }
}

/**
 * Get cache statistics
 */
export function getGeocodeStats(): { cacheSize: number } {
  return {
    cacheSize: geocodeCache.size,
  };
}

/**
 * Clear the geocode cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
