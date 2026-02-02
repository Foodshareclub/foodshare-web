"use server";

/**
 * Setup Welcome Automation Flow
 * Complete setup including template seeding and flow activation
 */

import { createClient } from "@/lib/supabase/server";
import { welcomeSeriesTemplates } from "@/lib/email/templates/welcome-series";
import { createPresetAutomation } from "./presets";
import { toggleAutomationStatus } from "./flow-crud";
import { success, error, type ActionResult } from "./types";
import { requireAuth, logAuditEvent, invalidateAutomationCache } from "./helpers";

interface SetupResult {
  templates: {
    created: number;
    updated: number;
    errors: string[];
  };
  automation: {
    id: string;
    name: string;
    status: "draft" | "active";
  };
}

/**
 * Seeds email templates and creates the welcome automation flow
 * Optionally activates the flow immediately
 */
export async function setupWelcomeAutomation(
  options: { activate?: boolean; preset?: "welcome" | "welcome_with_testers" } = {}
): Promise<ActionResult<SetupResult>> {
  const { activate = false, preset = "welcome_with_testers" } = options;

  try {
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Step 1: Seed email templates
    const templateResults = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const template of welcomeSeriesTemplates) {
      const { data: existing } = await supabase
        .from("email_templates")
        .select("id")
        .eq("slug", template.slug)
        .single();

      if (existing) {
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
          templateResults.errors.push(`${template.slug}: ${updateError.message}`);
        } else {
          templateResults.updated++;
        }
      } else {
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
          templateResults.errors.push(`${template.slug}: ${insertError.message}`);
        } else {
          templateResults.created++;
        }
      }
    }

    // Step 2: Check if automation already exists
    const { data: existingFlow } = await supabase
      .from("email_automation_flows")
      .select("id, name, status")
      .ilike("name", `%${preset === "welcome_with_testers" ? "Welcome Series + Tester" : "Welcome Series"}%`)
      .not("status", "eq", "archived")
      .single();

    let automationId: string;
    let automationName: string;
    let automationStatus: "draft" | "active" = "draft";

    if (existingFlow) {
      // Use existing flow
      automationId = existingFlow.id;
      automationName = existingFlow.name;
      automationStatus = existingFlow.status as "draft" | "active";
    } else {
      // Create new automation flow
      const createResult = await createPresetAutomation(preset);

      if (!createResult.success) {
        return error(
          `Templates seeded but automation creation failed: ${createResult.error.message}`,
          "AUTOMATION_CREATE_FAILED"
        );
      }

      automationId = createResult.data.id;
      automationName = createResult.data.name;
    }

    // Step 3: Optionally activate the flow
    if (activate && automationStatus !== "active") {
      const activateResult = await toggleAutomationStatus(automationId, "active");

      if (!activateResult.success) {
        return error(
          `Automation created but activation failed: ${activateResult.error.message}`,
          "ACTIVATION_FAILED"
        );
      }

      automationStatus = "active";
    }

    await logAuditEvent(supabase, user.id, "SETUP_WELCOME_FLOW", "automation", automationId, {
      preset,
      templatesCreated: templateResults.created,
      templatesUpdated: templateResults.updated,
      activated: activate,
    });

    invalidateAutomationCache();

    return success({
      templates: templateResults,
      automation: {
        id: automationId,
        name: automationName,
        status: automationStatus,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in setupWelcomeAutomation:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

/**
 * Quick setup: Seeds templates, creates flow, and activates it
 */
export async function quickSetupWelcomeAutomation(): Promise<ActionResult<SetupResult>> {
  return setupWelcomeAutomation({ activate: true, preset: "welcome_with_testers" });
}

/**
 * Check the current state of the welcome automation setup
 */
export async function checkWelcomeAutomationStatus(): Promise<
  ActionResult<{
    templatesReady: boolean;
    templateStatus: { slug: string; exists: boolean }[];
    automationExists: boolean;
    automationStatus: string | null;
    automationId: string | null;
  }>
> {
  try {
    const supabase = await createClient();

    // Check templates
    const { data: templates } = await supabase
      .from("email_templates")
      .select("slug")
      .in(
        "slug",
        welcomeSeriesTemplates.map((t) => t.slug)
      );

    const existingSlugs = new Set(templates?.map((t) => t.slug) || []);
    const templateStatus = welcomeSeriesTemplates.map((t) => ({
      slug: t.slug,
      exists: existingSlugs.has(t.slug),
    }));
    const templatesReady = templateStatus.every((t) => t.exists);

    // Check automation
    const { data: automation } = await supabase
      .from("email_automation_flows")
      .select("id, status")
      .or("name.ilike.%Welcome Series + Tester%,name.eq.Welcome Series")
      .not("status", "eq", "archived")
      .single();

    return success({
      templatesReady,
      templateStatus,
      automationExists: !!automation,
      automationStatus: automation?.status || null,
      automationId: automation?.id || null,
    });
  } catch (err) {
    console.error("Error checking welcome automation status:", err);
    return error("Failed to check status", "INTERNAL_ERROR");
  }
}
