#!/usr/bin/env bun
/**
 * Translation Sync Script
 *
 * Syncs translation JSON files from /messages to Supabase translations table.
 * Supports delta detection, versioning, and change logging.
 *
 * Usage:
 *   bun scripts/sync-translations.ts
 *   bun scripts/sync-translations.ts --dry-run
 *   bun scripts/sync-translations.ts --locale en
 *   bun scripts/sync-translations.ts --force
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config();

// Configuration
const MESSAGES_DIR = path.join(__dirname, "../messages");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface ChangeLogEntry {
  locale: string;
  key_path: string;
  old_value: string | null;
  new_value: string | null;
  change_type: "add" | "update" | "delete";
  version: string;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const localeArg = args.find((a) => a.startsWith("--locale="))?.split("=")[1];
const verbose = args.includes("--verbose") || args.includes("-v");

function log(message: string, level: "info" | "warn" | "error" | "debug" = "info") {
  const prefix = {
    info: "ℹ️ ",
    warn: "⚠️ ",
    error: "❌",
    debug: "🔍",
  }[level];

  if (level === "debug" && !verbose) return;
  console.log(`${prefix} ${message}`);
}

function generateVersion(): string {
  const now = new Date();
  return now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function generateHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}

function computeChanges(
  oldMessages: Record<string, unknown> | null,
  newMessages: Record<string, unknown>,
  locale: string,
  version: string
): ChangeLogEntry[] {
  const changes: ChangeLogEntry[] = [];
  const oldFlat = oldMessages ? flattenObject(oldMessages) : {};
  const newFlat = flattenObject(newMessages);

  // Find additions and updates
  for (const [key, newValue] of Object.entries(newFlat)) {
    const oldValue = oldFlat[key];

    if (oldValue === undefined) {
      changes.push({
        locale,
        key_path: key,
        old_value: null,
        new_value: newValue,
        change_type: "add",
        version,
      });
    } else if (oldValue !== newValue) {
      changes.push({
        locale,
        key_path: key,
        old_value: oldValue,
        new_value: newValue,
        change_type: "update",
        version,
      });
    }
  }

  // Find deletions
  for (const [key, oldValue] of Object.entries(oldFlat)) {
    if (newFlat[key] === undefined) {
      changes.push({
        locale,
        key_path: key,
        old_value: oldValue,
        new_value: null,
        change_type: "delete",
        version,
      });
    }
  }

  return changes;
}

async function syncTranslations() {
  log("Starting translation sync...");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    log("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables", "error");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get list of JSON files
  const files = fs.readdirSync(MESSAGES_DIR).filter((f) => {
    if (!f.endsWith(".json")) return false;
    if (f.startsWith("_")) return false; // Skip helper files
    if (localeArg) return f === `${localeArg}.json`;
    return true;
  });

  log(`Found ${files.length} translation files to process`);

  // Fetch existing translations
  const { data: existingTranslations, error: fetchError } = await supabase
    .from("translations")
    .select("locale, messages, version");

  if (fetchError) {
    log(`Failed to fetch existing translations: ${fetchError.message}`, "error");
    process.exit(1);
  }

  const existingMap = new Map(existingTranslations?.map((t) => [t.locale, t]) || []);

  const version = generateVersion();
  let totalChanges = 0;
  let localesUpdated = 0;
  let localesSkipped = 0;

  for (const file of files) {
    const locale = path.basename(file, ".json");
    const filePath = path.join(MESSAGES_DIR, file);

    log(`Processing ${locale}...`, "debug");

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const messages = JSON.parse(content);
      const contentHash = generateHash(content);

      const existing = existingMap.get(locale);
      const existingHash = existing ? generateHash(JSON.stringify(existing.messages)) : null;

      // Skip if unchanged (unless force)
      if (!force && existingHash === contentHash) {
        log(`${locale}: No changes detected, skipping`, "debug");
        localesSkipped++;
        continue;
      }

      // Compute changes for logging
      const changes = computeChanges(existing?.messages || null, messages, locale, version);

      if (changes.length === 0 && !force) {
        log(`${locale}: No changes detected, skipping`, "debug");
        localesSkipped++;
        continue;
      }

      log(`${locale}: ${changes.length} changes detected`);
      totalChanges += changes.length;

      if (dryRun) {
        log(`[DRY RUN] Would update ${locale} with ${changes.length} changes`);
        changes.slice(0, 5).forEach((c) => {
          log(`  ${c.change_type}: ${c.key_path}`, "debug");
        });
        if (changes.length > 5) {
          log(`  ... and ${changes.length - 5} more`, "debug");
        }
        localesUpdated++;
        continue;
      }

      // Upsert translation
      const { error: upsertError } = await supabase.from("translations").upsert(
        {
          locale,
          messages,
          version,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "locale" }
      );

      if (upsertError) {
        log(`${locale}: Failed to upsert - ${upsertError.message}`, "error");
        continue;
      }

      // Log changes to translation_change_log
      if (changes.length > 0) {
        const { error: logError } = await supabase.from("translation_change_log").insert(changes);

        if (logError) {
          log(`${locale}: Failed to log changes - ${logError.message}`, "warn");
        }
      }

      // Create version entry
      const { error: versionError } = await supabase.from("translation_versions").insert({
        locale,
        version,
        changes: changes.reduce(
          (acc, c) => {
            acc[c.change_type] = (acc[c.change_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        previous_version: existing?.version || null,
      });

      if (versionError) {
        log(`${locale}: Failed to create version entry - ${versionError.message}`, "warn");
      }

      log(`${locale}: Updated successfully (${changes.length} changes)`);
      localesUpdated++;
    } catch (err) {
      log(`${locale}: Failed to process - ${err}`, "error");
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  log(`Sync complete!`);
  log(`  Locales updated: ${localesUpdated}`);
  log(`  Locales skipped: ${localesSkipped}`);
  log(`  Total changes: ${totalChanges}`);
  log(`  Version: ${version}`);

  if (dryRun) {
    log(`\n[DRY RUN] No changes were made to the database`);
  }
}

// Run
syncTranslations().catch((err) => {
  log(`Fatal error: ${err}`, "error");
  process.exit(1);
});
