#!/usr/bin/env bun
/**
 * Seed Email Templates Script
 * Run: bun scripts/seed-email-templates.ts
 *
 * Seeds all email templates from welcome-series.ts into the database.
 * Uses service role key to bypass RLS.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { welcomeSeriesTemplates } from "../src/lib/email/templates/welcome-series";

// Load environment variables
config({ path: ".env" });
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "set" : "MISSING");
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "set" : "MISSING");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTemplates() {
  console.log("\n🌱 Seeding Email Templates\n");
  console.log(`Found ${welcomeSeriesTemplates.length} templates to seed\n`);

  const results: { slug: string; status: string; error?: string }[] = [];

  for (const template of welcomeSeriesTemplates) {
    process.stdout.write(`  ${template.slug}... `);

    // Check if template exists
    const { data: existing } = await supabase.from("email_templates").select("id").eq("slug", template.slug).single();

    if (existing) {
      // Update existing template
      const { error: updateError } = await supabase
        .from("email_templates")
        .update({
          name: template.name,
          subject: template.subject,
          html_content: template.html_content,
          plain_text_content: template.plain_text_content,
          category: template.category,
          variables: template.variables,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.log("❌ error");
        results.push({ slug: template.slug, status: "error", error: updateError.message });
      } else {
        console.log("✅ updated");
        results.push({ slug: template.slug, status: "updated" });
      }
    } else {
      // Create new template
      const { error: insertError } = await supabase.from("email_templates").insert({
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        html_content: template.html_content,
        plain_text_content: template.plain_text_content,
        category: template.category,
        variables: template.variables,
        is_active: true,
      });

      if (insertError) {
        console.log("❌ error");
        results.push({ slug: template.slug, status: "error", error: insertError.message });
      } else {
        console.log("✅ created");
        results.push({ slug: template.slug, status: "created" });
      }
    }
  }

  // Summary
  const created = results.filter((r) => r.status === "created").length;
  const updated = results.filter((r) => r.status === "updated").length;
  const errors = results.filter((r) => r.status === "error");

  console.log(`\n${"─".repeat(40)}`);
  console.log(`✅ Created: ${created}`);
  console.log(`🔄 Updated: ${updated}`);
  if (errors.length > 0) {
    console.log(`❌ Errors: ${errors.length}`);
    for (const e of errors) console.log(`   - ${e.slug}: ${e.error}`);
  }
  console.log(`${"─".repeat(40)}\n`);

  // Verify final count
  const { count } = await supabase.from("email_templates").select("*", { count: "exact", head: true });

  console.log(`📧 Total templates in database: ${count}\n`);
}

seedTemplates().catch(console.error);
