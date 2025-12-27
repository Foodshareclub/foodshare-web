"use server";

/**
 * Email Template Management
 * Save and delete email templates
 */

import { z } from "zod";
import { EmailTemplateSchema } from "./schemas";
import { success, error, type ActionResult } from "./types";
import { requireAuth, logAuditEvent, invalidateAutomationCache } from "./helpers";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Email Template Management
// ============================================================================

export async function saveEmailTemplate(
  input: z.infer<typeof EmailTemplateSchema>
): Promise<ActionResult<{ id: string; slug: string }>> {
  try {
    const validated = EmailTemplateSchema.safeParse(input);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return error(firstError.message, "VALIDATION_ERROR", firstError.path.join("."));
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("email_templates")
      .select("id")
      .eq("slug", validated.data.slug)
      .neq("id", validated.data.id || "00000000-0000-0000-0000-000000000000")
      .single();

    if (existing) {
      return error("A template with this slug already exists", "DUPLICATE_SLUG", "slug");
    }

    if (validated.data.id) {
      // Update existing
      const { data: updated, error: dbError } = await supabase
        .from("email_templates")
        .update({
          name: validated.data.name,
          slug: validated.data.slug,
          subject: validated.data.subject,
          html_content: validated.data.html_content,
          plain_text_content: validated.data.plain_text_content || null,
          category: validated.data.category || "automation",
          variables: validated.data.variables || [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.data.id)
        .select("id, slug")
        .single();

      if (dbError) {
        return error("Failed to update template", "DB_ERROR");
      }

      await logAuditEvent(supabase, user.id, "UPDATE", "email_template", updated.id);
      invalidateAutomationCache();
      return success({ id: updated.id, slug: updated.slug });
    } else {
      // Create new
      const { data: created, error: dbError } = await supabase
        .from("email_templates")
        .insert({
          name: validated.data.name,
          slug: validated.data.slug,
          subject: validated.data.subject,
          html_content: validated.data.html_content,
          plain_text_content: validated.data.plain_text_content || null,
          category: validated.data.category || "automation",
          variables: validated.data.variables || [],
          created_by: user.id,
        })
        .select("id, slug")
        .single();

      if (dbError) {
        return error("Failed to create template", "DB_ERROR");
      }

      await logAuditEvent(supabase, user.id, "CREATE", "email_template", created.id);
      invalidateAutomationCache();
      return success({ id: created.id, slug: created.slug });
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in saveEmailTemplate:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}

export async function deleteEmailTemplate(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id || !z.string().uuid().safeParse(id).success) {
      return error("Invalid template ID", "INVALID_ID");
    }

    const supabase = await createClient();
    const user = await requireAuth(supabase);

    // Check if template is in use
    const { data: flows } = await supabase
      .from("email_automation_flows")
      .select("id, name")
      .contains("steps", [{ template_slug: id }]);

    if (flows && flows.length > 0) {
      return error(
        `Template is used by ${flows.length} automation(s). Remove references first.`,
        "IN_USE"
      );
    }

    const { error: dbError } = await supabase.from("email_templates").delete().eq("id", id);

    if (dbError) {
      return error("Failed to delete template", "DB_ERROR");
    }

    await logAuditEvent(supabase, user.id, "DELETE", "email_template", id);
    invalidateAutomationCache();
    return success({ id });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") return error("Please sign in", "UNAUTHORIZED");
      if (err.message === "FORBIDDEN") return error("Admin access required", "FORBIDDEN");
    }
    console.error("Error in deleteEmailTemplate:", err);
    return error("An unexpected error occurred", "INTERNAL_ERROR");
  }
}
