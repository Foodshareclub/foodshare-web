/**
 * Migrate Remaining 3 Firebase Avatars to Supabase
 *
 * Handles:
 * 1. 2 Flutterflow bucket avatars (permission issues)
 * 2. 1 oversized avatar (>5MB)
 *
 * Features:
 * - Direct HTTPS download (no Firebase Admin SDK needed)
 * - Image compression using sharp
 * - Upload to Supabase Storage
 * - Profile URL updates
 * - Comprehensive validation
 */

import https from "https";
import http from "http";
import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing required environment variables");
  console.error("Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Users to migrate (from query results)
const USERS_TO_MIGRATE = [
  {
    supabase_id: "6d3aad89-8963-434c-9545-af5c5fe510ea",
    email: "monika.isayeva@bk.ru",
    firebase_id: "nDK5PjW7ocSEVifyxKL8LNu39it2",
    current_url:
      "https://firebasestorage.googleapis.com/v0/b/foodshare-flutterflow.appspot.com/o/users%2FnDK5PjW7ocSEVifyxKL8LNu39it2%2Fuploads%2F1635445405996331.png?alt=media&token=e894de55-4989-494c-8573-6c3d5ab2a0f8",
  },
  {
    supabase_id: "4ff9a5ab-3f4c-40ce-96c6-019512ab554d",
    email: "test@1.ru",
    firebase_id: "cuA0QqSVH8gH8Ev25LyQI7ZCeTN2",
    current_url:
      "https://firebasestorage.googleapis.com/v0/b/foodshare-flutterflow.appspot.com/o/users%2FcuA0QqSVH8gH8Ev25LyQI7ZCeTN2%2Fuploads%2F1636723735806625.jpg?alt=media&token=1b6e3b23-f178-43be-b327-0e22ffaa628a",
  },
  {
    supabase_id: "03cb8dc7-6f24-4711-baea-4d5acb22a3f2",
    email: null,
    firebase_id: "3v8GGMBERofi36rctA3IN7iLbXl2",
    current_url:
      "https://firebasestorage.googleapis.com/v0/b/foodshare-71b57.appspot.com/o/users%2F3v8GGMBERofi36rctA3IN7iLbXl2%2Fuploads%2F1641818740027661.jpg?alt=media&token=b34e728c-dab3-4640-a5ee-0690375ffa60",
  },
];

// Configuration
const TEMP_DIR = path.join(__dirname, "temp_avatars");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const COMPRESSION_QUALITY = 85;
const MAX_DIMENSION = 1024;

/**
 * Download file from URL using HTTPS
 */
async function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`  Following redirect to: ${redirectUrl}`);
        downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fssync.createWriteStream(outputPath);
      let downloadedBytes = 0;
      const totalBytes = parseInt(response.headers["content-length"] || "0", 10);

      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
          process.stdout.write(
            `\r  Downloading: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(2)}MB)`
          );
        }
      });

      response.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        if (totalBytes > 0) {
          console.log(); // New line after progress
        }
        resolve({ size: downloadedBytes, path: outputPath });
      });
    });

    request.on("error", (err) => {
      reject(new Error(`Download failed: ${err.message}`));
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Download timeout after 30 seconds"));
    });
  });
}

/**
 * Compress image to reduce file size
 */
async function compressImage(inputPath, outputPath) {
  const stats = await fs.stat(inputPath);
  const originalSize = stats.size;

  console.log(`  Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

  // Get image metadata
  const metadata = await sharp(inputPath).metadata();
  console.log(`  Original dimensions: ${metadata.width}x${metadata.height}`);

  // Compress and resize if needed
  await sharp(inputPath)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: COMPRESSION_QUALITY,
      progressive: true,
      mozjpeg: true,
    })
    .toFile(outputPath);

  const compressedStats = await fs.stat(outputPath);
  const compressedSize = compressedStats.size;
  const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);

  console.log(`  Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Size reduction: ${reduction}%`);

  // Get compressed metadata
  const compressedMetadata = await sharp(outputPath).metadata();
  console.log(`  Compressed dimensions: ${compressedMetadata.width}x${compressedMetadata.height}`);

  return {
    originalSize,
    compressedSize,
    reduction: parseFloat(reduction),
  };
}

/**
 * Upload file to Supabase Storage
 */
async function uploadToSupabase(userId, filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const filename = `avatar_${Date.now()}.jpg`;
  const uploadPath = `${userId}/${filename}`;

  console.log(`  Uploading to: avatars/${uploadPath}`);

  const { data, error } = await supabase.storage.from("avatars").upload(uploadPath, fileBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(uploadPath);

  return {
    path: uploadPath,
    url: publicUrlData.publicUrl,
  };
}

/**
 * Update profile with new avatar URL
 */
async function updateProfile(userId, avatarUrl) {
  console.log(`  Updating profile with URL: ${avatarUrl}`);

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (error) {
    throw new Error(`Profile update failed: ${error.message}`);
  }
}

/**
 * Validate avatar URL is accessible
 */
async function validateAvatarUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (response) => {
        if (response.statusCode === 200) {
          resolve({ valid: true, status: 200 });
        } else {
          resolve({ valid: false, status: response.statusCode });
        }
      })
      .on("error", () => {
        resolve({ valid: false, status: 0, error: "Network error" });
      });
  });
}

/**
 * Migrate a single user's avatar
 */
async function migrateAvatar(user, index, total) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`[${index + 1}/${total}] Migrating avatar for: ${user.email || "No email"}`);
  console.log(`  Supabase ID: ${user.supabase_id}`);
  console.log(`  Firebase ID: ${user.firebase_id}`);
  console.log(`${"=".repeat(80)}\n`);

  const result = {
    user: user.email || user.supabase_id,
    success: false,
    error: null,
    stats: {},
  };

  try {
    // Create temp directory
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // Step 1: Download original file
    console.log("Step 1: Downloading from Firebase...");
    const originalPath = path.join(TEMP_DIR, `original_${user.supabase_id}.tmp`);
    const downloadResult = await downloadFile(user.current_url, originalPath);
    result.stats.originalSize = downloadResult.size;
    console.log(`  Downloaded: ${(downloadResult.size / 1024 / 1024).toFixed(2)}MB`);

    // Step 2: Compress image
    console.log("\nStep 2: Compressing image...");
    const compressedPath = path.join(TEMP_DIR, `compressed_${user.supabase_id}.jpg`);
    const compressionResult = await compressImage(originalPath, compressedPath);
    result.stats = { ...result.stats, ...compressionResult };

    // Check if still too large
    if (compressionResult.compressedSize > MAX_FILE_SIZE) {
      throw new Error(
        `Compressed file still too large: ${(compressionResult.compressedSize / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // Step 3: Upload to Supabase
    console.log("\nStep 3: Uploading to Supabase Storage...");
    const uploadResult = await uploadToSupabase(user.supabase_id, compressedPath);
    result.stats.supabaseUrl = uploadResult.url;
    console.log(`  Upload successful!`);

    // Step 4: Update profile
    console.log("\nStep 4: Updating profile...");
    await updateProfile(user.supabase_id, uploadResult.url);
    console.log(`  Profile updated!`);

    // Step 5: Validate
    console.log("\nStep 5: Validating new URL...");
    const validation = await validateAvatarUrl(uploadResult.url);
    if (validation.valid) {
      console.log(`  Validation successful! (HTTP ${validation.status})`);
      result.success = true;
    } else {
      throw new Error(`Validation failed: HTTP ${validation.status}`);
    }

    // Cleanup temp files
    await fs.unlink(originalPath).catch(() => {});
    await fs.unlink(compressedPath).catch(() => {});

    console.log("\n✓ Migration completed successfully!");
  } catch (error) {
    console.error(`\n✗ Migration failed: ${error.message}`);
    result.error = error.message;

    // Special handling for 404 errors (Flutterflow bucket permission issues)
    if (error.message.includes("HTTP 404")) {
      console.log(
        "\nNote: This appears to be a Flutterflow bucket avatar with access restrictions."
      );
      console.log("The avatar URL will remain as-is (Firebase URL still works in production).");
    }
  }

  return result;
}

/**
 * Generate final report
 */
async function generateReport(results) {
  console.log(`\n\n${"=".repeat(80)}`);
  console.log("MIGRATION REPORT");
  console.log(`${"=".repeat(80)}\n`);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`Total users processed: ${results.length}`);
  console.log(`Successful migrations: ${successful.length}`);
  console.log(`Failed migrations: ${failed.length}`);
  console.log();

  if (successful.length > 0) {
    console.log("✓ SUCCESSFUL MIGRATIONS:");
    console.log("-".repeat(80));
    successful.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.user}`);
      console.log(`   Original size: ${(result.stats.originalSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(
        `   Compressed size: ${(result.stats.compressedSize / 1024 / 1024).toFixed(2)}MB`
      );
      console.log(`   Size reduction: ${result.stats.reduction}%`);
      console.log(`   New URL: ${result.stats.supabaseUrl}`);
      console.log();
    });
  }

  if (failed.length > 0) {
    console.log("✗ FAILED MIGRATIONS:");
    console.log("-".repeat(80));
    failed.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.user}`);
      console.log(`   Error: ${result.error}`);
      console.log();
    });
  }

  // Query final migration status
  console.log("FINAL MIGRATION STATUS:");
  console.log("-".repeat(80));

  const { data: migrationStatus, error } = await supabase.rpc("exec_sql", {
    query: `
      SELECT
        COUNT(*) as total_migrated,
        COUNT(*) FILTER (WHERE avatar_url LIKE '%supabase%') as in_supabase,
        COUNT(*) FILTER (WHERE avatar_url LIKE '%firebase%') as still_in_firebase
      FROM profiles p
      JOIN auth.users u ON p.id = u.id
      WHERE u.raw_user_meta_data->>'firebase_migrated' = 'true'
        AND p.avatar_url IS NOT NULL
        AND p.avatar_url != ''
    `,
  });

  if (!error && migrationStatus && migrationStatus.length > 0) {
    const stats = migrationStatus[0];
    console.log(`Total migrated users with avatars: ${stats.total_migrated}`);
    console.log(`Avatars in Supabase: ${stats.in_supabase}`);
    console.log(`Avatars still in Firebase: ${stats.still_in_firebase}`);

    if (stats.still_in_firebase === 0) {
      console.log("\n🎉 ALL AVATARS SUCCESSFULLY MIGRATED TO SUPABASE! 🎉");
    }
  }

  console.log(`\n${"=".repeat(80)}\n`);

  // Cleanup temp directory
  try {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    console.log("Temporary files cleaned up.");
  } catch (err) {
    console.log("Note: Could not clean up temporary files:", err.message);
  }

  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log("Firebase Avatar Migration Tool");
  console.log("Migrating 3 remaining avatars to Supabase Storage\n");

  const results = [];

  for (let i = 0; i < USERS_TO_MIGRATE.length; i++) {
    const user = USERS_TO_MIGRATE[i];
    const result = await migrateAvatar(user, i, USERS_TO_MIGRATE.length);
    results.push(result);

    // Small delay between migrations
    if (i < USERS_TO_MIGRATE.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const summary = await generateReport(results);

  // Exit with appropriate code
  process.exit(summary.failed > 0 ? 1 : 0);
}

// Run the migration
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
