/**
 * Verify Sentry wiring: configs, instrumentation, error boundaries,
 * env templates, and CI release tracking.
 *
 * Usage: bun scripts/verify-sentry.ts
 * Exit non-zero on any failure so CI can gate on it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
let failures = 0;

function check(label: string, ok: boolean, hint?: string) {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${hint ? ` — ${hint}` : ""}`);
  }
}

function contains(path: string, needle: string): boolean {
  const full = join(root, path);
  if (!existsSync(full)) return false;
  return readFileSync(full, "utf8").includes(needle);
}

console.log("Sentry wiring verification\n");

console.log("configs:");
check("sentry.client.config.ts exists", existsSync(join(root, "sentry.client.config.ts")));
check("sentry.server.config.ts exists", existsSync(join(root, "sentry.server.config.ts")));
check("sentry.edge.config.ts exists", existsSync(join(root, "sentry.edge.config.ts")));
check(
  "client uses NEXT_PUBLIC_SENTRY_DSN",
  contains("sentry.client.config.ts", "NEXT_PUBLIC_SENTRY_DSN")
);
check(
  "server falls back SENTRY_DSN → NEXT_PUBLIC_SENTRY_DSN",
  contains("sentry.server.config.ts", "SENTRY_DSN")
);

console.log("runtime loader:");
check(
  "instrumentation.ts registers server config",
  contains("src/instrumentation.ts", "sentry.server.config")
);
check(
  "instrumentation.ts registers edge config",
  contains("src/instrumentation.ts", "sentry.edge.config")
);
check(
  "instrumentation.ts captures request errors",
  contains("src/instrumentation.ts", "captureException")
);

console.log("error boundaries:");
check("global-error.tsx exists", existsSync(join(root, "src/app/global-error.tsx")));
check("global-error captures to Sentry", contains("src/app/global-error.tsx", "captureException"));
check("global-error offers retry via reset", contains("src/app/global-error.tsx", "reset"));
check("canonical sentry helper exists", existsSync(join(root, "src/lib/observability/sentry.ts")));
check(
  "observability barrel exports sentry helper",
  contains("src/lib/observability/index.ts", "sentry")
);
check("sentry test endpoint exists", existsSync(join(root, "src/app/api/sentry-test/route.ts")));

console.log("env templates:");
for (const f of [".env.example", ".env.local.example", ".env.production.example"]) {
  check(`${f} documents NEXT_PUBLIC_SENTRY_DSN`, contains(f, "NEXT_PUBLIC_SENTRY_DSN"));
}
check("next.config.ts wraps withSentryConfig", contains("next.config.ts", "withSentryConfig"));
check("next.config.ts sets tunnelRoute", contains("next.config.ts", "tunnelRoute"));

console.log("CI release tracking:");
check("web.yml sets SENTRY_RELEASE", contains(".github/workflows/web.yml", "SENTRY_RELEASE"));
check(
  "web.yml sets NEXT_PUBLIC_SENTRY_RELEASE",
  contains(".github/workflows/web.yml", "NEXT_PUBLIC_SENTRY_RELEASE")
);
check(
  "web.yml creates Sentry release (suspect-commits → issues/PRs)",
  contains(".github/workflows/web.yml", "getsentry/action-release")
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll Sentry checks passed.");
