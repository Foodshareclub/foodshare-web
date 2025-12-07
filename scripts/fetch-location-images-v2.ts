/**
 * Fetch images for foodbanks and fridges using multiple FREE sources
 *
 * Sources (in priority order):
 * 1. High-res favicon/logo from websites (apple-touch-icon, favicon)
 * 2. Wikimedia Commons - search by name + location
 * 3. Mapillary - street-level photos by coordinates
 *
 * Usage:
 *   npx tsx scripts/fetch-location-images-v2.ts [options]
 *
 * Options:
 *   --dry-run           Don't actually download/upload, just test
 *   --limit=N           Process only N posts
 *   --type=fridge|foodbank  Filter by post type
 *   --source=favicon|wiki|mapillary  Use specific source only
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0') || Infinity;
const TYPE_FILTER = args.find((a) => a.startsWith('--type='))?.split('=')[1] as 'fridge' | 'foodbank' | undefined;
const SOURCE_FILTER = args.find((a) => a.startsWith('--source='))?.split('=')[1] as 'favicon' | 'wiki' | 'mapillary' | undefined;

const CONFIG = {
  BATCH_SIZE: 50,
  DELAY_BETWEEN_BATCHES_MS: 200,
  CONCURRENCY: 25,
  REQUEST_TIMEOUT_MS: 5000,
  MAX_IMAGE_SIZE_MB: 5,
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  STORAGE_BUCKET: 'posts',
};

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

interface Post {
  id: number;
  post_name: string;
  post_type: string;
  website: string | null;
  post_address: string | null;
  location: { coordinates: [number, number] } | null; // [lng, lat]
}

interface FetchResult {
  postId: number;
  success: boolean;
  source?: string;
  imageUrl?: string;
  error?: string;
}

// Skip domains that block scraping
const SKIP_DOMAINS = ['facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com'];

/**
 * Source 1: Extract high-res favicon/logo from website
 */
async function fetchFaviconFromWebsite(website: string): Promise<string | null> {
  try {
    const url = new URL(website);
    if (SKIP_DOMAINS.some((d) => url.hostname.includes(d))) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

    const response = await fetch(website, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();
    const baseUrl = response.url || website;

    // Look for high-res icons (priority order) - skip .ico files
    const iconPatterns = [
      // Apple touch icons (usually 180x180 or larger, always PNG)
      /<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+\.png[^"']*)["']/i,
      /<link[^>]*href=["']([^"']+\.png[^"']*)["'][^>]*rel=["']apple-touch-icon(?:-precomposed)?["']/i,
      // Large PNG favicon
      /<link[^>]*rel=["']icon["'][^>]*sizes=["'](?:192|256|512)x(?:192|256|512)["'][^>]*href=["']([^"']+\.png[^"']*)["']/i,
      // Manifest icon (often has large icons)
      /<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']+)["']/i,
    ];

    for (const pattern of iconPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        let iconUrl = match[1];
        
        // Handle manifest.json - need to fetch and parse it
        if (iconUrl.includes('manifest')) {
          try {
            const manifestUrl = iconUrl.startsWith('http') ? iconUrl : new URL(iconUrl, baseUrl).href;
            const manifestRes = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) });
            const manifest = await manifestRes.json();
            const largeIcon = manifest.icons?.find((i: { sizes?: string }) => 
              i.sizes && parseInt(i.sizes.split('x')[0]) >= 192
            );
            if (largeIcon?.src) {
              iconUrl = largeIcon.src.startsWith('http') ? largeIcon.src : new URL(largeIcon.src, baseUrl).href;
              return iconUrl;
            }
          } catch {
            continue;
          }
        }

        // Resolve relative URLs
        if (!iconUrl.startsWith('http')) {
          iconUrl = new URL(iconUrl, baseUrl).href;
        }
        return iconUrl;
      }
    }

    // Try common PNG favicon paths as fallback (skip .ico)
    const commonPaths = [
      '/apple-touch-icon.png',
      '/apple-touch-icon-180x180.png',
      '/apple-touch-icon-precomposed.png',
      '/favicon-192x192.png',
      '/android-chrome-192x192.png',
      '/android-chrome-512x512.png',
    ];

    for (const path of commonPaths) {
      try {
        const iconUrl = new URL(path, baseUrl).href;
        const res = await fetch(iconUrl, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        // Verify it's actually an image, not an HTML 404 page
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.startsWith('image/')) {
          return iconUrl;
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Source 2: Search Wikimedia Commons for images
 */
async function fetchFromWikimedia(name: string, _address: string): Promise<string | null> {
  try {
    // Search Wikimedia Commons by name only (address often too specific)
    const searchQuery = encodeURIComponent(name.slice(0, 80));
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&srnamespace=6&srlimit=10&format=json&origin=*`;

    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;

    const data = await response.json();
    const results = data.query?.search || [];

    if (results.length === 0) return null;

    // Find first actual image file (skip PDFs, SVGs, etc)
    for (const result of results) {
      const title = result.title as string;
      // Only accept common image formats
      if (!title.toLowerCase().match(/\.(jpg|jpeg|png|webp)/)) continue;

      // Get image info
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&format=json&origin=*`;
      const infoRes = await fetch(infoUrl, { signal: AbortSignal.timeout(5000) });
      if (!infoRes.ok) continue;

      const infoData = await infoRes.json();
      const pages = infoData.query?.pages || {};
      const page = Object.values(pages)[0] as { imageinfo?: Array<{ url: string; size: number }> };
      const imageInfo = page?.imageinfo?.[0];
      
      // Skip images larger than 8MB
      if (imageInfo && imageInfo.size && imageInfo.size < 8 * 1024 * 1024) {
        return imageInfo.url;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Download and upload image to Supabase
 */
async function downloadAndUploadImage(imageUrl: string, postId: number, source: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  const response = await fetch(imageUrl, {
    signal: controller.signal,
    headers: { 'User-Agent': 'FoodShareBot/1.0' },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  let contentType = response.headers.get('content-type') || 'image/png';
  const contentLength = parseInt(response.headers.get('content-length') || '0');

  // Skip files that are too large (but allow up to 10MB for wiki images)
  const maxSize = source === 'wiki' ? 10 * 1024 * 1024 : CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (contentLength > maxSize) {
    throw new Error('Image too large');
  }

  // Skip unsupported formats
  const unsupportedTypes = ['icon', 'x-icon', 'vnd.microsoft.icon', 'pdf', 'octet-stream'];
  if (unsupportedTypes.some(t => contentType.includes(t))) {
    throw new Error(`Unsupported format: ${contentType}`);
  }

  // Accept images only
  if (!contentType.startsWith('image/')) {
    throw new Error(`Invalid content type: ${contentType}`);
  }

  const buffer = await response.arrayBuffer();
  
  // Skip tiny images (likely 1x1 tracking pixels or tiny favicons)
  if (buffer.byteLength < 2000) {
    throw new Error('Image too small (likely placeholder)');
  }

  // Determine extension from content type
  let extension = 'jpg';
  if (contentType.includes('png')) extension = 'png';
  else if (contentType.includes('gif')) extension = 'gif';
  else if (contentType.includes('webp')) extension = 'webp';
  else if (contentType.includes('svg')) extension = 'svg';
  
  const filename = `${postId}/${source}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CONFIG.STORAGE_BUCKET)
    .upload(filename, buffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(filename);
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

  if (error) throw new Error(`Update failed: ${error.message}`);
}

/**
 * Process a single post - try multiple sources
 */
async function processPost(post: Post): Promise<FetchResult> {
  const result: FetchResult = { postId: post.id, success: false };

  try {
    console.log(`  [${post.id}] ${post.post_name.slice(0, 40)}`);

    let imageUrl: string | null = null;
    let source = '';

    // Source 1: Favicon (if has website and not filtered to other source)
    if (post.website && (!SOURCE_FILTER || SOURCE_FILTER === 'favicon')) {
      imageUrl = await fetchFaviconFromWebsite(post.website);
      if (imageUrl) source = 'favicon';
    }

    // Source 2: Wikimedia (if no favicon found)
    if (!imageUrl && post.post_address && (!SOURCE_FILTER || SOURCE_FILTER === 'wiki')) {
      imageUrl = await fetchFromWikimedia(post.post_name, post.post_address);
      if (imageUrl) source = 'wiki';
    }

    if (!imageUrl) {
      result.error = 'No image found from any source';
      console.log(`    ✗ No image found`);
      return result;
    }

    console.log(`    Found (${source}): ${imageUrl.slice(0, 50)}...`);

    if (DRY_RUN) {
      result.success = true;
      result.source = source;
      result.imageUrl = imageUrl;
      console.log(`    [DRY RUN] Would upload`);
      return result;
    }

    // Download and upload
    const storedUrl = await downloadAndUploadImage(imageUrl, post.id, source);
    await updatePostImage(post.id, storedUrl);
    
    console.log(`    ✓ Uploaded (${source})`);
    result.success = true;
    result.source = source;
    result.imageUrl = storedUrl;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.log(`    ✗ ${result.error}`);
  }

  return result;
}

/**
 * Fetch posts without images using cursor pagination
 */
async function fetchPostsWithoutImages(): Promise<Post[]> {
  const allPosts: Post[] = [];
  const PAGE_SIZE = 100;
  let lastId = 0;
  let hasMore = true;

  console.log('  Fetching posts...');

  while (hasMore) {
    const { data, error } = await supabase
      .from('posts')
      .select('id, post_name, post_type, website, post_address, location')
      .in('post_type', TYPE_FILTER ? [TYPE_FILTER] : ['fridge', 'foodbank'])
      .or('images.is.null,images.eq.{}')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    if (error) throw new Error(`Fetch failed: ${error.message}`);

    if (data && data.length > 0) {
      allPosts.push(...(data as Post[]));
      lastId = data[data.length - 1].id;
      hasMore = data.length === PAGE_SIZE;
      process.stdout.write(`  ${allPosts.length} posts\r`);
    } else {
      hasMore = false;
    }

    if (LIMIT < Infinity && allPosts.length >= LIMIT) {
      console.log('');
      return allPosts.slice(0, LIMIT);
    }
  }

  console.log('');
  return allPosts;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function processWithConcurrency(posts: Post[], concurrency: number): Promise<FetchResult[]> {
  const results: FetchResult[] = [];
  for (let i = 0; i < posts.length; i += concurrency) {
    const chunk = posts.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(processPost));
    results.push(...chunkResults);
  }
  return results;
}

async function main() {
  console.log('🍽️  FoodShare Image Fetcher v2 (Multi-Source)');
  console.log('='.repeat(50));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${LIMIT === Infinity ? 'None' : LIMIT}`);
  console.log(`Type: ${TYPE_FILTER || 'All'}`);
  console.log(`Source: ${SOURCE_FILTER || 'All (favicon → wiki)'}`);
  console.log('');

  const posts = await fetchPostsWithoutImages();
  console.log(`Found ${posts.length} posts to process\n`);

  if (posts.length === 0) {
    console.log('Nothing to do!');
    return;
  }

  const results: FetchResult[] = [];
  const batches = Math.ceil(posts.length / CONFIG.BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const batch = posts.slice(i * CONFIG.BATCH_SIZE, (i + 1) * CONFIG.BATCH_SIZE);
    console.log(`\nBatch ${i + 1}/${batches}`);
    console.log('-'.repeat(40));

    const batchResults = await processWithConcurrency(batch, CONFIG.CONCURRENCY);
    results.push(...batchResults);

    if (i < batches - 1) {
      await sleep(CONFIG.DELAY_BETWEEN_BATCHES_MS);
    }
  }

  // Summary
  const successful = results.filter((r) => r.success);
  const bySource = successful.reduce((acc, r) => {
    acc[r.source || 'unknown'] = (acc[r.source || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary');
  console.log(`  Total: ${results.length}`);
  console.log(`  ✓ Success: ${successful.length}`);
  console.log(`  ✗ Failed: ${results.length - successful.length}`);
  console.log(`  By source: ${JSON.stringify(bySource)}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
