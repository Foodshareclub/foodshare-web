/**
 * Foodbank Import Types
 */

// Raw data from external sources (OSM, etc.)
export interface RawFoodbankData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  email?: string;
  hours?: string;
  services?: string[];
  eligibility?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  source: string;
  sourceId: string;
}

// Processed record ready for database insert
export interface FoodbankImportRecord {
  post_name: string;
  post_type: 'food_bank' | 'fridge';
  post_description: string;
  post_address: string;
  post_stripped_address: string;
  location: string; // SRID=4326;POINT(lon lat)
  images: string[];
  available_hours: string;
  transportation: string;
  is_active: boolean;
  profile_id: string;
  website: string;
}

// Import statistics
export interface ImportResult {
  country: string;
  total: number;
  inserted: number;
  duplicates: number;
  errors: number;
  geocoded: number;
  errorDetails: Array<{ name: string; error: string }>;
}

// Coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Country configuration
export interface CountryConfig {
  code: string;
  name: string;
  bbox: [number, number, number, number]; // [south, west, north, east]
}

// CLI options
export interface ImportOptions {
  countries: string[];
  dryRun: boolean;
  verbose: boolean;
  batchSize: number;
}

// OSM element from Overpass API
export interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// OSM Overpass API response
export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OSMElement[];
}
