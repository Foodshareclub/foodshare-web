#!/usr/bin/env tsx
/**
 * Sync Translations to Database
 *
 * This script syncs compiled translation messages from .po files to the Supabase database
 * for use by the localization edge function and cross-platform apps.
 *
 * Usage:
 *   bun run sync-translations
 *   tsx scripts/sync-translations-to-db.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

// Configuration
const LOCALES_DIR = join(process.cwd(), "src/locales");
const SUPPORTED_LOCALES = [
  "en",
  "cs",
  "de",
  "es",
  "fr",
  "pt",
  "ru",
  "uk",
  "zh",
  "hi",
  "ar",
  "it",
  "pl",
  "nl",
  "ja",
  "ko",
  "tr",
];

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase configuration");
  console.error("   Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Load messages from compiled .mjs file
 */
function loadMessages(locale: string): Record<string, string> | null {
  const messagesPath = join(LOCALES_DIR, locale, "messages.mjs");

  if (!existsSync(messagesPath)) {
    console.warn(`⚠️  Messages file not found: ${messagesPath}`);
    return null;
  }

  try {
    // Read the .mjs file
    const content = readFileSync(messagesPath, "utf-8");

    // Extract the messages object using regex
    // Format: export const messages = { ... };
    const match = content.match(/export\s+const\s+messages\s*=\s*({[\s\S]*?});/);

    if (!match) {
      console.warn(`⚠️  Could not parse messages from: ${messagesPath}`);
      return null;
    }

    // Use eval to parse the object (safe since we control the source)
     
    const messages = eval(`(${match[1]})`);

    return messages;
  } catch (error) {
    console.error(`❌ Error loading messages for ${locale}:`, error);
    return null;
  }
}

/**
 * Get current version from package.json
 */
function getVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf-8"));
    return packageJson.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Sync translations to database
 */
async function syncTranslations() {
  console.log("🌍 Syncing translations to database...\n");

  const version = getVersion();
  const timestamp = new Date().toISOString();

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const locale of SUPPORTED_LOCALES) {
    try {
      console.log(`📦 Processing ${locale}...`);

      // Load messages
      const messages = loadMessages(locale);

      if (!messages) {
        console.log(`   ⏭️  Skipped (no messages file)\n`);
        skippedCount++;
        continue;
      }

      const messageCount = Object.keys(messages).length;
      console.log(`   📝 Found ${messageCount} messages`);

      // Upsert to database
      const { error } = await supabase.from("translations").upsert(
        {
          locale,
          messages,
          version,
          updated_at: timestamp,
        },
        {
          onConflict: "locale",
        }
      );

      if (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;
        continue;
      }

      console.log(`   ✅ Synced successfully\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Unexpected error:`, error, "\n");
      errorCount++;
    }
  }

  // Summary
  console.log("━".repeat(60));
  console.log("📊 Sync Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors:  ${errorCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   📦 Total:   ${SUPPORTED_LOCALES.length}`);
  console.log(`   🏷️  Version: ${version}`);
  console.log("━".repeat(60));

  if (errorCount > 0) {
    console.error("\n⚠️  Some translations failed to sync. Check errors above.");
    process.exit(1);
  }

  console.log("\n✨ All translations synced successfully!");
}

/**
 * Verify database schema
 */
async function verifySchema() {
  console.log("🔍 Verifying database schema...\n");

  try {
    // Check if translations table exists
    const { data, error } = await supabase.from("translations").select("id").limit(1);

    if (error) {
      console.error("❌ Database schema verification failed:");
      console.error(`   ${error.message}`);
      console.error("\n💡 Make sure the translations table exists:");
      console.error(`
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale VARCHAR UNIQUE NOT NULL,
  messages JSONB NOT NULL DEFAULT '{}',
  version VARCHAR NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translations_locale ON translations(locale);
      `);
      process.exit(1);
    }

    console.log("✅ Database schema verified\n");
  } catch (error) {
    console.error("❌ Unexpected error during schema verification:", error);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Translation Database Sync Tool                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  await verifySchema();
  await syncTranslations();
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
