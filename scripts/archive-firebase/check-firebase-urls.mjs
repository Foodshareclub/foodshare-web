/**
 * Script to check for Firebase Storage URLs in the Supabase database
 * Run with: node scripts/check-firebase-urls.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://***REMOVED***.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkForFirebaseUrls() {
  console.log('🔍 Checking for Firebase Storage URLs in the database...\n');

  const tablesToCheck = [
    { table: 'profiles', columns: ['avatar_url'] },
    { table: 'posts', columns: ['photo_url', 'image_url'] },
    { table: 'products', columns: ['image_url', 'photo_url'] },
  ];

  let totalFound = 0;

  for (const { table, columns } of tablesToCheck) {
    console.log(`\n📋 Checking table: ${table}`);

    try {
      const { data, error } = await supabase.from(table).select('*').limit(1000);

      if (error) {
        console.log(`   ⚠️  Error or table doesn't exist: ${error.message}`);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`   ℹ️  Table is empty or no access`);
        continue;
      }

      console.log(`   Found ${data.length} rows`);

      // Check each row for Firebase URLs
      const firebaseRows = [];
      for (const row of data) {
        for (const col of columns) {
          if (row[col] && typeof row[col] === 'string' && row[col].includes('firebasestorage.googleapis.com')) {
            firebaseRows.push({ id: row.id, column: col, url: row[col] });
          }
        }
        // Also check all string columns for Firebase URLs
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string' && value.includes('firebasestorage.googleapis.com')) {
            if (!columns.includes(key)) {
              firebaseRows.push({ id: row.id, column: key, url: value });
            }
          }
        }
      }

      if (firebaseRows.length > 0) {
        console.log(`   🔥 Found ${firebaseRows.length} Firebase URLs:`);
        firebaseRows.forEach(r => {
          console.log(`      - ID: ${r.id}, Column: ${r.column}`);
          console.log(`        URL: ${r.url.substring(0, 80)}...`);
        });
        totalFound += firebaseRows.length;
      } else {
        console.log(`   ✅ No Firebase URLs found`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking table: ${err.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Total Firebase URLs found: ${totalFound}`);

  if (totalFound === 0) {
    console.log('✅ No Firebase URLs in database - safe to remove Firebase config!');
  } else {
    console.log('⚠️  Firebase URLs need to be migrated before removing config');
  }
}

checkForFirebaseUrls().catch(console.error);
