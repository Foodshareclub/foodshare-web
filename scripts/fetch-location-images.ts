/**
 * Fetch images for foodbanks and fridges from their websites
 *
 * This script:
 * 1. Fetches posts without images that have websites
 * 2. Scrapes og:image or other meta images from each website
 * 3. Downloads and uploads to Supabase storage
 * 4. Updates the post record with the new image URL
 *
 * Usage:
 *   npx tsx scripts/fetch-location-images.ts [options]
 *
 * Options:
 *   --dry-run           Don't actually download/upload, just test
 *   --fast              5x faster (more aggressive rate limiting)
 *   --limit=N           Process only N posts
 *   --type=fridge|foodbank  Filter by post type
 *
 * Examples:
 *   npx tsx scripts/fetch-location-images.ts --fast --limit=500
 *   npx tsx scripts/fetch-location-images.ts --type=foodbank
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Parse CLI args first (needed for config)
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FAST_MODE = args.includes('--fast');
const LIMIT =
  parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0') || Infinity;
const TYPE_FILTER = args.find((a) => a.startsWith('--type='))?.split('=')[1] as
  | 'fridge'
  | 'foodbank'
  | undefined;

// Configuration - fast mode processes 5x faster
const CONFIG = {
  BATCH_SIZE: FAST_MODE ? 20 : 10,
  DELAY_BETWEEN_BATCHES_MS: FAST_MODE ? 1000 : 3000, // 1s or 3s between batches
  CONCURRENCY: FAST_MODE ? 10 : 5, // Parallel requests per batch
  REQUEST_TIMEOUT_MS: 8000,
  MAX_IMAGE_SIZE_MB: 5,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  STORAGE_BUCKET: 'posts',
};

// Initialize Supabase client
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

interface Post {
  id: number;
  post_name: string;
  post_type: string;
  website: string;
}

interface FetchResult {
  postId: number;
  success: boolean;
  imageUrl?: string;
  error?: string;
}

/**
 * Extract image URL from HTML using meta tags
 */
function extractImageFromHtml(html: string, baseUrl: string): string | null {
  // Priority order for image extraction
  const patterns = [
    // Open Graph
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    // Twitter Card
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
    // Schema.org
    /<meta[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/i,
    // Link rel image
    /<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    // Apple touch icon (fallback)
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      let imageUrl = match[1];
      // Handle relative URLs
      if (imageUrl.startsWith('/')) {
        const url = new URL(baseUrl);
        imageUrl = `${url.protocol}//${url.host}${imageUrl}`;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, baseUrl).href;
      }
      return imageUrl;
    }
  }

  return null;
}

/**
 * Fetch image URL from a website
 */
async function fetchImageFromWebsite(website: string): Promise<string | null> {
  // Skip known problematic domains
  const skipDomains = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com'];
  try {
    const url = new URL(website);
    if (skipDomains.some((d) => url.hostname.includes(d))) {
      throw new Error('Social media site (skipped)');
    }
  } catch {
    throw new Error('Invalid URL');
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    const response = await fetch(website, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return extractImageFromHtml(html, response.url || website);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch website: ${message}`);
  }
}

/**
 * Download image and upload to Supabase storage
 */
async function downloadAndUploadImage(
  imageUrl: string,
  postId: number
): Promise<string> {
  // Fetch the image
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  const response = await fetch(imageUrl, {
    signal: controller.signal,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; FoodShareBot/1.0; +https://foodshare.nz)',
    },
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const contentLength = parseInt(response.headers.get('content-length') || '0');

  // Check size
  if (contentLength > CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB`);
  }

  // Validate content type
  if (!contentType.startsWith('image/')) {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  const buffer = await response.arrayBuffer();
  const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg';
  const filename = `${postId}/scraped-${Date.now()}.${extension}`;

  // Upload to Supabase
  const { error: uploadError } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(filename, buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

/**
 * Update post with new image
 */
async function updatePostImage(postId: number, imageUrl: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .update({ images: [imageUrl] })
    .eq('id', postId);

  if (error) {
    throw new Error(`Failed to update post: ${error.message}`);
  }
}

/**
 * Process a single post
 */
async function processPost(post: Post): Promise<FetchResult> {
  const result: FetchResult = { postId: post.id, success: false };

  try {
    console.log(`  [${post.id}] ${post.post_name} - ${post.website}`);

    // Step 1: Fetch image URL from website
    const imageUrl = await fetchImageFromWebsite(post.website);
    if (!imageUrl) {
      result.error = 'No image found in meta tags';
      return result;
    }
    console.log(`    Found: ${imageUrl.substring(0, 60)}...`);

    if (DRY_RUN) {
      result.success = true;
      result.imageUrl = imageUrl;
      console.log(`    [DRY RUN] Would download and upload`);
      return result;
    }

    // Step 2: Download and upload to Supabase
    const storedUrl = await downloadAndUploadImage(imageUrl, post.id);
    console.log(`    Uploaded: ${storedUrl.substring(0, 60)}...`);

    // Step 3: Update post record
    await updatePostImage(post.id, storedUrl);
    console.log(`    ✓ Updated post`);

    result.success = true;
    result.imageUrl = storedUrl;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`    ✗ ${result.error}`);
  }

  return result;
}

/**
 * Fetch posts that need images (with pagination to bypass 1000 row limit)
 */
async function fetchPostsWithoutImages(): Promise<Post[]> {
  const allPosts: Post[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('posts')
      .select('id, post_name, post_type, website')
      .in('post_type', TYPE_FILTER ? [TYPE_FILTER] : ['fridge', 'foodbank'])
      .or('images.is.null,images.eq.{}')
      .neq('website', '-')
      .neq('website', '')
      .not('website', 'is', null)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    if (data && data.length > 0) {
      allPosts.push(...(data as Post[]));
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }

    // Apply user limit if specified
    if (LIMIT < Infinity && allPosts.length >= LIMIT) {
      return allPosts.slice(0, LIMIT);
    }
  }

  return allPosts;
}

/**
 * Sleep helper
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Process posts with concurrency limit using chunking
 */
async function processWithConcurrency(
  posts: Post[],
  concurrency: number
): Promise<FetchResult[]> {
  const results: FetchResult[] = [];

  // Process in chunks of `concurrency` size
  for (let i = 0; i < posts.length; i += concurrency) {
    const chunk = posts.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((post) => processPost(post)));
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('🍽️  FoodShare Image Fetcher');
  console.log('='.repeat(50));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${FAST_MODE ? ' (FAST)' : ''}`);
  console.log(`Limit: ${LIMIT === Infinity ? 'None' : LIMIT}`);
  console.log(`Type filter: ${TYPE_FILTER || 'All'}`);
  console.log(`Concurrency: ${CONFIG.CONCURRENCY} parallel requests`);
  console.log('');

  // Fetch posts
  console.log('Fetching posts without images...');
  const posts = await fetchPostsWithoutImages();
  console.log(`Found ${posts.length} posts to process\n`);

  if (posts.length === 0) {
    console.log('Nothing to do!');
    return;
  }

  // Process in batches
  const results: FetchResult[] = [];
  const batches = Math.ceil(posts.length / CONFIG.BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const batch = posts.slice(i * CONFIG.BATCH_SIZE, (i + 1) * CONFIG.BATCH_SIZE);
    console.log(`\nBatch ${i + 1}/${batches} (${batch.length} posts)`);
    console.log('-'.repeat(40));

    // Process batch with concurrency limit
    const batchResults = await processWithConcurrency(batch, CONFIG.CONCURRENCY);
    results.push(...batchResults);

    // Rate limiting between batches
    if (i < batches - 1) {
      console.log(`Waiting ${CONFIG.DELAY_BETWEEN_BATCHES_MS / 1000}s...`);
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES_MS);
    }
  }

  // Summary
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log(`  Total processed: ${results.length}`);
  console.log(`  ✓ Successful: ${successful}`);
  console.log(`  ✗ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed posts:');
    results
      .filter((r) => !r.success)
      .slice(0, 10)
      .forEach((r) => {
        console.log(`  - Post ${r.postId}: ${r.error}`);
      });
    if (failed > 10) {
      console.log(`  ... and ${failed - 10} more`);
    }
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
