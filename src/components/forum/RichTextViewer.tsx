"use client";

/**
 * RichTextViewer - Lightweight HTML content viewer
 * Uses DOMPurify for XSS protection instead of heavy TipTap
 */

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

type RichTextViewerProps = {
  content: string | Record<string, unknown> | null;
  className?: string;
};

// DOMPurify configuration for safe HTML rendering
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "a",
    "img",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
  // Force links to open in new tab with noopener
  ADD_ATTR: ["target", "rel"],
};

/**
 * Convert Lexical JSON state to HTML (basic implementation)
 * Falls back to empty string if parsing fails
 */
function lexicalJsonToHtml(json: Record<string, unknown>): string {
  try {
    const root = json.root as {
      children?: Array<{ type: string; children?: unknown[]; text?: string }>;
    };
    if (!root?.children) return "";

    return root.children
      .map((node) => {
        if (node.type === "paragraph") {
          const text = extractText(node.children);
          return `<p>${text}</p>`;
        }
        if (node.type === "heading") {
          const tag = (node as { tag?: string }).tag || "h2";
          const text = extractText(node.children);
          return `<${tag}>${text}</${tag}>`;
        }
        if (node.type === "list") {
          const listType = (node as { listType?: string }).listType === "number" ? "ol" : "ul";
          const items = (node.children || [])
            .map((item) => {
              const text = extractText((item as { children?: unknown[] }).children);
              return `<li>${text}</li>`;
            })
            .join("");
          return `<${listType}>${items}</${listType}>`;
        }
        if (node.type === "quote") {
          const text = extractText(node.children);
          return `<blockquote>${text}</blockquote>`;
        }
        return "";
      })
      .join("");
  } catch {
    return "";
  }
}

function extractText(children: unknown[] | undefined): string {
  if (!children) return "";
  return children
    .map((child) => {
      const c = child as {
        type?: string;
        text?: string;
        format?: number;
        url?: string;
        children?: unknown[];
      };
      if (c.type === "text") {
        let text = c.text || "";
        // Apply formatting
        if (c.format) {
          if (c.format & 1) text = `<strong>${text}</strong>`;
          if (c.format & 2) text = `<em>${text}</em>`;
          if (c.format & 4) text = `<s>${text}</s>`;
          if (c.format & 16) text = `<code>${text}</code>`;
        }
        return text;
      }
      if (c.type === "link") {
        const innerText = extractText(c.children);
        return `<a href="${c.url}" target="_blank" rel="noopener noreferrer">${innerText}</a>`;
      }
      if (c.type === "linebreak") {
        return "<br>";
      }
      return "";
    })
    .join("");
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  const sanitizedHtml = useMemo(() => {
    if (!content) return "";

    let html: string;
    if (typeof content === "string") {
      html = content;
    } else {
      // Try to convert Lexical JSON to HTML
      html = lexicalJsonToHtml(content);
    }

    // Sanitize HTML before rendering
    if (typeof window !== "undefined") {
      // Use DOMPurify hook to add target/rel during sanitization (not after)
      DOMPurify.addHook("afterSanitizeAttributes", (node) => {
        if (node.tagName === "A") {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer");
        }
      });
      const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);
      DOMPurify.removeHook("afterSanitizeAttributes");
      return clean;
    }

    return html;
  }, [content]);

  if (!content) return null;

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2",
        "prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg",
        "prose-a:text-primary prose-a:underline",
        "prose-img:rounded-lg prose-img:max-w-full",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
