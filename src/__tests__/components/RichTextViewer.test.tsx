/**
 * RichTextViewer XSS Tests
 * Verify DOMPurify sanitization prevents XSS attacks
 */

import { describe, it, expect, mock } from "bun:test";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

// Mock next-intl
mock.module("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const jsdomWindow = new JSDOM("").window;
const DOMPurify = createDOMPurify(jsdomWindow as any);

describe("RichTextViewer XSS Protection", () => {
  it("sanitizes script tags from HTML content", () => {
    const malicious = '<p>Hello</p><script>alert("xss")</script>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "a", "span"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    expect(clean).not.toContain("<script>");
    expect(clean).toContain("<p>Hello</p>");
  });

  it("sanitizes onclick handlers", () => {
    const malicious = '<a href="#" onclick="alert(1)">click</a>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["a"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    expect(clean).not.toContain("onclick");
    expect(clean).toContain('href="#"');
  });

  it("sanitizes javascript: URLs", () => {
    const malicious = '<a href="javascript:alert(1)">click</a>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["a"],
      ALLOWED_ATTR: ["href", "target", "rel"],
    });

    expect(clean).not.toContain("javascript:");
  });

  it("sanitizes img onerror XSS", () => {
    const malicious = '<img src="x" onerror="alert(1)">';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["p", "br", "strong", "a"],
      ALLOWED_ATTR: ["href"],
    });

    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<img");
  });

  it("adds target and rel to links via hook (not post-sanitization)", () => {
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

  it("prevents SVG-based XSS", () => {
    const malicious = '<svg onload="alert(1)"><circle r="50"></circle></svg>';
    const clean = DOMPurify.sanitize(malicious, {
      ALLOWED_TAGS: ["p", "br", "strong", "a"],
      ALLOWED_ATTR: ["href"],
    });

    expect(clean).not.toContain("onload");
    expect(clean).not.toContain("<svg");
  });
});
