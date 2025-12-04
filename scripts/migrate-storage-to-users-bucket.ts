/**
 * Migration Script: Move files from avatars and posts buckets to users bucket
 *
 * This script:
 * 1. Lists all files in avatars and posts buckets
 * 2. Downloads each file
 * 3. Uploads to users bucket with organized structure
 * 4. Optionally deletes from source buckets
 *
 * Run with: npx tsx scripts/migrate-storage-to-users-bucket.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from both .env and .env.local
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MigrationStats {
  totalFiles: number;
  successful: number;
  failed: number;
  errors: Array<{ file: string; error: string }>;
}

async function listAllFiles(bucketName: string, path = ""): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucketName).list(path, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    console.error(`Error listing files in ${bucketName}/${path}:`, error);
    return [];
  }

  const files: string[] = [];

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder, recurse into it
      const subFiles = await listAllFiles(bucketName, fullPath);
      files.push(...subFiles);
    } else {
      // It's a file
      files.push(fullPath);
    }
  }

  return files;
}

async function migrateFile(
  sourceBucket: string,
  sourcePath: string,
  targetBucket: string,
  targetPath: string
): Promise<boolean> {
  try {
    // Skip if path ends with / (it's a folder)
    if (sourcePath.endsWith("/")) {
      console.log(`⊘ Skipped folder: ${sourceBucket}/${sourcePath}`);
      return true;
    }

    // Download file from source bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(sourcePath);

    if (downloadError || !fileData) {
      console.error(
        `Failed to download ${sourceBucket}/${sourcePath}:`,
        downloadError?.message || "Unknown error"
      );
      return false;
    }

    // Upload to target bucket
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(targetPath, fileData, {
        contentType: fileData.type,
        upsert: true,
      });

    if (uploadError) {
      console.error(`Failed to upload to ${targetBucket}/${targetPath}:`, uploadError);
      return false;
    }

    console.log(`✓ Migrated: ${sourceBucket}/${sourcePath} → ${targetBucket}/${targetPath}`);
    return true;
  } catch (error) {
    console.error(`Error migrating ${sourceBucket}/${sourcePath}:`, error);
    return false;
  }
}

async function migrateBucket(
  sourceBucket: string,
  targetBucket: string,
  targetPrefix: string,
  deleteAfterMigration = false
): Promise<MigrationStats> {
  console.log(`\n📦 Migrating ${sourceBucket} → ${targetBucket}/${targetPrefix}`);

  const stats: MigrationStats = {
    totalFiles: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  // List all files in source bucket
  const files = await listAllFiles(sourceBucket);
  stats.totalFiles = files.length;

  console.log(`Found ${files.length} files in ${sourceBucket}`);

  // Migrate each file
  for (const file of files) {
    const targetPath = `${targetPrefix}/${file}`;
    const success = await migrateFile(sourceBucket, file, targetBucket, targetPath);

    if (success) {
      stats.successful++;

      // Delete from source if requested
      if (deleteAfterMigration) {
        const { error: deleteError } = await supabase.storage.from(sourceBucket).remove([file]);

        if (deleteError) {
          console.warn(`Warning: Failed to delete ${sourceBucket}/${file}:`, deleteError);
        }
      }
    } else {
      stats.failed++;
      stats.errors.push({ file, error: "Migration failed" });
    }
  }

  return stats;
}

async function main() {
  console.log("🚀 Starting storage migration to users bucket...\n");

  const DELETE_AFTER_MIGRATION = false; // Set to true to delete files after successful migration

  // Migrate avatars bucket
  const avatarsStats = await migrateBucket("avatars", "users", "avatars", DELETE_AFTER_MIGRATION);

  // Migrate posts bucket
  const postsStats = await migrateBucket("posts", "users", "posts", DELETE_AFTER_MIGRATION);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary");
  console.log("=".repeat(60));

  console.log("\nAvatars Bucket:");
  console.log(`  Total files: ${avatarsStats.totalFiles}`);
  console.log(`  ✓ Successful: ${avatarsStats.successful}`);
  console.log(`  ✗ Failed: ${avatarsStats.failed}`);

  console.log("\nPosts Bucket:");
  console.log(`  Total files: ${postsStats.totalFiles}`);
  console.log(`  ✓ Successful: ${postsStats.successful}`);
  console.log(`  ✗ Failed: ${postsStats.failed}`);

  const totalFiles = avatarsStats.totalFiles + postsStats.totalFiles;
  const totalSuccessful = avatarsStats.successful + postsStats.successful;
  const totalFailed = avatarsStats.failed + postsStats.failed;

  console.log("\nOverall:");
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  ✓ Successful: ${totalSuccessful}`);
  console.log(`  ✗ Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log("\n⚠️  Some files failed to migrate. Check the errors above.");
  } else {
    console.log("\n✅ All files migrated successfully!");
  }

  if (!DELETE_AFTER_MIGRATION) {
    console.log("\n💡 Files were copied, not moved. Original files remain in source buckets.");
    console.log("   Set DELETE_AFTER_MIGRATION = true to delete after migration.");
  }
}

main().catch(console.error);
