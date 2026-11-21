import { assertEquals } from "@std/assert";
import { AWSSESProvider } from "../_shared/email/aws-ses-provider.ts";

const NAMES = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "AWS_SES_ACCESS_KEY_ID",
  "AWS_SES_SECRET_ACCESS_KEY",
  "AWS_SES_REGION",
];

async function withEnv(env: Record<string, string>, fn: () => Promise<void>) {
  const saved = NAMES.map((n) => [n, Deno.env.get(n)] as const);
  NAMES.forEach((n) => Deno.env.delete(n));
  Object.entries(env).forEach(([k, v]) => Deno.env.set(k, v));
  try {
    await fn();
  } finally {
    for (const [n, v] of saved) {
      if (v === undefined) Deno.env.delete(n);
      else Deno.env.set(n, v);
    }
  }
}

Deno.test("AWS_SES_* names win over the generic AWS_* placeholders", async () => {
  await withEnv({
    AWS_ACCESS_KEY_ID: "placeholder",
    AWS_SECRET_ACCESS_KEY: "placeholder",
    AWS_REGION: "eu-west-1",
    AWS_SES_ACCESS_KEY_ID: "ses-id",
    AWS_SES_SECRET_ACCESS_KEY: "ses-secret",
    AWS_SES_REGION: "us-west-2",
  }, () => {
    const cfg = (new AWSSESProvider() as unknown as {
      config: { region: string; accessKeyId: string; secretAccessKey: string };
    }).config;
    assertEquals(cfg.region, "us-west-2");
    assertEquals(cfg.accessKeyId, "ses-id");
    assertEquals(cfg.secretAccessKey, "ses-secret");
    return Promise.resolve();
  });
});

Deno.test("generic AWS_* names remain the fallback", async () => {
  await withEnv({
    AWS_ACCESS_KEY_ID: "generic-id",
    AWS_SECRET_ACCESS_KEY: "generic-secret",
    AWS_REGION: "eu-west-1",
  }, () => {
    const p = new AWSSESProvider();
    const cfg = (p as unknown as {
      config: { region: string; accessKeyId: string; secretAccessKey: string };
    }).config;
    assertEquals(cfg.region, "eu-west-1");
    assertEquals(cfg.accessKeyId, "generic-id");
    assertEquals(cfg.secretAccessKey, "generic-secret");
    assertEquals(p.isConfigured(), true);
    return Promise.resolve();
  });
});

Deno.test("health reports the AWS_SES_* names when unconfigured", async () => {
  await withEnv({}, async () => {
    const h = await new AWSSESProvider().checkHealth();
    assertEquals(h.configured, false);
    assertEquals(
      h.message,
      "Missing env vars: AWS_SES_REGION, AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY",
    );
  });
});
