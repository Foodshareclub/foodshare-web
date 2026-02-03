/**
 * Email Template Hooks - Cross-Platform Email Template Management
 *
 * These hooks integrate with the api-v1-email-template Edge Function
 * to provide unified access to database-driven email templates.
 *
 * @example
 * ```tsx
 * // List all templates
 * const { data: templates, isLoading } = useEmailTemplates();
 *
 * // List templates by category
 * const { data: marketingTemplates } = useEmailTemplates('marketing');
 *
 * // Get a specific template
 * const { data: template } = useEmailTemplate('welcome');
 *
 * // Render a template with variables
 * const renderMutation = useRenderTemplate();
 * const rendered = await renderMutation.mutateAsync({
 *   slug: 'welcome',
 *   variables: { name: 'John' }
 * });
 *
 * // Send an email using a template
 * const sendMutation = useSendTemplateEmail();
 * await sendMutation.mutateAsync({
 *   slug: 'welcome',
 *   variables: { name: 'John' },
 *   to: 'john@example.com'
 * });
 * ```
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ============================================================================
// Types
// ============================================================================

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "url";
  required: boolean;
  default?: unknown;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  subject: string;
  html_content?: string;
  text_content?: string | null;
  variables: TemplateVariable[];
  metadata: Record<string, unknown>;
  version: number;
  updated_at?: string;
}

export interface RenderTemplateParams {
  slug: string;
  variables: Record<string, unknown>;
  format?: "html" | "text" | "both";
}

export interface RenderedEmail {
  subject: string;
  html?: string;
  text?: string;
  templateVersion: number;
}

export interface SendTemplateEmailParams {
  slug: string;
  variables: Record<string, unknown>;
  to: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  emailType?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
  templateVersion: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const emailTemplateKeys = {
  all: ["email-templates"] as const,
  lists: () => [...emailTemplateKeys.all, "list"] as const,
  list: (category?: string) => [...emailTemplateKeys.lists(), category ?? "all"] as const,
  details: () => [...emailTemplateKeys.all, "detail"] as const,
  detail: (slug: string) => [...emailTemplateKeys.details(), slug] as const,
};

// ============================================================================
// Edge Function Helpers
// ============================================================================

const EDGE_FUNCTION_NAME = "api-v1-email-template";

async function invokeEdgeFunction<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown
): Promise<T> {
  // Build the full URL for the edge function
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all email templates, optionally filtered by category
 */
export function useEmailTemplates(category?: string) {
  return useQuery({
    queryKey: emailTemplateKeys.list(category),
    queryFn: async () => {
      const path = category ? `/templates?category=${category}` : "/templates";
      const result = await invokeEdgeFunction<{
        success: boolean;
        templates: EmailTemplate[];
        count: number;
      }>(path);
      return result.templates;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
  });
}

/**
 * Fetch a single email template by slug
 */
export function useEmailTemplate(slug: string) {
  return useQuery({
    queryKey: emailTemplateKeys.detail(slug),
    queryFn: async () => {
      const result = await invokeEdgeFunction<{
        success: boolean;
        template: EmailTemplate;
      }>(`/templates/${slug}`);
      return result.template;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Render a template with variables
 * Returns the rendered subject, HTML, and text content
 */
export function useRenderTemplate() {
  return useMutation({
    mutationFn: async (params: RenderTemplateParams) => {
      const result = await invokeEdgeFunction<{ success: boolean } & RenderedEmail>(
        "/render",
        "POST",
        params
      );
      return result;
    },
  });
}

/**
 * Send an email using a database template
 * Renders the template and sends it via the email service
 */
export function useSendTemplateEmail() {
  return useMutation({
    mutationFn: async (params: SendTemplateEmailParams) => {
      const result = await invokeEdgeFunction<SendEmailResult>("/send", "POST", params);
      return result;
    },
  });
}

/**
 * Invalidate template cache
 * Call this after creating or updating templates
 */
export function useInvalidateTemplates() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.all });
    },
    invalidateList: (category?: string) => {
      queryClient.invalidateQueries({
        queryKey: emailTemplateKeys.list(category),
      });
    },
    invalidateTemplate: (slug: string) => {
      queryClient.invalidateQueries({
        queryKey: emailTemplateKeys.detail(slug),
      });
    },
  };
}

/**
 * Prefetch templates for better UX
 * Call this in layout or parent components to preload data
 */
export function usePrefetchTemplates() {
  const queryClient = useQueryClient();

  return {
    prefetchAll: () => {
      return queryClient.prefetchQuery({
        queryKey: emailTemplateKeys.list(),
        queryFn: async () => {
          const result = await invokeEdgeFunction<{
            success: boolean;
            templates: EmailTemplate[];
          }>("/templates");
          return result.templates;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    prefetchTemplate: (slug: string) => {
      return queryClient.prefetchQuery({
        queryKey: emailTemplateKeys.detail(slug),
        queryFn: async () => {
          const result = await invokeEdgeFunction<{
            success: boolean;
            template: EmailTemplate;
          }>(`/templates/${slug}`);
          return result.template;
        },
        staleTime: 5 * 60 * 1000,
      });
    },
  };
}

// ============================================================================
// Template Categories
// ============================================================================

export const TEMPLATE_CATEGORIES = [
  { value: "transactional", label: "Transactional", description: "Auth, notifications, alerts" },
  { value: "marketing", label: "Marketing", description: "Promotions, newsletters" },
  { value: "digest", label: "Digest", description: "Weekly/monthly summaries" },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["value"];
