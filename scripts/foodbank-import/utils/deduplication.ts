/**
 * Deduplication Utility
 *
 * Detects duplicate foodbank entries using name similarity
 * and geographic proximity.
 */

import { DUPLICATE_DISTANCE_METERS, NAME_SIMILARITY_THRESHOLD } from '../config';
import type { RawFoodbankData, Coordinates } from '../types';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity (0-1)
 */
function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 1;

  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(aLower, bLower);
  return 1 - distance / maxLen;
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if two foodbanks are duplicates
 */
export function isDuplicate(
  a: RawFoodbankData,
  b: RawFoodbankData,
  distanceThreshold = DUPLICATE_DISTANCE_METERS,
  similarityThreshold = NAME_SIMILARITY_THRESHOLD
): boolean {
  // Check name similarity
  const nameSimilarity = stringSimilarity(a.name, b.name);
  if (nameSimilarity < similarityThreshold) {
    return false;
  }

  // If both have coordinates, check distance
  if (
    a.latitude !== undefined &&
    a.longitude !== undefined &&
    b.latitude !== undefined &&
    b.longitude !== undefined
  ) {
    const distance = haversineDistance(
      { latitude: a.latitude, longitude: a.longitude },
      { latitude: b.latitude, longitude: b.longitude }
    );

    // High name similarity + close proximity = duplicate
    if (distance <= distanceThreshold) {
      return true;
    }

    // Very high name similarity alone could be duplicate even if far apart
    if (nameSimilarity > 0.95) {
      return true;
    }

    return false;
  }

  // Without coordinates, rely on high name similarity
  return nameSimilarity > 0.9;
}

/**
 * Remove duplicates from a list of foodbanks
 * Keeps the first occurrence (which typically has more data)
 */
export function deduplicateFoodbanks(
  foodbanks: RawFoodbankData[],
  verbose = false
): { unique: RawFoodbankData[]; duplicateCount: number } {
  const unique: RawFoodbankData[] = [];
  let duplicateCount = 0;

  for (const fb of foodbanks) {
    let isDup = false;

    for (const existing of unique) {
      if (isDuplicate(fb, existing)) {
        isDup = true;
        duplicateCount++;

        if (verbose) {
          console.log(`      Duplicate: "${fb.name}" ~ "${existing.name}"`);
        }

        break;
      }
    }

    if (!isDup) {
      unique.push(fb);
    }
  }

  return { unique, duplicateCount };
}

/**
 * Check if a foodbank already exists in the database
 */
export interface ExistingFoodbank {
  id: number;
  post_name: string;
  latitude: number | null;
  longitude: number | null;
}

export function findExistingDuplicate(
  foodbank: RawFoodbankData,
  existing: ExistingFoodbank[]
): ExistingFoodbank | null {
  if (!foodbank.latitude || !foodbank.longitude) {
    // Without coordinates, check by name only
    for (const ex of existing) {
      if (stringSimilarity(foodbank.name, ex.post_name) > 0.9) {
        return ex;
      }
    }
    return null;
  }

  for (const ex of existing) {
    const nameSimilarity = stringSimilarity(foodbank.name, ex.post_name);

    if (nameSimilarity >= NAME_SIMILARITY_THRESHOLD) {
      // If existing record has coordinates, check distance
      if (ex.latitude !== null && ex.longitude !== null) {
        const distance = haversineDistance(
          { latitude: foodbank.latitude, longitude: foodbank.longitude },
          { latitude: ex.latitude, longitude: ex.longitude }
        );

        if (distance <= DUPLICATE_DISTANCE_METERS) {
          return ex;
        }
      } else if (nameSimilarity > 0.95) {
        // High name similarity without coords to compare
        return ex;
      }
    }
  }

  return null;
}
