/**
 * Enterprise-grade Email Template Renderer
 *
 * Features:
 * - Unified template variable substitution
 * - XSS-safe rendering with DOMPurify
 * - Sample data for preview mode
 * - Support for both Go {{ .Var }} and Mustache {{var}} syntax
 * - Type-safe template variables
 */

// DOMPurify is imported dynamically on client-side only
// Server-side sanitization uses a simple regex-based approach

// ============================================================================
// TYPES
// ============================================================================

export interface TemplateVariables {
  [key: string]: string | number | undefined;
}

export interface RenderOptions {
  /** Enable HTML sanitization (default: true for preview, false for send) */
  sanitize?: boolean;
  /** Use sample data for undefined variables (default: true for preview) */
  useSampleData?: boolean;
  /** Strip undefined variables instead of showing placeholder (default: false) */
  stripUndefined?: boolean;
}

// ============================================================================
// SAMPLE DATA FOR PREVIEWS
// ============================================================================

/**
 * Sample data for template previews
 * Used when actual data is not available
 */
export const SAMPLE_TEMPLATE_DATA: Record<string, TemplateVariables> = {
  // Common variables
  common: {
    first_name: "Sarah",
    last_name: "Johnson",
    email: "sarah@example.com",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Welcome templates
  welcome: {
    first_name: "Sarah",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Neighborhood welcome
  "welcome-neighborhood": {
    first_name: "Sarah",
    neighborhood_name: "Midtown Sacramento",
    nearby_sharers: "47",
    recent_listings: "Fresh vegetables, Homemade bread, Organic fruits",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Monthly impact digest
  "monthly-impact-digest": {
    first_name: "Sarah",
    month_name: "January",
    meals_saved: "1,247",
    co2_prevented: "3,120",
    new_neighbors: "156",
    top_sharer: "Maria G.",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Milestone celebration
  "milestone-celebration": {
    first_name: "Sarah",
    milestone_type: "meals shared",
    milestone_number: "50",
    total_meals: "50",
    total_co2: "125",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Re-engagement
  "reengagement-miss-you": {
    first_name: "Sarah",
    days_inactive: "30",
    nearby_listings: "23",
    community_meals_saved: "847",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Volunteer recruitment
  "volunteer-recruitment": {
    first_name: "Sarah",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Tester recruitment
  "tester-recruitment": {
    first_name: "Sarah",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Complete profile
  "complete-profile": {
    first_name: "Sarah",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // First share tips
  "first-share-tips": {
    first_name: "Sarah",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Community highlights
  "community-highlights": {
    first_name: "Sarah",
    unsubscribe_url: "https://foodshare.club/unsubscribe?token=preview",
  },

  // Static HTML templates (Go template syntax)
  "welcome-confirmation": {
    ConfirmationURL: "https://foodshare.club/auth/confirm?token=preview123",
  },
  "password-reset": {
    ConfirmationURL: "https://foodshare.club/auth/reset?token=preview456",
  },
  "magic-link": {
    ConfirmationURL: "https://foodshare.club/auth/magic?token=preview789",
  },
  "new-message": {
    SenderAvatar: "https://i.pravatar.cc/150?img=32",
    SenderName: "Emma Wilson",
    MessagePreview: "Hi! I'm interested in the organic vegetables you posted. Are they still available?",
    ConversationURL: "https://foodshare.club/messages/preview",
    ListingImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
    ListingTitle: "Fresh Organic Vegetables",
    ListingType: "Free",
    UnsubscribeURL: "https://foodshare.club/unsubscribe",
  },
};

// ============================================================================
// TEMPLATE RENDERING
// ============================================================================

/**
 * Get sample data for a template by slug
 */
export function getSampleData(slug: string): TemplateVariables {
  // Try exact match first
  if (SAMPLE_TEMPLATE_DATA[slug]) {
    return { ...SAMPLE_TEMPLATE_DATA.common, ...SAMPLE_TEMPLATE_DATA[slug] };
  }

  // Try partial match (e.g., "welcome" matches "welcome-neighborhood")
  for (const [key, data] of Object.entries(SAMPLE_TEMPLATE_DATA)) {
    if (slug.includes(key) || key.includes(slug)) {
      return { ...SAMPLE_TEMPLATE_DATA.common, ...data };
    }
  }

  // Return common data as fallback
  return SAMPLE_TEMPLATE_DATA.common;
}

/**
 * Replace template variables in HTML content
 *
 * Supports both syntaxes:
 * - Mustache: {{variable_name}} or {{ variable_name }}
 * - Go template: {{ .VariableName }} or {{.VariableName}}
 */
export function replaceVariables(
  html: string,
  variables: TemplateVariables,
  options: RenderOptions = {}
): string {
  const { useSampleData = false, stripUndefined = false } = options;

  let result = html;

  // Replace Mustache syntax: {{variable_name}}
  result = result.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, varName) => {
    const value = variables[varName];
    if (value !== undefined) {
      return String(value);
    }
    if (useSampleData) {
      const sampleValue = SAMPLE_TEMPLATE_DATA.common[varName];
      if (sampleValue !== undefined) return String(sampleValue);
    }
    return stripUndefined ? "" : match;
  });

  // Replace Go template syntax: {{ .VariableName }}
  result = result.replace(/\{\{\s*\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, varName) => {
    const value = variables[varName];
    if (value !== undefined) {
      return String(value);
    }
    if (useSampleData) {
      const sampleValue = SAMPLE_TEMPLATE_DATA.common[varName];
      if (sampleValue !== undefined) return String(sampleValue);
    }
    return stripUndefined ? "" : match;
  });

  return result;
}

// Allowed HTML elements for email templates
const ALLOWED_TAGS = new Set([
  "a", "b", "i", "u", "em", "strong", "p", "br", "hr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "div", "span", "img", "blockquote", "pre", "code",
  "header", "footer", "section", "article", "aside", "nav",
  "figure", "figcaption", "center", "html", "head", "body", "meta", "title", "style",
]);

// Allowed attributes for email templates
const ALLOWED_ATTR = new Set([
  "href", "src", "alt", "title", "style", "class", "id",
  "width", "height", "align", "valign", "border", "cellpadding", "cellspacing",
  "bgcolor", "color", "target", "rel", "charset", "name", "content", "http-equiv",
]);

/**
 * Sanitize HTML content for safe rendering
 * Uses DOMPurify on client, basic sanitization on server
 */
export async function sanitizeHtml(html: string): Promise<string> {
  // Client-side: use DOMPurify
  if (typeof window !== "undefined") {
    const DOMPurify = (await import("dompurify")).default;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
      ALLOWED_ATTR: Array.from(ALLOWED_ATTR),
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  }

  // Server-side: basic script tag removal (templates are trusted from DB)
  // For full server sanitization, consider using sanitize-html package
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=/gi, "data-disabled-");
}

/**
 * Synchronous sanitization for simple cases (removes scripts only)
 */
export function sanitizeHtmlSync(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=/gi, "data-disabled-");
}

/**
 * Render an email template with variables (sync version)
 */
export function renderTemplate(
  html: string,
  variables: TemplateVariables = {},
  options: RenderOptions = {}
): string {
  const { sanitize = false, useSampleData = true } = options;

  // Replace variables
  let rendered = replaceVariables(html, variables, { ...options, useSampleData });

  // Basic sanitization if requested (sync)
  if (sanitize) {
    rendered = sanitizeHtmlSync(rendered);
  }

  return rendered;
}

/**
 * Render an email template with full async sanitization
 */
export async function renderTemplateAsync(
  html: string,
  variables: TemplateVariables = {},
  options: RenderOptions = {}
): Promise<string> {
  const { sanitize = true, useSampleData = true } = options;

  // Replace variables
  let rendered = replaceVariables(html, variables, { ...options, useSampleData });

  // Full sanitization if requested
  if (sanitize) {
    rendered = await sanitizeHtml(rendered);
  }

  return rendered;
}

/**
 * Render a template for preview with sample data (sync)
 */
export function renderTemplatePreview(html: string, slug: string): string {
  const sampleData = getSampleData(slug);
  return renderTemplate(html, sampleData, {
    sanitize: true,
    useSampleData: true,
    stripUndefined: false,
  });
}

/**
 * Render a template for sending (no sanitization, strip undefined)
 */
export function renderTemplateForSend(
  html: string,
  variables: TemplateVariables
): string {
  return renderTemplate(html, variables, {
    sanitize: false,
    useSampleData: false,
    stripUndefined: true,
  });
}

// ============================================================================
// IFRAME SECURITY
// ============================================================================

/**
 * Generate sandbox attributes for secure iframe rendering
 */
export function getIframeSandboxAttributes(): string {
  return "allow-same-origin"; // Minimal permissions for email preview
}

/**
 * Generate Content Security Policy for email preview iframe
 */
export function getIframeCSP(): string {
  return [
    "default-src 'none'",
    "img-src https: data:",
    "style-src 'unsafe-inline'",
    "font-src https:",
  ].join("; ");
}

/**
 * Wrap HTML in a secure iframe-ready document
 */
export function wrapForSecurePreview(html: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="${getIframeCSP()}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
  `.trim();
}
