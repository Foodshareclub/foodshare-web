/**
 * Secrets cache logging (t_a582e1d2): a cache hit must not log at info in
 * production — callers hit the cache every few seconds and the line flooded
 * the web host's journal. The miss path keeps its info line and the
 * no-secrets warning is preserved. Cache behavior is unchanged.
 */
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";

import { clearSecretsCache, getEmailSecrets } from "../vault";

const env = process.env as Record<string, string | undefined>;
const savedEnv = { ...env };

describe("getEmailSecrets logging", () => {
  type ConsoleSpy = { mock: { calls: unknown[][] }; mockRestore: () => void };
  let info: ConsoleSpy;
  let warn: ConsoleSpy;
  let debug: ConsoleSpy;

  beforeEach(() => {
    clearSecretsCache();
    info = spyOn(console, "info").mockImplementation(() => {});
    warn = spyOn(console, "warn").mockImplementation(() => {});
    debug = spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    info.mockRestore();
    warn.mockRestore();
    debug.mockRestore();
    for (const key of Object.keys(env)) {
      if (!(key in savedEnv)) delete env[key];
    }
    Object.assign(env, savedEnv);
    clearSecretsCache();
  });

  test("a production cache hit emits nothing; the miss logs once at info", async () => {
    env.NODE_ENV = "production";
    env.RESEND_API_KEY = "re_test_0123456789abcdef";

    const first = await getEmailSecrets();
    const second = await getEmailSecrets();
    const third = await getEmailSecrets();

    expect(second).toBe(first);
    expect(third).toBe(first);
    const lines: string[] = info.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(lines.filter((line: string) => line.includes("Using environment variables"))).toHaveLength(1);
    expect(lines.some((line: string) => line.includes("Cache hit"))).toBe(false);
    expect(debug.mock.calls.some((call: unknown[]) => String(call[0]).includes("Cache hit"))).toBe(false);
  });

  test("missing secrets still warn", async () => {
    env.NODE_ENV = "production";
    delete env.RESEND_API_KEY;
    delete env.BREVO_API_KEY;
    delete env.MAILERSEND_API_KEY;
    delete env.AWS_ACCESS_KEY_ID;

    await getEmailSecrets();

    expect(warn.mock.calls.some((call: unknown[]) => String(call[0]).includes("No secrets found"))).toBe(true);
  });
});
