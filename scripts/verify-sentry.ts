/**
 * Verify Sentry wiring: configs, instrumentation, error boundaries,
 * env templates, and CI release tracking.
 *
 * Usage: bun scripts/verify-sentry.ts
 * Exit non-zero on any failure so CI can gate on it.
 */
import { join } from "bun:path";

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

async function contains(path: string, needle: string): Promise<boolean> {
  const full = join(root, path);
  if (!(await Bun.file(full).exists())) return false;
  return (await Bun.file(full).text()).includes(needle);
}

/** Whether a path exists, as a promise. */
function exists(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

console.log("Sentry wiring verification\n");

console.log("configs:");
check("sentry.client.config.ts exists", await exists(join(root, "sentry.client.config.ts")));
check("sentry.server.config.ts exists", await exists(join(root, "sentry.server.config.ts")));
check("sentry.edge.config.ts exists", await exists(join(root, "sentry.edge.config.ts")));
check("client uses NEXT_PUBLIC_SENTRY_DSN", await contains("sentry.client.config.ts", "NEXT_PUBLIC_SENTRY_DSN"));
check("server falls back SENTRY_DSN → NEXT_PUBLIC_SENTRY_DSN", await contains("sentry.server.config.ts", "SENTRY_DSN"));

console.log("runtime loader:");
check("instrumentation.ts registers server config", await contains("src/instrumentation.ts", "sentry.server.config"));
check("instrumentation.ts registers edge config", await contains("src/instrumentation.ts", "sentry.edge.config"));
check("instrumentation.ts captures request errors", await contains("src/instrumentation.ts", "captureException"));

console.log("error boundaries:");
check("global-error.tsx exists", await exists(join(root, "src/app/global-error.tsx")));
check("global-error captures to Sentry", await contains("src/app/global-error.tsx", "captureException"));
check("global-error offers retry via reset", await contains("src/app/global-error.tsx", "reset"));
check("canonical sentry helper exists", await exists(join(root, "src/lib/observability/sentry.ts")));
check("observability barrel exports sentry helper", await contains("src/lib/observability/index.ts", "sentry"));
check("sentry test endpoint exists", await exists(join(root, "src/app/api/sentry-test/route.ts")));

console.log("env templates:");
for (const f of [".env.example", ".env.local.example", ".env.production.example"]) {
  check(`${f} documents NEXT_PUBLIC_SENTRY_DSN`, await contains(f, "NEXT_PUBLIC_SENTRY_DSN"));
}
check("next.config.ts wraps withSentryConfig", await contains("next.config.ts", "withSentryConfig"));
check("next.config.ts sets tunnelRoute", await contains("next.config.ts", "tunnelRoute"));

console.log("CI release tracking:");
check("web.yml sets SENTRY_RELEASE", await contains(".github/workflows/web.yml", "SENTRY_RELEASE"));
check(
  "web.yml sets NEXT_PUBLIC_SENTRY_RELEASE",
  await contains(".github/workflows/web.yml", "NEXT_PUBLIC_SENTRY_RELEASE"),
);
check(
  "web.yml creates Sentry release (suspect-commits → issues/PRs)",
  await contains(".github/workflows/web.yml", "getsentry/action-release"),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll Sentry checks passed.");
