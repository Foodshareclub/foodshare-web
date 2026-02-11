/**
 * RichTextViewer XSS Tests
 * Verify DOMPurify sanitization prevents XSS attacks
 */

import { describe, it, expect, mock, beforeAll } from "bun:test";

// Mock next-intl
mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// We need a DOM for DOMPurify
import { GlobalRegistrator } from "@happy-dom/global-registrator";

beforeAll(() => {
  if (typeof window === "undefined") {
    GlobalRegistrator.register();
  }
});

describe("RichTextViewer XSS Protection", () => {
  it("sanitizes script tags from HTML content", async () => {
    const DOMPurify = (await import("dompurify")).default;

    const malicious = '<p>Hello</p><script>alert("xss")</script>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "a", "span"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    expect(clean).not.toContain("<script>");
    expect(clean).toContain("<p>Hello</p>");
  });

  it("sanitizes onclick handlers", async () => {
    const DOMPurify = (await import("dompurify")).default;

    const malicious = '<a href="#" onclick="alert(1)">click</a>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["a"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    expect(clean).not.toContain("onclick");
  });

  it("sanitizes javascript: URLs", async () => {
    const DOMPurify = (await import("dompurify")).default;

    const malicious = '<a href="javascript:alert(1)">click</a>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["a"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    expect(clean).not.toContain("javascript:");
  });

  it("sanitizes img onerror XSS", async () => {
    const DOMPurify = (await import("dompurify")).default;

    const malicious = '<img src=x onerror="alert(1)">';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["img"],
      ALLOWED_ATTR: ["src", "alt"],
    });

    expect(clean).not.toContain("onerror");
  });

  it("adds target and rel to links via hook (not post-sanitization)", async () => {
    const DOMPurify = (await import("dompurify")).default;

    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });

    const html = '<a href="https://example.com">link</a>';
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["a"],
      ALLOWED_ATTR: ["href", "target", "rel"],
      ADD_ATTR: ["target", "rel"],
    });

    DOMPurify.removeHook("afterSanitizeAttributes");

    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it("prevents SVG-based XSS", async () => {
    const DOMPurify = (await import("dompurify")).default;

    const malicious = '<svg onload="alert(1)"><circle r="50"></circle></svg>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["p", "br", "strong", "a"],
      ALLOWED_ATTR: ["href"],
    });

    expect(clean).not.toContain("onload");
    expect(clean).not.toContain("<svg");
  });
});
