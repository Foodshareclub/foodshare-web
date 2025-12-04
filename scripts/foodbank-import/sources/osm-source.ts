/**
 * OpenStreetMap Overpass API Data Source
 *
 * Fetches foodbank and community fridge locations from OSM using the Overpass API.
 * Supports multiple facility types: food_bank, fridge, food_pantry
 */

import {
  OVERPASS_API_URL,
  OVERPASS_TIMEOUT,
  USER_AGENT,
  COUNTRIES,
} from '../config';
import type {
  RawFoodbankData,
  CountryConfig,
  OSMElement,
  OverpassResponse,
} from '../types';

// Facility types for import
export type FacilityType = 'food_bank' | 'fridge';

/**
 * Build Overpass QL query for foodbanks and food pantries
 */
function buildFoodbankQuery(bbox: [number, number, number, number]): string {
  const [south, west, north, east] = bbox;

  return `
[out:json][timeout:${OVERPASS_TIMEOUT}];
(
  node["amenity"="food_bank"](${south},${west},${north},${east});
  way["amenity"="food_bank"](${south},${west},${north},${east});
  node["social_facility"="food_bank"](${south},${west},${north},${east});
  way["social_facility"="food_bank"](${south},${west},${north},${east});
  node["social_facility:for"="hungry"](${south},${west},${north},${east});
  way["social_facility:for"="hungry"](${south},${west},${north},${east});
  node["social_facility:for"="underprivileged"]["social_facility"="food_bank"](${south},${west},${north},${east});
  way["social_facility:for"="underprivileged"]["social_facility"="food_bank"](${south},${west},${north},${east});
  node["amenity"="social_facility"]["social_facility"="food_bank"](${south},${west},${north},${east});
  way["amenity"="social_facility"]["social_facility"="food_bank"](${south},${west},${north},${east});
);
out center body;
`.trim();
}

/**
 * Build Overpass QL query for community fridges
 */
function buildFridgeQuery(bbox: [number, number, number, number]): string {
  const [south, west, north, east] = bbox;

  return `
[out:json][timeout:${OVERPASS_TIMEOUT}];
(
  node["amenity"="food_sharing"](${south},${west},${north},${east});
  way["amenity"="food_sharing"](${south},${west},${north},${east});
  node["amenity"="fridge"](${south},${west},${north},${east});
  way["amenity"="fridge"](${south},${west},${north},${east});
  node["amenity"="vending_machine"]["vending"="food"](${south},${west},${north},${east});
  node["amenity"="public_fridge"](${south},${west},${north},${east});
  way["amenity"="public_fridge"](${south},${west},${north},${east});
  node["social_facility"="food_bank"]["food_bank"="community_fridge"](${south},${west},${north},${east});
  node["amenity"="community_fridge"](${south},${west},${north},${east});
  way["amenity"="community_fridge"](${south},${west},${north},${east});
  node["man_made"="community_fridge"](${south},${west},${north},${east});
  node["disused:amenity"!~"."](${south},${west},${north},${east})["amenity"="give_box"]["give_box:food"="yes"];
);
out center body;
`.trim();
}

/**
 * Parse an OSM element into RawFoodbankData
 */
function parseOSMElement(element: OSMElement, countryCode: string): RawFoodbankData | null {
  const tags = element.tags || {};

  // Get coordinates (ways have center, nodes have direct lat/lon)
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;

  // Name is required
  const name = tags.name || tags['name:en'] || tags.operator;
  if (!name) {
    return null;
  }

  // Build address from components
  const addressParts: string[] = [];
  if (tags['addr:housenumber'] && tags['addr:street']) {
    addressParts.push(`${tags['addr:housenumber']} ${tags['addr:street']}`);
  } else if (tags['addr:street']) {
    addressParts.push(tags['addr:street']);
  }

  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
  const state = tags['addr:state'] || tags['addr:province'];
  const postcode = tags['addr:postcode'];
  const country = tags['addr:country'] || COUNTRIES[countryCode]?.name || countryCode;

  // Parse opening hours
  const hours = tags.opening_hours || tags['opening_hours:covid19'] || undefined;

  // Parse services from description or other tags
  const services: string[] = [];
  if (tags.description) {
    services.push(tags.description);
  }
  if (tags['social_facility:for']) {
    services.push(`For: ${tags['social_facility:for']}`);
  }
  if (tags.cuisine) {
    services.push(`Food type: ${tags.cuisine}`);
  }

  // Build full address string
  let fullAddress = addressParts.join(', ');
  if (city) fullAddress += fullAddress ? `, ${city}` : city;
  if (state) fullAddress += fullAddress ? `, ${state}` : state;
  if (postcode) fullAddress += fullAddress ? ` ${postcode}` : postcode;
  if (country) fullAddress += fullAddress ? `, ${country}` : country;

  return {
    name,
    address: fullAddress || undefined,
    city: city || undefined,
    state: state || undefined,
    country: COUNTRIES[countryCode]?.name || countryCode,
    postcode: postcode || undefined,
    latitude: lat,
    longitude: lon,
    phone: tags.phone || tags['contact:phone'] || undefined,
    website: tags.website || tags['contact:website'] || tags.url || undefined,
    email: tags.email || tags['contact:email'] || undefined,
    hours: hours || undefined,
    services: services.length > 0 ? services : undefined,
    eligibility: tags.eligibility || tags.access || undefined,
    social: {
      facebook: tags['contact:facebook'] || tags.facebook || undefined,
      twitter: tags['contact:twitter'] || tags.twitter || undefined,
      instagram: tags['contact:instagram'] || tags.instagram || undefined,
    },
    source: 'OpenStreetMap',
    sourceId: `${element.type}/${element.id}`,
  };
}

/**
 * Fetch facilities from OpenStreetMap for a specific country
 */
async function fetchOSMFacilities(
  countryCode: string,
  facilityType: FacilityType,
  verbose = false
): Promise<RawFoodbankData[]> {
  const countryConfig = COUNTRIES[countryCode];
  if (!countryConfig) {
    throw new Error(`Unknown country code: ${countryCode}`);
  }

  const query = facilityType === 'fridge'
    ? buildFridgeQuery(countryConfig.bbox)
    : buildFoodbankQuery(countryConfig.bbox);

  if (verbose) {
    console.log(`   Querying Overpass API for ${facilityType}s in ${countryConfig.name}...`);
  }

  const response = await fetch(OVERPASS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  const data: OverpassResponse = await response.json();

  if (verbose) {
    console.log(`   Received ${data.elements.length} raw elements from OSM`);
  }

  // Parse elements and filter out invalid ones
  const facilities: RawFoodbankData[] = [];
  let skipped = 0;

  for (const element of data.elements) {
    const parsed = parseOSMElement(element, countryCode);
    if (parsed) {
      facilities.push(parsed);
    } else {
      skipped++;
    }
  }

  if (verbose && skipped > 0) {
    console.log(`   Skipped ${skipped} elements without names`);
  }

  return facilities;
}

/**
 * Fetch foodbanks from OpenStreetMap for a specific country
 */
export async function fetchOSMFoodbanks(
  countryCode: string,
  verbose = false
): Promise<RawFoodbankData[]> {
  return fetchOSMFacilities(countryCode, 'food_bank', verbose);
}

/**
 * Fetch community fridges from OpenStreetMap for a specific country
 */
export async function fetchOSMFridges(
  countryCode: string,
  verbose = false
): Promise<RawFoodbankData[]> {
  return fetchOSMFacilities(countryCode, 'fridge', verbose);
}

/**
 * Fetch foodbanks from all specified countries
 */
export async function fetchAllFoodbanks(
  countryCodes: string[],
  verbose = false
): Promise<Map<string, RawFoodbankData[]>> {
  const results = new Map<string, RawFoodbankData[]>();

  for (const code of countryCodes) {
    try {
      if (verbose) {
        console.log(`\n Fetching foodbanks for ${COUNTRIES[code]?.name || code}...`);
      }

      const foodbanks = await fetchOSMFoodbanks(code, verbose);
      results.set(code, foodbanks);

      if (verbose) {
        console.log(`   Found ${foodbanks.length} foodbanks in ${COUNTRIES[code]?.name || code}`);
      }

      // Small delay between country requests to be nice to the API
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`   Error fetching ${code}:`, error);
      results.set(code, []);
    }
  }

  return results;
}
