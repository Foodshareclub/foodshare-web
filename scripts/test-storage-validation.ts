#!/usr/bin/env tsx
/**
 * Storage Validation Test Script
 *
 * Tests the storage validation system to ensure all validation
 * functions work correctly before deployment.
 */

import {
  STORAGE_BUCKETS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  validateFile,
  isValidFileType,
  isValidFileSize,
} from "../src/constants/storage";

console.log("🧪 Testing Storage Validation System...\n");

// Test 1: Bucket Constants
console.log("✅ Test 1: Bucket Constants");
const buckets = Object.keys(STORAGE_BUCKETS);
console.log(`   Found ${buckets.length} buckets:`, buckets.join(", "));
console.log("");

// Test 2: MIME Type Validation
console.log("✅ Test 2: MIME Type Validation");
const testCases = [
  { mime: "image/jpeg", bucket: "PROFILES", expected: true },
  { mime: "image/png", bucket: "PROFILES", expected: true },
  { mime: "image/webp", bucket: "PROFILES", expected: true },
  { mime: "application/pdf", bucket: "PROFILES", expected: false },
  { mime: "application/x-msdownload", bucket: "PROFILES", expected: false },
  { mime: "image/svg+xml", bucket: "FLAGS", expected: true },
  { mime: "video/mp4", bucket: "ASSETS", expected: true },
  { mime: "application/pdf", bucket: "FORUM", expected: true },
];

let mimeTestsPassed = 0;
let mimeTestsFailed = 0;

testCases.forEach(({ mime, bucket, expected }) => {
  const mockFile = { type: mime, size: 1024 } as File;
  const result = isValidFileType(mockFile, bucket as keyof typeof STORAGE_BUCKETS);
  const passed = result === expected;

  if (passed) {
    mimeTestsPassed++;
    console.log(`   ✓ ${mime} for ${bucket}: ${result} (expected ${expected})`);
  } else {
    mimeTestsFailed++;
    console.log(`   ✗ ${mime} for ${bucket}: ${result} (expected ${expected})`);
  }
});

console.log(`   Passed: ${mimeTestsPassed}/${testCases.length}`);
console.log("");

// Test 3: File Size Validation
console.log("✅ Test 3: File Size Validation");
const sizeTestCases = [
  { size: 1024 * 1024, bucket: "PROFILES", expected: true }, // 1MB
  { size: 5 * 1024 * 1024, bucket: "PROFILES", expected: true }, // 5MB
  { size: 6 * 1024 * 1024, bucket: "PROFILES", expected: false }, // 6MB (over limit)
  { size: 10 * 1024 * 1024, bucket: "POSTS", expected: true }, // 10MB
  { size: 11 * 1024 * 1024, bucket: "POSTS", expected: false }, // 11MB (over limit)
  { size: 50 * 1024 * 1024, bucket: "ASSETS", expected: true }, // 50MB
  { size: 51 * 1024 * 1024, bucket: "ASSETS", expected: false }, // 51MB (over limit)
];

let sizeTestsPassed = 0;
let sizeTestsFailed = 0;

sizeTestCases.forEach(({ size, bucket, expected }) => {
  const mockFile = { type: "image/jpeg", size } as File;
  const result = isValidFileSize(mockFile, bucket as keyof typeof STORAGE_BUCKETS);
  const passed = result === expected;
  const sizeMB = (size / (1024 * 1024)).toFixed(1);

  if (passed) {
    sizeTestsPassed++;
    console.log(`   ✓ ${sizeMB}MB for ${bucket}: ${result} (expected ${expected})`);
  } else {
    sizeTestsFailed++;
    console.log(`   ✗ ${sizeMB}MB for ${bucket}: ${result} (expected ${expected})`);
  }
});

console.log(`   Passed: ${sizeTestsPassed}/${sizeTestCases.length}`);
console.log("");

// Test 4: Full Validation Function
console.log("✅ Test 4: Full Validation Function");
const fullTestCases = [
  {
    mime: "image/jpeg",
    size: 2 * 1024 * 1024,
    bucket: "PROFILES",
    expectedValid: true,
  },
  {
    mime: "application/pdf",
    size: 1 * 1024 * 1024,
    bucket: "PROFILES",
    expectedValid: false,
    expectedError: "Invalid file type",
  },
  {
    mime: "image/jpeg",
    size: 10 * 1024 * 1024,
    bucket: "PROFILES",
    expectedValid: false,
    expectedError: "File too large",
  },
  {
    mime: "video/mp4",
    size: 20 * 1024 * 1024,
    bucket: "ASSETS",
    expectedValid: true,
  },
];

let fullTestsPassed = 0;
let fullTestsFailed = 0;

fullTestCases.forEach(({ mime, size, bucket, expectedValid, expectedError }) => {
  const mockFile = { type: mime, size } as File;
  const result = validateFile(mockFile, bucket as keyof typeof STORAGE_BUCKETS);
  const passed = result.valid === expectedValid;
  const sizeMB = (size / (1024 * 1024)).toFixed(1);

  if (passed) {
    fullTestsPassed++;
    console.log(`   ✓ ${mime} (${sizeMB}MB) for ${bucket}: ${result.valid ? "valid" : "invalid"}`);
    if (!result.valid && expectedError) {
      console.log(`     Error: ${result.error}`);
    }
  } else {
    fullTestsFailed++;
    console.log(
      `   ✗ ${mime} (${sizeMB}MB) for ${bucket}: ${result.valid ? "valid" : "invalid"} (expected ${expectedValid})`
    );
  }
});

console.log(`   Passed: ${fullTestsPassed}/${fullTestCases.length}`);
console.log("");

// Test 5: Configuration Check
console.log("✅ Test 5: Configuration Check");
console.log(`   MAX_FILE_SIZES.PROFILES: ${MAX_FILE_SIZES.PROFILES / (1024 * 1024)}MB`);
console.log(`   MAX_FILE_SIZES.ASSETS: ${MAX_FILE_SIZES.ASSETS / (1024 * 1024)}MB`);
console.log(`   ALLOWED_MIME_TYPES.PROFILES: ${ALLOWED_MIME_TYPES.PROFILES.length} types`);
console.log(`   ALLOWED_MIME_TYPES.ASSETS: ${ALLOWED_MIME_TYPES.ASSETS.length} types`);
console.log("");

// Test 6: Edge Cases
console.log("✅ Test 6: Edge Cases");
const edgeCases = [
  {
    mime: "",
    size: 1024,
    bucket: "PROFILES",
    description: "Empty MIME type",
  },
  {
    mime: "image/jpeg",
    size: 0,
    bucket: "PROFILES",
    description: "Zero file size",
  },
  {
    mime: "IMAGE/JPEG",
    size: 1024 * 1024,
    bucket: "PROFILES",
    description: "Uppercase MIME type",
  },
];

edgeCases.forEach(({ mime, size, bucket, description }) => {
  const mockFile = { type: mime, size } as File;
  const result = validateFile(mockFile, bucket as keyof typeof STORAGE_BUCKETS);
  console.log(`   ${description}: ${result.valid ? "valid" : "invalid"}`);
  if (!result.valid) {
    console.log(`     Error: ${result.error}`);
  }
});
console.log("");

// Summary
console.log("📊 Test Summary:");
const totalTests =
  mimeTestsPassed +
  mimeTestsFailed +
  sizeTestsPassed +
  sizeTestsFailed +
  fullTestsPassed +
  fullTestsFailed;
const totalPassed = mimeTestsPassed + sizeTestsPassed + fullTestsPassed;
const totalFailed = mimeTestsFailed + sizeTestsFailed + fullTestsFailed;

console.log(`   Total Tests: ${totalTests}`);
console.log(`   Passed: ${totalPassed} ✅`);
console.log(`   Failed: ${totalFailed} ${totalFailed > 0 ? "❌" : "✅"}`);
console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
console.log("");

if (totalFailed === 0) {
  console.log("🎉 All tests passed! Storage validation system is working correctly.");
  process.exit(0);
} else {
  console.log("⚠️  Some tests failed. Please review the validation logic.");
  process.exit(1);
}
