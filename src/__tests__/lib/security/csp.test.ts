import { describe, expect, it } from "bun:test";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

/** Parse a policy string back into a directive -> values[] map. */
function parse(policy: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of policy.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    out[name] = values;
  }
  return out;
}

describe("buildContentSecurityPolicy", () => {
  it("produces a parseable policy", () => {
    const directives = parse(buildContentSecurityPolicy());
    expect(Object.keys(directives).length).toBeGreaterThan(10);
    for (const [name, values] of Object.entries(directives)) {
      expect(name).toMatch(/^[a-z-]+$/);
      expect(values.every((v) => v.length > 0)).toBe(true);
    }
  });

  it("locks down the directives that do not need a nonce", () => {
    const d = parse(buildContentSecurityPolicy());

    // No plugin content, no framing, no <base> hijack, no form exfiltration.
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["form-action"]).toEqual(["'self'"]);

    // The high-value defaults: everything falls back to same-origin.
    expect(d["default-src"]).toEqual(["'self'"]);
  });

  it("does not allow script from arbitrary origins or data/blob URLs", () => {
    const d = parse(buildContentSecurityPolicy());
    const scriptSrc = d["script-src"];

    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("*");
    expect(scriptSrc).not.toContain("data:");
    expect(scriptSrc).not.toContain("blob:");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("allows unsafe-eval in development only (React Fast Refresh / HMR)", () => {
    expect(parse(buildContentSecurityPolicy({ isDev: true }))["script-src"]).toContain("'unsafe-eval'");
    expect(parse(buildContentSecurityPolicy({ isDev: false }))["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("adds upgrade-insecure-requests in production only", () => {
    expect(parse(buildContentSecurityPolicy({ isDev: false }))).toHaveProperty("upgrade-insecure-requests");
    expect(parse(buildContentSecurityPolicy({ isDev: true }))).not.toHaveProperty("upgrade-insecure-requests");
  });

  it("permits the origins the app actually loads from", () => {
    const d = parse(buildContentSecurityPolicy());

    // Supabase REST + realtime (20 client-side channel subscriptions).
    expect(d["connect-src"]).toContain("https://*.supabase.co");
    expect(d["connect-src"]).toContain("wss://*.supabase.co");
    // Leaflet geocoding.
    expect(d["connect-src"]).toContain("https://nominatim.openstreetmap.org");
    // Map tiles.
    expect(d["img-src"]).toContain("https://*.basemaps.cartocdn.com");
    // Image upload previews and in-place file reads.
    expect(d["img-src"]).toContain("blob:");
    expect(d["img-src"]).toContain("data:");
    // The only third-party frames in the app are srcDoc previews.
    expect(d["frame-src"]).toEqual(["'self'"]);
  });

  it("derives Supabase origins from the configured project URL", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://api.foodshare.club";
    try {
      const connect = parse(buildContentSecurityPolicy())["connect-src"];
      expect(connect).toContain("https://api.foodshare.club");
      expect(connect).toContain("wss://api.foodshare.club");
      const images = parse(buildContentSecurityPolicy())["img-src"];
      expect(images).toContain("https://api.foodshare.club");
      expect(images).toContain("https://*.supabase.co");
      expect(images).not.toContain("wss://api.foodshare.club");
    } finally {
      if (previous === undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it("survives an unparseable project URL", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    try {
      const connect = parse(buildContentSecurityPolicy())["connect-src"];
      expect(connect).toContain("https://*.supabase.co");
    } finally {
      if (previous === undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
    }
  });

  it("honours extra sources without letting them widen other directives", () => {
    const d = parse(
      buildContentSecurityPolicy({
        extraConnectSources: ["https://errors.example.com"],
        extraImageSources: ["https://cdn.example.com"],
      }),
    );

    expect(d["connect-src"]).toContain("https://errors.example.com");
    expect(d["img-src"]).toContain("https://cdn.example.com");
    expect(d["script-src"]).not.toContain("https://errors.example.com");
    expect(d["frame-src"]).toEqual(["'self'"]);
  });

  it("is stable across calls (no duplicated or drifting directives)", () => {
    expect(buildContentSecurityPolicy()).toBe(buildContentSecurityPolicy());
  });
});
