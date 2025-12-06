/**
 * Migration script: Download remote challenge images and upload to Supabase Storage
 *
 * Structure: challenges/{challenge_id}/image.{ext}
 *
 * Run with: npx tsx scripts/migrate-challenge-images.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BUCKET = 'challenges';

interface Challenge {
  id: number;
  challenge_title: string;
  challenge_image: string;
}

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) {
      return ext;
    }
  } catch {
    // ignore
  }
  return 'webp'; // default
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
  };
  return mimeTypes[ext] || 'image/webp';
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageMigration/1.0)',
      },
    });
    if (!response.ok) {
      console.error(`  Failed to download: ${response.status} ${response.statusText}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`  Download error:`, error);
    return null;
  }
}

async function uploadToStorage(
  challengeId: number,
  imageBuffer: Buffer,
  ext: string
): Promise<string | null> {
  const filePath = `${challengeId}/image.${ext}`;
  const mimeType = getMimeType(ext);

  const { error } = await supabase.storage.from(BUCKET).upload(filePath, imageBuffer, {
    contentType: mimeType,
    upsert: true,
  });

  if (error) {
    console.error(`  Upload error:`, error.message);
    return null;
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return publicUrl.publicUrl;
}

async function updateChallengeImage(challengeId: number, newUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('challenges')
    .update({ challenge_image: newUrl })
    .eq('id', challengeId);

  if (error) {
    console.error(`  DB update error:`, error.message);
    return false;
  }
  return true;
}

async function migrateChallenge(challenge: Challenge): Promise<boolean> {
  const { id, challenge_title, challenge_image } = challenge;

  console.log(`\n[${id}] ${challenge_title}`);
  console.log(`  Source: ${challenge_image.substring(0, 60)}...`);

  // Skip if already in our Supabase storage
  if (challenge_image.includes('***REMOVED***.supabase.co/storage/v1/object/public/challenges/')) {
    console.log(`  ✓ Already migrated, skipping`);
    return true;
  }

  // Download
  const imageBuffer = await downloadImage(challenge_image);
  if (!imageBuffer) {
    console.log(`  ✗ Failed to download`);
    return false;
  }
  console.log(`  Downloaded: ${imageBuffer.length} bytes`);

  // Upload
  const ext = getExtensionFromUrl(challenge_image);
  const newUrl = await uploadToStorage(id, imageBuffer, ext);
  if (!newUrl) {
    console.log(`  ✗ Failed to upload`);
    return false;
  }
  console.log(`  Uploaded: ${newUrl}`);

  // Update DB
  const updated = await updateChallengeImage(id, newUrl);
  if (!updated) {
    console.log(`  ✗ Failed to update DB`);
    return false;
  }

  console.log(`  ✓ Migrated successfully`);
  return true;
}

async function main(): Promise<void> {
  console.log('=== Challenge Image Migration ===\n');

  // Fetch all challenges
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('id, challenge_title, challenge_image')
    .order('id');

  if (error) {
    console.error('Failed to fetch challenges:', error.message);
    process.exit(1);
  }

  if (!challenges || challenges.length === 0) {
    console.log('No challenges found');
    return;
  }

  console.log(`Found ${challenges.length} challenges to process`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const challenge of challenges) {
    const result = await migrateChallenge(challenge);
    if (result) {
      if (challenge.challenge_image.includes('***REMOVED***.supabase.co/storage/v1/object/public/challenges/')) {
        skipped++;
      } else {
        success++;
      }
    } else {
      failed++;
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
