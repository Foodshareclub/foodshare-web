/**
 * Seed Email Templates API Route
 * POST /api/admin/seed-email-templates
 *
 * Seeds the welcome series email templates into the database.
 * Requires admin authentication.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { welcomeSeriesTemplates } from "@/lib/email/templates/welcome-series";

export async function POST() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!roleData) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const results: { slug: string; status: "created" | "updated" | "error"; error?: string }[] = [];

    for (const template of welcomeSeriesTemplates) {
      // Check if template exists
      const { data: existing } = await supabase
        .from("email_templates")
        .select("id")
        .eq("slug", template.slug)
        .single();

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
          results.push({ slug: template.slug, status: "error", error: updateError.message });
        } else {
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
          created_by: user.id,
        });

        if (insertError) {
          results.push({ slug: template.slug, status: "error", error: insertError.message });
        } else {
          results.push({ slug: template.slug, status: "created" });
        }
      }
    }

    const created = results.filter((r) => r.status === "created").length;
    const updated = results.filter((r) => r.status === "updated").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: true,
      message: `Seeded ${created} new templates, updated ${updated} existing${errors > 0 ? `, ${errors} errors` : ""}`,
      results,
    });
  } catch (error) {
    console.error("Error seeding email templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint to check template status
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get existing templates
    const { data: templates, error } = await supabase
      .from("email_templates")
      .select("slug, name, updated_at")
      .in(
        "slug",
        welcomeSeriesTemplates.map((t) => t.slug)
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const existingSlugs = new Set(templates?.map((t) => t.slug) || []);
    const status = welcomeSeriesTemplates.map((t) => ({
      slug: t.slug,
      name: t.name,
      exists: existingSlugs.has(t.slug),
      updatedAt: templates?.find((et) => et.slug === t.slug)?.updated_at,
    }));

    return NextResponse.json({
      total: welcomeSeriesTemplates.length,
      existing: templates?.length || 0,
      missing: welcomeSeriesTemplates.length - (templates?.length || 0),
      templates: status,
    });
  } catch (error) {
    console.error("Error checking templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
