#!/usr/bin/env bun
// Daily Upstash request-budget guard (task 23.1).
//
// Reads the production Redis database's monthly request count from the
// Upstash Developer API and emits a GitHub Actions warning above 70% of the
// free-tier allowance (500,000 requests a month). It never fails the run:
// the app already degrades on its own when the quota is gone, and this is the
// early notice.
//
// Secrets (names only; the values are never printed):
//   UPSTASH_EMAIL    Upstash account email
//   UPSTASH_API_KEY  Upstash Developer API key (console -> Account -> Management API)
// Optional:
//   UPSTASH_REDIS_DATABASE_ID     skip the lookup by name
//   UPSTASH_REDIS_DATABASE_NAME   default foodshare-production-rate-limit
//   UPSTASH_MONTHLY_REQUEST_LIMIT default 500000
//   UPSTASH_BUDGET_WARN_PERCENT   default 70
//
// Usage: bun scripts/upstash-budget-guard.ts
import { checkUpstashBudget } from "../src/lib/upstash/budget";

function numberEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function summary(line: string): Promise<void> {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const file = Bun.file(path);
  const existing = (await file.exists()) ? await file.text() : "";
  await Bun.write(path, `${existing}${line}\n`);
}

const email = process.env.UPSTASH_EMAIL;
const apiKey = process.env.UPSTASH_API_KEY;
if (!email || !apiKey) {
  console.log(
    "::notice::Upstash budget guard skipped: set the UPSTASH_EMAIL and UPSTASH_API_KEY repository secrets to enable it.",
  );
  await summary("Upstash budget guard skipped: `UPSTASH_EMAIL` / `UPSTASH_API_KEY` secrets are not set.");
  process.exit(0);
}

try {
  const report = await checkUpstashBudget({
    email,
    apiKey,
    databaseId: process.env.UPSTASH_REDIS_DATABASE_ID || undefined,
    databaseName: process.env.UPSTASH_REDIS_DATABASE_NAME || undefined,
    monthlyLimit: numberEnv("UPSTASH_MONTHLY_REQUEST_LIMIT"),
    warnPercent: numberEnv("UPSTASH_BUDGET_WARN_PERCENT"),
  });
  const line = `Upstash Redis monthly requests: ${report.used.toLocaleString("en-US")} of ${report.limit.toLocaleString("en-US")} (${report.percent}%)`;
  if (report.level === "warn") {
    console.log(
      `::warning title=Upstash request budget::${line}, above ${report.warnPercent}%. ` +
        "The web app degrades to local fallbacks when the quota runs out.",
    );
    await summary(`:warning: ${line}, above ${report.warnPercent}%.`);
  } else {
    console.log(line);
    await summary(line);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "unknown error";
  console.log(`::warning title=Upstash request budget::Could not read Upstash stats: ${message}`);
  await summary(`Upstash budget guard could not read stats: ${message}`);
}
