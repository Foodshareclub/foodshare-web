#!/usr/bin/env tsx
/**
 * Foodbank & Community Fridge Import Script
 *
 * Imports foodbank and community fridge locations from OpenStreetMap into the FoodShare database.
 *
 * Usage:
 *   npm run import:foodbanks -- --country=US --dry-run
 *   npm run import:foodbanks -- --country=US,UK,DE --verbose
 *   npm run import:foodbanks -- --country=all
 *   npm run import:foodbanks -- --country=all --type=fridge
 *   npm run import:foodbanks -- --country=all --type=all
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { parseArgs } from 'util';

import {
  SYSTEM_USER_ID,
  SUPPORTED_COUNTRIES,
  COUNTRIES,
  DEFAULT_BATCH_SIZE,
} from './config';
import type {
  RawFoodbankData,
  FoodbankImportRecord,
  ImportResult,
  ImportOptions,
  Coordinates,
} from './types';
import { fetchOSMFoodbanks, fetchOSMFridges, type FacilityType } from './sources/osm-source';
import { geocodeAddress, isValidCoordinates, getGeocodeStats } from './utils/geocoding';
import {
  deduplicateFoodbanks,
  findExistingDuplicate,
  type ExistingFoodbank,
} from './utils/deduplication';
import { toImportRecord } from './utils/formatting';

// Extended import options with facility type
interface ExtendedImportOptions extends ImportOptions {
  facilityType: FacilityType | 'all';
}

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

/**
 * Parse CLI arguments
 */
function parseCliArgs(): ExtendedImportOptions {
  const { values } = parseArgs({
    options: {
      country: { type: 'string', default: 'US' },
      type: { type: 'string', default: 'food_bank' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      'batch-size': { type: 'string', default: String(DEFAULT_BATCH_SIZE) },
    },
    strict: true,
  });

  // Parse countries
  let countries: string[];
  if (values.country === 'all') {
    countries = SUPPORTED_COUNTRIES;
  } else {
    countries = values.country!.split(',').map((c) => c.trim().toUpperCase());

    // Validate country codes
    for (const code of countries) {
      if (!SUPPORTED_COUNTRIES.includes(code)) {
        console.error(`Unknown country code: ${code}`);
        console.error(`Supported: ${SUPPORTED_COUNTRIES.join(', ')}`);
        process.exit(1);
      }
    }
  }

  // Parse facility type
  const typeInput = values.type?.toLowerCase() || 'food_bank';
  let facilityType: FacilityType | 'all';
  if (typeInput === 'all') {
    facilityType = 'all';
  } else if (typeInput === 'fridge' || typeInput === 'fridges') {
    facilityType = 'fridge';
  } else if (typeInput === 'food_bank' || typeInput === 'foodbank' || typeInput === 'foodbanks') {
    facilityType = 'food_bank';
  } else {
    console.error(`Unknown facility type: ${typeInput}`);
    console.error(`Supported: food_bank, fridge, all`);
    process.exit(1);
  }

  return {
    countries,
    facilityType,
    dryRun: values['dry-run'] ?? false,
    verbose: values.verbose ?? false,
    batchSize: parseInt(values['batch-size']!, 10) || DEFAULT_BATCH_SIZE,
  };
}

/**
 * Initialize Supabase client
 */
function initSupabase(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Ensure system user exists
 */
async function ensureSystemUser(supabase: SupabaseClient, verbose: boolean): Promise<void> {
  if (verbose) {
    console.log('Checking system user...');
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', SYSTEM_USER_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking system user:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.log('Creating system user profile...');

    const { error: insertError } = await supabase.from('profiles').insert({
      id: SYSTEM_USER_ID,
      email: 'foodbanks@foodshare.system',
      full_name: 'FoodShare Data Import',
      is_admin: true,
    });

    if (insertError) {
      console.error('Error creating system user:', insertError.message);
      process.exit(1);
    }

    console.log('System user created successfully');
  } else if (verbose) {
    console.log('System user exists');
  }
}

/**
 * Fetch existing facilities from database for deduplication
 */
async function fetchExistingFacilities(
  supabase: SupabaseClient,
  postType: 'food_bank' | 'fridge'
): Promise<ExistingFoodbank[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('id, post_name, location')
    .eq('post_type', postType);

  if (error) {
    console.error(`Error fetching existing ${postType}s:`, error.message);
    return [];
  }

  return (data || []).map((p) => {
    // Parse PostGIS location if available
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (p.location) {
      // Handle GeoJSON format: {"type":"Point","coordinates":[lon,lat]}
      if (typeof p.location === 'object' && p.location.coordinates) {
        longitude = p.location.coordinates[0];
        latitude = p.location.coordinates[1];
      }
    }

    return {
      id: p.id,
      post_name: p.post_name,
      latitude,
      longitude,
    };
  });
}

/**
 * Process and geocode facility data
 */
async function processFoodbanks(
  rawData: RawFoodbankData[],
  verbose: boolean,
  postType: 'food_bank' | 'fridge' = 'food_bank'
): Promise<{ records: FoodbankImportRecord[]; geocoded: number }> {
  const records: FoodbankImportRecord[] = [];
  let geocodedCount = 0;

  for (let i = 0; i < rawData.length; i++) {
    const fb = rawData[i];

    if (verbose && i > 0 && i % 50 === 0) {
      console.log(`   Processing ${i}/${rawData.length}...`);
    }

    let coords: Coordinates | null = null;

    // Use existing coordinates if valid
    if (
      fb.latitude !== undefined &&
      fb.longitude !== undefined &&
      isValidCoordinates(fb.latitude, fb.longitude)
    ) {
      coords = { latitude: fb.latitude, longitude: fb.longitude };
    } else if (fb.address) {
      // Try geocoding
      coords = await geocodeAddress(fb.address, verbose);
      if (coords) {
        geocodedCount++;
      }
    }

    if (!coords) {
      if (verbose) {
        console.log(`   Skipping "${fb.name}" - no coordinates available`);
      }
      continue;
    }

    records.push(toImportRecord(fb, coords, postType));
  }

  return { records, geocoded: geocodedCount };
}

/**
 * Insert records in batches
 */
async function batchInsert(
  supabase: SupabaseClient,
  records: FoodbankImportRecord[],
  batchSize: number,
  verbose: boolean
): Promise<{ inserted: number; errors: Array<{ name: string; error: string }> }> {
  let inserted = 0;
  const errors: Array<{ name: string; error: string }> = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    if (verbose) {
      console.log(`   Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}...`);
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`   Batch insert error:`, error.message);

      // Try inserting one by one to identify failures
      for (const record of batch) {
        const { error: singleError } = await supabase
          .from('posts')
          .insert(record);

        if (singleError) {
          errors.push({ name: record.post_name, error: singleError.message });
        } else {
          inserted++;
        }
      }
    } else {
      inserted += data?.length || batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Import facilities for a single country
 */
async function importCountry(
  supabase: SupabaseClient,
  countryCode: string,
  existingFacilities: ExistingFoodbank[],
  options: ExtendedImportOptions,
  facilityType: FacilityType
): Promise<ImportResult> {
  const { dryRun, verbose, batchSize } = options;
  const typeName = facilityType === 'fridge' ? 'community fridges' : 'foodbanks';
  const postType = facilityType === 'fridge' ? 'fridge' : 'food_bank';

  const result: ImportResult = {
    country: `${COUNTRIES[countryCode]?.name || countryCode} (${typeName})`,
    total: 0,
    inserted: 0,
    duplicates: 0,
    errors: 0,
    geocoded: 0,
    errorDetails: [],
  };

  console.log(`\nImporting ${typeName} for ${COUNTRIES[countryCode]?.name || countryCode}...`);

  // Fetch from OSM
  let rawData: RawFoodbankData[];
  try {
    rawData = facilityType === 'fridge'
      ? await fetchOSMFridges(countryCode, verbose)
      : await fetchOSMFoodbanks(countryCode, verbose);
    result.total = rawData.length;
    console.log(`   Fetched ${rawData.length} ${typeName} from OSM`);
  } catch (error) {
    console.error(`   Error fetching data:`, error);
    result.errors = 1;
    result.errorDetails.push({
      name: 'FETCH_ERROR',
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  }

  if (rawData.length === 0) {
    console.log(`   No ${typeName} found`);
    return result;
  }

  // Deduplicate within fetched data
  const { unique: deduped, duplicateCount: internalDups } = deduplicateFoodbanks(rawData, verbose);
  if (internalDups > 0) {
    console.log(`   Removed ${internalDups} internal duplicates`);
  }

  // Check against existing database records
  const newFacilities: RawFoodbankData[] = [];
  for (const fb of deduped) {
    const existing = findExistingDuplicate(fb, existingFacilities);
    if (existing) {
      result.duplicates++;
      if (verbose) {
        console.log(`   Database duplicate: "${fb.name}" matches existing "${existing.post_name}"`);
      }
    } else {
      newFacilities.push(fb);
    }
  }

  console.log(`   ${newFacilities.length} new ${typeName} to import (${result.duplicates} duplicates skipped)`);

  if (newFacilities.length === 0) {
    return result;
  }

  // Process and geocode
  console.log(`   Processing and geocoding...`);
  const { records, geocoded } = await processFoodbanks(newFacilities, verbose, postType);
  result.geocoded = geocoded;

  console.log(`   ${records.length} records ready for import (${geocoded} geocoded)`);

  if (records.length === 0) {
    return result;
  }

  // Dry run - just report
  if (dryRun) {
    console.log(`   [DRY RUN] Would insert ${records.length} records`);
    result.inserted = records.length;
    return result;
  }

  // Insert into database
  console.log(`   Inserting into database...`);
  const { inserted, errors } = await batchInsert(supabase, records, batchSize, verbose);

  result.inserted = inserted;
  result.errors = errors.length;
  result.errorDetails = errors;

  console.log(`   Inserted ${inserted} records`);
  if (errors.length > 0) {
    console.log(`   ${errors.length} errors occurred`);
  }

  return result;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       Foodbank & Community Fridge Import Tool              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Parse arguments
  const options = parseCliArgs();

  console.log(`Countries: ${options.countries.join(', ')}`);
  console.log(`Facility type: ${options.facilityType}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log(`Verbose: ${options.verbose}`);
  console.log(`Batch size: ${options.batchSize}`);

  // Initialize Supabase
  const supabase = initSupabase();

  // Ensure system user exists
  await ensureSystemUser(supabase, options.verbose);

  // Determine which types to import
  const typesToImport: FacilityType[] = options.facilityType === 'all'
    ? ['food_bank', 'fridge']
    : [options.facilityType];

  const results: ImportResult[] = [];

  for (const facilityType of typesToImport) {
    const postType = facilityType === 'fridge' ? 'fridge' : 'food_bank';
    const typeName = facilityType === 'fridge' ? 'community fridges' : 'foodbanks';

    // Fetch existing facilities for deduplication
    console.log(`\nFetching existing ${typeName} from database...`);
    const existingFacilities = await fetchExistingFacilities(supabase, postType);
    console.log(`Found ${existingFacilities.length} existing ${typeName} records`);

    // Import each country
    for (const countryCode of options.countries) {
      const result = await importCountry(supabase, countryCode, existingFacilities, options, facilityType);
      results.push(result);

      // Small delay between countries to be nice to APIs
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('═'.repeat(60));

  let totalTotal = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalErrors = 0;
  let totalGeocoded = 0;

  for (const r of results) {
    console.log(`\n${r.country}:`);
    console.log(`   Total fetched:  ${r.total}`);
    console.log(`   Inserted:       ${r.inserted}`);
    console.log(`   Duplicates:     ${r.duplicates}`);
    console.log(`   Geocoded:       ${r.geocoded}`);
    console.log(`   Errors:         ${r.errors}`);

    totalTotal += r.total;
    totalInserted += r.inserted;
    totalDuplicates += r.duplicates;
    totalErrors += r.errors;
    totalGeocoded += r.geocoded;

    if (r.errorDetails.length > 0 && options.verbose) {
      console.log(`   Error details:`);
      for (const e of r.errorDetails.slice(0, 5)) {
        console.log(`      - ${e.name}: ${e.error}`);
      }
      if (r.errorDetails.length > 5) {
        console.log(`      ... and ${r.errorDetails.length - 5} more`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('TOTALS:');
  console.log(`   Total fetched:  ${totalTotal}`);
  console.log(`   Inserted:       ${totalInserted}`);
  console.log(`   Duplicates:     ${totalDuplicates}`);
  console.log(`   Geocoded:       ${totalGeocoded}`);
  console.log(`   Errors:         ${totalErrors}`);
  console.log('─'.repeat(60));

  const geocodeStats = getGeocodeStats();
  console.log(`\nGeocode cache size: ${geocodeStats.cacheSize}`);

  if (options.dryRun) {
    console.log('\n[DRY RUN] No changes were made to the database');
  }

  if (totalErrors > 0) {
    console.log('\nSome errors occurred during import. Check logs above.');
    process.exit(1);
  }

  console.log('\nImport completed successfully!');
}

// Run
main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
