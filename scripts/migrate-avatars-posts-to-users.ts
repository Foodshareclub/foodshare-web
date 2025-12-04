import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllFiles(bucket: string, prefix: string = ""): Promise<string[]> {
  const allFiles: string[] = [];

  const { data: items, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error || !items) {
    console.error(`Error listing ${prefix}:`, error);
    return allFiles;
  }

  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    // If it's a file (has an id), add it
    if (item.id) {
      allFiles.push(fullPath);
    }
    // If it's a directory (no id), recurse into it
    else if (item.name !== ".emptyFolderPlaceholder") {
      const subFiles = await listAllFiles(bucket, fullPath);
      allFiles.push(...subFiles);
    }
  }

  return allFiles;
}

async function migrateAvatarsPostsToUsers() {
  console.log("🚀 Starting migration from avatars-posts to users bucket...\n");

  try {
    // 1. List all files recursively in avatars-posts bucket
    console.log("📋 Listing all files recursively in avatars-posts bucket...");
    const files = await listAllFiles("avatars-posts");

    if (files.length === 0) {
      console.log("✅ No files found in avatars-posts bucket");
      return;
    }

    console.log(`📦 Found ${files.length} files in avatars-posts bucket\n`);

    let movedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // 2. Process each file
    for (const sourcePath of files) {
      try {
        // Download from avatars-posts
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("avatars-posts")
          .download(sourcePath);

        if (downloadError) {
          console.error(`❌ Error downloading ${sourcePath}:`, downloadError.message);
          errorCount++;
          errors.push(`Download failed: ${sourcePath}`);
          continue;
        }

        // Determine content type from file extension
        const ext = sourcePath.split(".").pop()?.toLowerCase();
        const contentTypeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          jfif: "image/jpeg",
        };
        const contentType = contentTypeMap[ext || ""] || "application/octet-stream";

        // Upload to users bucket with same path
        const { error: uploadError } = await supabase.storage
          .from("users")
          .upload(sourcePath, fileData, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`❌ Error uploading ${sourcePath}:`, uploadError.message);
          errorCount++;
          errors.push(`Upload failed: ${sourcePath}`);
          continue;
        }

        console.log(`✅ Moved: ${sourcePath}`);
        movedCount++;

        // Optional: Delete from source bucket after successful move
        // Uncomment the following lines if you want to delete after moving
        /*
        const { error: deleteError } = await supabase.storage
          .from('avatars-posts')
          .remove([sourcePath]);

        if (deleteError) {
          console.warn(`⚠️  Warning: Could not delete ${sourcePath} from source`);
        }
        */
      } catch (error) {
        console.error(`❌ Unexpected error processing ${sourcePath}:`, error);
        errorCount++;
        errors.push(`Unexpected error: ${sourcePath}`);
      }
    }

    // 3. Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Successfully moved: ${movedCount} files`);
    console.log(`❌ Errors: ${errorCount} files`);
    console.log("=".repeat(50));

    if (errors.length > 0) {
      console.log("\n❌ Error details:");
      errors.forEach((err) => console.log(`  - ${err}`));
    }

    // 4. Verify users bucket contents
    console.log("\n🔍 Verifying users bucket contents...");
    const { data: usersFiles, error: verifyError } = await supabase.storage.from("users").list("", {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

    if (verifyError) {
      console.error("❌ Error verifying users bucket:", verifyError);
    } else {
      console.log(`📦 Total files in users bucket: ${usersFiles?.length || 0}`);
    }

    console.log("\n✅ Migration complete!");
    console.log("\n⚠️  Note: Files are copied, not moved. Original files remain in avatars-posts.");
    console.log("💡 To delete originals, uncomment the delete section in the script.");
  } catch (error) {
    console.error("❌ Fatal error during migration:", error);
    process.exit(1);
  }
}

// Run the migration
migrateAvatarsPostsToUsers();
