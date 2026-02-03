/**
 * Database Email Template Service
 *
 * Server-side service for fetching and rendering email templates from the database.
 * Integrates with the api-v1-email-template Edge Function for cross-platform consistency.
 *
 * Features:
 * - Template fetching with 5-minute caching
 * - Variable rendering with Mustache/Go syntax
 * - Fallback to React Email templates when database unavailable
 * - Type-safe variable validation
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "url";
  required: boolean;
  default?: unknown;
}

export interface DatabaseTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: TemplateVariable[];
  metadata: Record<string, unknown>;
  version: number;
  is_active: boolean;
}

export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
  templateVersion: number;
  source: "database" | "fallback";
}

// ============================================================================
// Configuration
// ============================================================================

const EDGE_FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/api-v1-email-template`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory cache for templates (server-side)
const templateCache = new Map<string, { template: DatabaseTemplate; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Template Fetching
// ============================================================================

/**
 * Fetch a template from the database by slug
 * Uses server-side caching for performance
 */
export async function fetchDatabaseTemplate(slug: string): Promise<DatabaseTemplate | null> {
  // Check cache first
  const cached = templateCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.template;
  }

  try {
    // Try Edge Function first (preferred - handles caching and validation)
    if (EDGE_FUNCTION_URL && SERVICE_ROLE_KEY) {
      const response = await fetch(`${EDGE_FUNCTION_URL}/templates/${slug}`, {
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        // Use Next.js caching
        next: { revalidate: 300 }, // 5 minutes
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.template) {
          templateCache.set(slug, {
            template: data.template,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
          return data.template;
        }
      }
    }

    // Fallback to direct database query
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.warn(`[DatabaseTemplates] Template '${slug}' not found:`, error?.message);
      return null;
    }

    const template = data as DatabaseTemplate;
    templateCache.set(slug, {
      template,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return template;
  } catch (error) {
    console.error(`[DatabaseTemplates] Failed to fetch template '${slug}':`, error);
    return null;
  }
}

/**
 * Fetch all active templates, optionally filtered by category
 */
export async function fetchAllTemplates(category?: string): Promise<DatabaseTemplate[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("email_templates")
      .select("id, slug, name, category, subject, variables, metadata, version, is_active")
      .eq("is_active", true)
      .order("name");

    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[DatabaseTemplates] Failed to fetch templates:", error.message);
      return [];
    }

    return (data ?? []) as DatabaseTemplate[];
  } catch (error) {
    console.error("[DatabaseTemplates] Failed to fetch templates:", error);
    return [];
  }
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render a template with variables
 * Supports both {{variable}} and {{ .Variable }} syntax
 */
export function renderTemplateContent(content: string, variables: Record<string, unknown>): string {
  if (!content) return "";

  let result = content;

  // Replace {{variable}} syntax (Mustache-style)
  result = result.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    const value = variables[trimmedKey];
    return value !== undefined ? String(value) : "";
  });

  // Replace {{ .Variable }} syntax (Go-style)
  result = result.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : "";
  });

  return result;
}

/**
 * Validate and apply default values for template variables
 */
export function prepareVariables(
  templateVars: TemplateVariable[],
  providedVars: Record<string, unknown>
): { variables: Record<string, unknown>; missing: string[] } {
  const variables: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const v of templateVars) {
    if (v.name in providedVars) {
      variables[v.name] = providedVars[v.name];
    } else if (v.default !== undefined) {
      variables[v.name] = v.default;
    } else if (v.required) {
      missing.push(v.name);
    }
  }

  return { variables, missing };
}

/**
 * Render a database template with variables
 * Returns null if template not found or required variables missing
 */
export async function renderDatabaseTemplate(
  slug: string,
  providedVars: Record<string, unknown>
): Promise<RenderedTemplate | null> {
  const template = await fetchDatabaseTemplate(slug);

  if (!template) {
    return null;
  }

  // Prepare variables with defaults
  const { variables, missing } = prepareVariables(template.variables || [], providedVars);

  if (missing.length > 0) {
    console.error(`[DatabaseTemplates] Missing required variables for '${slug}':`, missing);
    return null;
  }

  // Render content
  const subject = renderTemplateContent(template.subject, variables);
  const html = renderTemplateContent(template.html_content, variables);
  const text = renderTemplateContent(template.text_content || "", variables);

  return {
    subject,
    html,
    text,
    templateVersion: template.version,
    source: "database",
  };
}

// ============================================================================
// Template Slug Mapping
// ============================================================================

/**
 * Map React Email template names to database slugs
 * This enables gradual migration from hardcoded to database templates
 */
export const TEMPLATE_SLUG_MAP: Record<string, string> = {
  // Auth templates
  "welcome-confirmation": "welcome",
  "password-reset": "password-reset",
  "magic-link": "email-verification",

  // Notification templates
  "new-message": "chat-notification",
  "listing-interest": "new-listing-nearby",
  "pickup-reminder": "first-share-tips", // No direct mapping, use tips
  "review-request": "complete-profile", // No direct mapping
  "listing-expired": "reengagement",

  // Digest templates
  "weekly-digest": "community-highlights",
};

/**
 * Check if a template exists in the database
 */
export async function hasDatabaseTemplate(slug: string): Promise<boolean> {
  const template = await fetchDatabaseTemplate(slug);
  return template !== null;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the template cache
 * Call this after updating templates in the admin
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Clear a specific template from cache
 */
export function clearTemplateCacheEntry(slug: string): void {
  templateCache.delete(slug);
}

/**
 * Get cache stats for monitoring
 */
export function getTemplateCacheStats(): { size: number; entries: string[] } {
  return {
    size: templateCache.size,
    entries: Array.from(templateCache.keys()),
  };
}
