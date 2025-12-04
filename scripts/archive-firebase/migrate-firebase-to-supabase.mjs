/**
 * Script to migrate Firebase Storage URLs to Supabase Storage
 * Run with: node scripts/migrate-firebase-to-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { Buffer } from 'buffer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://***REMOVED***.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Download image from URL
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadImage(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = response.headers['content-type'] || 'image/jpeg';
        resolve({ buffer, contentType });
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabase(buffer, contentType, userId) {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const fileName = `${userId}/avatar.${ext}`;

  const { data, error } = await supabase.storage
    .from('profiles')
    .upload(fileName, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('profiles')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Update profile with new URL
 */
async function updateProfile(userId, newUrl) {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: newUrl })
    .eq('id', userId);

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }
}

async function migrateFirebaseUrls() {
  console.log('🚀 Starting Firebase to Supabase migration...\n');

  // Find all profiles with Firebase URLs
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .like('avatar_url', '%firebasestorage.googleapis.com%');

  if (error) {
    console.error('Error fetching profiles:', error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ No Firebase URLs found - nothing to migrate!');
    return;
  }

  console.log(`📋 Found ${profiles.length} profile(s) with Firebase URLs\n`);

  let migrated = 0;
  let failed = 0;

  for (const profile of profiles) {
    console.log(`\n🔄 Migrating profile: ${profile.id}`);
    console.log(`   Old URL: ${profile.avatar_url.substring(0, 60)}...`);

    try {
      // Download from Firebase
      console.log('   ⬇️  Downloading from Firebase...');
      const { buffer, contentType } = await downloadImage(profile.avatar_url);
      console.log(`   ✓  Downloaded ${buffer.length} bytes (${contentType})`);

      // Upload to Supabase
      console.log('   ⬆️  Uploading to Supabase...');
      const newUrl = await uploadToSupabase(buffer, contentType, profile.id);
      console.log(`   ✓  Uploaded to: ${newUrl.substring(0, 60)}...`);

      // Update profile
      console.log('   📝 Updating profile record...');
      await updateProfile(profile.id, newUrl);
      console.log('   ✅ Migration complete!');

      migrated++;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All Firebase URLs migrated successfully!');
    console.log('   You can now safely remove Firebase config from next.config.ts');
  }
}

migrateFirebaseUrls().catch(console.error);
