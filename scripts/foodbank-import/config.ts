/**
 * Foodbank Import Configuration
 */

import type { CountryConfig } from './types';

// System user for imports (organicnz - tamerlanium@gmail.com)
// All foodbanks and community fridges are owned by this account
export const SYSTEM_USER_ID = 'b57f61eb-bcde-42a3-a2dd-038caaf24ceb';

// API Configuration
export const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
export const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
export const USER_AGENT = 'FoodShare/1.0 (contact@foodshare.app)';

// Rate limiting
export const API_DELAY_MS = 1100; // Nominatim requires 1 req/sec, add buffer
export const OVERPASS_TIMEOUT = 300; // seconds

// Batch processing
export const DEFAULT_BATCH_SIZE = 50;

// Deduplication
export const DUPLICATE_DISTANCE_METERS = 100; // Consider duplicates within 100m
export const NAME_SIMILARITY_THRESHOLD = 0.8; // 80% similarity for fuzzy matching

// Country configurations with bounding boxes [south, west, north, east]
export const COUNTRIES: Record<string, CountryConfig> = {
  // Original countries
  US: {
    code: 'US',
    name: 'United States',
    bbox: [24.396308, -125.0, 49.384358, -66.93457],
  },
  UK: {
    code: 'UK',
    name: 'United Kingdom',
    bbox: [49.674, -14.015517, 61.061, 2.0919117],
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    bbox: [41.6765556, -141.00275, 83.3362128, -52.3231981],
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    bbox: [-47.0, 112.0, -10.0, 154.0],
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    bbox: [47.2701114, 5.8663153, 55.099161, 15.0419309],
  },
  // New countries
  FR: {
    code: 'FR',
    name: 'France',
    bbox: [41.333, -5.225, 51.124, 9.55],
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    bbox: [35.946, -9.393, 43.748, 3.039],
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    bbox: [35.493, 6.627, 47.092, 18.52],
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    bbox: [50.75, 3.358, 53.555, 7.227],
  },
  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    bbox: [-47.286, 166.426, -34.39, 178.577],
  },
  IE: {
    code: 'IE',
    name: 'Ireland',
    bbox: [51.422, -10.478, 55.432, -5.996],
  },
  BE: {
    code: 'BE',
    name: 'Belgium',
    bbox: [49.497, 2.546, 51.505, 6.408],
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    bbox: [46.372, 9.531, 49.021, 17.161],
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    bbox: [45.818, 5.956, 47.808, 10.492],
  },
  SE: {
    code: 'SE',
    name: 'Sweden',
    bbox: [55.337, 11.109, 69.06, 24.167],
  },
  NO: {
    code: 'NO',
    name: 'Norway',
    bbox: [57.959, 4.65, 71.185, 31.078],
  },
  DK: {
    code: 'DK',
    name: 'Denmark',
    bbox: [54.559, 8.089, 57.751, 15.197],
  },
  FI: {
    code: 'FI',
    name: 'Finland',
    bbox: [59.808, 20.556, 70.092, 31.587],
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    bbox: [49.002, 14.123, 54.836, 24.145],
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    bbox: [36.838, -9.526, 42.154, -6.189],
  },
};

// All supported country codes
export const SUPPORTED_COUNTRIES = Object.keys(COUNTRIES);
