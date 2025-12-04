#!/usr/bin/env tsx
/**
 * Test Localization Edge Function
 *
 * Comprehensive test suite for the localization edge function
 *
 * Usage:
 *   npm run test-localization
 *   tsx scripts/test-localization-edge-function.ts
 */

import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/localization`;

const LOCALES_TO_TEST = ["en", "cs", "de", "es", "fr", "zh", "ar"];
const PLATFORMS = ["web", "ios", "android"];

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Run a test
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log(`✅ ${name} (${Date.now() - startTime}ms)`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`❌ ${name} (${Date.now() - startTime}ms)`);
    console.error(`   Error: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Test basic request
 */
async function testBasicRequest() {
  const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.locale || !data.messages || !data.version || !data.etag) {
    throw new Error("Missing required fields in response");
  }

  if (data.locale !== "en") {
    throw new Error(`Expected locale 'en', got '${data.locale}'`);
  }

  if (Object.keys(data.messages).length === 0) {
    throw new Error("No messages in response");
  }
}

/**
 * Test ETag caching
 */
async function testETagCaching() {
  // First request
  const response1 = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`);
  const data1 = await response1.json();
  const etag = data1.etag;

  if (!etag) {
    throw new Error("No ETag in response");
  }

  // Second request with ETag
  const response2 = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`, {
    headers: {
      "If-None-Match": etag,
    },
  });

  if (response2.status !== 304) {
    throw new Error(`Expected 304, got ${response2.status}`);
  }
}

/**
 * Test compression
 */
async function testCompression() {
  const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web&compressed=true`, {
    headers: {
      "Accept-Encoding": "gzip",
    },
  });

  const contentEncoding = response.headers.get("Content-Encoding");

  if (contentEncoding !== "gzip") {
    throw new Error(`Expected gzip encoding, got '${contentEncoding}'`);
  }
}

/**
 * Test fallback to English
 */
async function testFallback() {
  const response = await fetch(`${EDGE_FUNCTION_URL}?locale=invalid&platform=web`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const fallbackHeader = response.headers.get("X-Fallback");

  if (!fallbackHeader) {
    throw new Error("Expected X-Fallback header");
  }

  if (data.locale !== "en") {
    throw new Error(`Expected fallback to 'en', got '${data.locale}'`);
  }
}

/**
 * Test all supported locales
 */
async function testAllLocales() {
  for (const locale of LOCALES_TO_TEST) {
    const response = await fetch(`${EDGE_FUNCTION_URL}?locale=${locale}&platform=web`);

    if (!response.ok) {
      throw new Error(`Failed for locale '${locale}': HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.messages || Object.keys(data.messages).length === 0) {
      throw new Error(`No messages for locale '${locale}'`);
    }
  }
}

/**
 * Test all platforms
 */
async function testAllPlatforms() {
  for (const platform of PLATFORMS) {
    const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=${platform}`);

    if (!response.ok) {
      throw new Error(`Failed for platform '${platform}': HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.platform !== platform) {
      throw new Error(`Expected platform '${platform}', got '${data.platform}'`);
    }
  }
}

/**
 * Test cache headers
 */
async function testCacheHeaders() {
  const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`);

  const cacheControl = response.headers.get("Cache-Control");
  const etag = response.headers.get("ETag");

  if (!cacheControl) {
    throw new Error("Missing Cache-Control header");
  }

  if (!etag) {
    throw new Error("Missing ETag header");
  }

  if (!cacheControl.includes("public")) {
    throw new Error("Cache-Control should include 'public'");
  }

  if (!cacheControl.includes("max-age")) {
    throw new Error("Cache-Control should include 'max-age'");
  }
}

/**
 * Test CORS headers
 */
async function testCORSHeaders() {
  const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`, {
    headers: {
      Origin: "https://foodshare.app",
    },
  });

  const corsOrigin = response.headers.get("Access-Control-Allow-Origin");

  if (!corsOrigin) {
    throw new Error("Missing Access-Control-Allow-Origin header");
  }
}

/**
 * Test response time
 */
async function testResponseTime() {
  const startTime = Date.now();
  const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`);
  const duration = Date.now() - startTime;

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  if (duration > 1000) {
    throw new Error(`Response time too slow: ${duration}ms (expected <1000ms)`);
  }

  console.log(`   Response time: ${duration}ms`);
}

/**
 * Test rate limiting (optional - requires many requests)
 */
async function testRateLimiting() {
  console.log("   ⚠️  Skipping rate limit test (requires 1000+ requests)");
  // Uncomment to test rate limiting
  /*
  for (let i = 0; i < 1001; i++) {
    const response = await fetch(`${EDGE_FUNCTION_URL}?locale=en&platform=web`);
    if (i === 1000 && response.status !== 429) {
      throw new Error(`Expected 429 after 1000 requests, got ${response.status}`);
    }
  }
  */
}

/**
 * Print summary
 */
function printSummary() {
  console.log("\n" + "━".repeat(60));
  console.log("📊 Test Summary:");
  console.log("━".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⏱️  Average Duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.name}`);
        console.log(`     Error: ${r.error}`);
      });
  }

  console.log("━".repeat(60));
}

/**
 * Main execution
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     Localization Edge Function Test Suite                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  if (!SUPABASE_URL) {
    console.error("❌ Missing VITE_SUPABASE_URL in environment");
    process.exit(1);
  }

  console.log(`🔗 Testing: ${EDGE_FUNCTION_URL}\n`);

  // Run tests
  await runTest("Basic Request", testBasicRequest);
  await runTest("ETag Caching", testETagCaching);
  await runTest("Compression", testCompression);
  await runTest("Fallback to English", testFallback);
  await runTest("All Locales", testAllLocales);
  await runTest("All Platforms", testAllPlatforms);
  await runTest("Cache Headers", testCacheHeaders);
  await runTest("CORS Headers", testCORSHeaders);
  await runTest("Response Time", testResponseTime);
  await runTest("Rate Limiting", testRateLimiting);

  // Print summary
  printSummary();

  // Exit with error if any tests failed
  const failed = results.filter((r) => !r.passed).length;
  if (failed > 0) {
    console.error(`\n⚠️  ${failed} test(s) failed`);
    process.exit(1);
  }

  console.log("\n✨ All tests passed!");
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
