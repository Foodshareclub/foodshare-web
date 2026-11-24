/**
 * Email Provider Tests
 *
 * Tests for _shared/email/email-service.ts
 * Tests provider selection, health checks, and circuit breaker integration.
 */

import { assertEquals, assertExists } from "@std/assert";
import type {
  EmailProvider,
  EmailProviderName,
  ProviderHealth,
  SendEmailParams,
  SendEmailResult,
} from "../_shared/email/types.ts";

// =============================================================================
// Mock Email Provider
// =============================================================================

class MockEmailProvider implements EmailProvider {
  readonly name: EmailProviderName;
  private _configured: boolean;
  private _shouldFail: boolean;
  private _failMessage: string;
  sendCount = 0;

  constructor(
    name: EmailProviderName,
    options: {
      configured?: boolean;
      shouldFail?: boolean;
      failMessage?: string;
    } = {},
  ) {
    this.name = name;
    this._configured = options.configured ?? true;
    this._shouldFail = options.shouldFail ?? false;
    this._failMessage = options.failMessage ?? "Provider error";
  }

  isConfigured(): boolean {
    return this._configured;
  }

  async sendEmail(_params: SendEmailParams): Promise<SendEmailResult> {
    this.sendCount++;
    if (this._shouldFail) {
      return {
        success: false,
        provider: this.name,
        error: this._failMessage,
        latencyMs: 50,
        timestamp: Date.now(),
      };
    }
    return {
      success: true,
      provider: this.name,
      messageId: `msg_${this.name}_${this.sendCount}`,
      latencyMs: 100,
      timestamp: Date.now(),
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    return {
      provider: this.name,
      status: this._configured ? (this._shouldFail ? "error" : "ok") : "unconfigured",
      healthScore: this._shouldFail ? 0 : 100,
      latencyMs: 50,
      message: this._shouldFail ? this._failMessage : "OK",
      configured: this._configured,
      lastChecked: Date.now(),
    };
  }

  getDebugInfo(): Record<string, unknown> {
    return { name: this.name, configured: this._configured };
  }
}

// =============================================================================
// Provider Selection Tests
// =============================================================================

Deno.test("email: first configured provider is used", async () => {
  const providers: MockEmailProvider[] = [
    new MockEmailProvider("resend"),
    new MockEmailProvider("brevo"),
  ];

  // Simulate the service selecting first configured provider
  const priority: EmailProviderName[] = ["resend", "brevo"];
  const selected = priority.find((name) => {
    const p = providers.find((p) => p.name === name);
    return p?.isConfigured();
  });

  assertEquals(selected, "resend");

  const provider = providers.find((p) => p.name === selected)!;
  const result = await provider.sendEmail({
    to: "test@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  });

  assertEquals(result.success, true);
  assertEquals(result.provider, "resend");
  assertEquals(provider.sendCount, 1);
  assertEquals(providers[1].sendCount, 0); // Brevo not called
});

Deno.test("email: skips unconfigured provider", async () => {
  const providers: MockEmailProvider[] = [
    new MockEmailProvider("resend", { configured: false }),
    new MockEmailProvider("brevo", { configured: true }),
  ];

  const priority: EmailProviderName[] = ["resend", "brevo"];
  const selected = priority.find((name) => {
    const p = providers.find((p) => p.name === name);
    return p?.isConfigured();
  });

  assertEquals(selected, "brevo");

  const provider = providers.find((p) => p.name === selected)!;
  const result = await provider.sendEmail({
    to: "test@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  });

  assertEquals(result.success, true);
  assertEquals(result.provider, "brevo");
});

// =============================================================================
// Failover Tests
// =============================================================================

Deno.test("email: first provider succeeds - no failover needed", async () => {
  const providers: MockEmailProvider[] = [
    new MockEmailProvider("resend"),
    new MockEmailProvider("brevo"),
  ];

  const result = await providers[0].sendEmail({
    to: "test@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  });

  assertEquals(result.success, true);
  assertEquals(result.provider, "resend");
  assertEquals(providers[0].sendCount, 1);
  assertEquals(providers[1].sendCount, 0);
});

Deno.test("email: first provider fails, second succeeds (failover logic)", async () => {
  const providers: MockEmailProvider[] = [
    new MockEmailProvider("resend", {
      shouldFail: true,
      failMessage: "API key expired",
    }),
    new MockEmailProvider("brevo"),
    new MockEmailProvider("mailersend"),
  ];

  // Simulate failover: try each in priority order until one succeeds
  const params: SendEmailParams = {
    to: "test@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  };

  let finalResult: SendEmailResult | null = null;
  for (const provider of providers) {
    if (!provider.isConfigured()) continue;
    const result = await provider.sendEmail(params);
    if (result.success) {
      finalResult = result;
      break;
    }
  }

  assertExists(finalResult);
  assertEquals(finalResult!.success, true);
  assertEquals(finalResult!.provider, "brevo");
  assertEquals(providers[0].sendCount, 1); // Resend tried but failed
  assertEquals(providers[1].sendCount, 1); // Brevo succeeded
  assertEquals(providers[2].sendCount, 0); // MailerSend not needed
});

Deno.test("email: all providers fail - returns last error", async () => {
  const providers: MockEmailProvider[] = [
    new MockEmailProvider("resend", {
      shouldFail: true,
      failMessage: "Resend down",
    }),
    new MockEmailProvider("brevo", {
      shouldFail: true,
      failMessage: "Brevo down",
    }),
    new MockEmailProvider("mailersend", {
      shouldFail: true,
      failMessage: "MailerSend down",
    }),
  ];

  const params: SendEmailParams = {
    to: "test@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  };

  const errors: string[] = [];
  let finalResult: SendEmailResult | null = null;
  for (const provider of providers) {
    if (!provider.isConfigured()) continue;
    const result = await provider.sendEmail(params);
    if (result.success) {
      finalResult = result;
      break;
    }
    errors.push(result.error || "Unknown error");
  }

  assertEquals(finalResult, null);
  assertEquals(errors.length, 3);
  assertEquals(errors[0], "Resend down");
  assertEquals(errors[1], "Brevo down");
  assertEquals(errors[2], "MailerSend down");
});

// =============================================================================
// Health Check Tests
// =============================================================================

Deno.test("email: provider health check - healthy provider", async () => {
  const provider = new MockEmailProvider("resend");
  const health = await provider.checkHealth();

  assertEquals(health.status, "ok");
  assertEquals(health.healthScore, 100);
  assertEquals(health.configured, true);
});

Deno.test("email: provider health check - failing provider", async () => {
  const provider = new MockEmailProvider("brevo", { shouldFail: true });
  const health = await provider.checkHealth();

  assertEquals(health.status, "error");
  assertEquals(health.healthScore, 0);
});

Deno.test("email: provider health check - unconfigured provider", async () => {
  const provider = new MockEmailProvider("aws_ses", { configured: false });
  const health = await provider.checkHealth();

  assertEquals(health.status, "unconfigured");
  assertEquals(health.configured, false);
});

// =============================================================================
// Circuit Breaker Integration Logic
// =============================================================================

Deno.test("email: circuit breaker opens after threshold failures", () => {
  // Simplified circuit breaker logic test
  const threshold = 5;
  let failures = 0;
  let state: "closed" | "open" = "closed";

  function recordFailure() {
    failures++;
    if (failures >= threshold) {
      state = "open";
    }
  }

  function isAvailable(): boolean {
    return state !== "open";
  }

  // First 4 failures - still closed
  for (let i = 0; i < 4; i++) {
    recordFailure();
    assertEquals(isAvailable(), true);
  }

  // 5th failure - opens circuit
  recordFailure();
  assertEquals(isAvailable(), false);
  assertEquals(state, "open");
});

// =============================================================================
// EmailService.sendEmail — real service, injected providers (2026-11-24 regression)
// =============================================================================

import { DEFAULT_EMAIL_CONFIG } from "../_shared/email/types.ts";
import { EmailService } from "../_shared/email/email-service.ts";

const PARAMS: SendEmailParams = { to: "user@example.com", subject: "Confirm", html: "<p>x</p>" };

function service(
  providers: MockEmailProvider[],
  config: Record<string, unknown> = {},
): EmailService {
  const set: Partial<Record<EmailProviderName, MockEmailProvider>> = {};
  for (const p of providers) set[p.name] = p;
  return new EmailService(config, set);
}

Deno.test("EmailService: a dead first provider fails over to the next configured one", async () => {
  const resend = new MockEmailProvider("resend", { shouldFail: true, failMessage: "HTTP 401" });
  const ses = new MockEmailProvider("aws_ses");
  const svc = service([resend, ses], {
    providerPriority: { ...DEFAULT_EMAIL_CONFIG.providerPriority, auth: ["resend", "aws_ses"] },
  });
  const result = await svc.sendEmail(PARAMS, "auth");
  assertEquals(result.success, true);
  assertEquals(result.provider, "aws_ses");
  assertEquals(resend.sendCount, 1);
  assertEquals(ses.sendCount, 1);
});

Deno.test("EmailService: stops at the first success", async () => {
  const ses = new MockEmailProvider("aws_ses");
  const resend = new MockEmailProvider("resend");
  const svc = service([ses, resend]);
  const result = await svc.sendEmail(PARAMS, "auth");
  assertEquals(result.provider, "aws_ses");
  assertEquals(resend.sendCount, 0);
});

Deno.test("EmailService: skips unconfigured providers", async () => {
  const ses = new MockEmailProvider("aws_ses", { configured: false });
  const resend = new MockEmailProvider("resend");
  const svc = service([ses, resend]);
  const result = await svc.sendEmail(PARAMS, "auth");
  assertEquals(result.provider, "resend");
  assertEquals(ses.sendCount, 0);
});

Deno.test("EmailService: all providers fail -> failure listing every attempt", async () => {
  const svc = service([
    new MockEmailProvider("aws_ses", { shouldFail: true, failMessage: "throttled" }),
    new MockEmailProvider("resend", { shouldFail: true, failMessage: "HTTP 401" }),
  ]);
  const result = await svc.sendEmail(PARAMS, "auth");
  assertEquals(result.success, false);
  assertEquals(result.error, "All providers failed (aws_ses: throttled; resend: HTTP 401)");
});

Deno.test("EmailService: nothing configured -> 'No email provider configured'", async () => {
  const svc = service([new MockEmailProvider("aws_ses", { configured: false })]);
  const result = await svc.sendEmail(PARAMS, "auth");
  assertEquals(result.success, false);
  assertEquals(result.error, "No email provider configured");
});

Deno.test("EmailService: an open circuit is skipped while another provider is available", async () => {
  const resend = new MockEmailProvider("resend", { shouldFail: true });
  const ses = new MockEmailProvider("aws_ses");
  const svc = service([resend, ses], {
    circuitBreakerThreshold: 2,
    providerPriority: { ...DEFAULT_EMAIL_CONFIG.providerPriority, auth: ["resend", "aws_ses"] },
  });
  await svc.sendEmail(PARAMS, "auth");
  await svc.sendEmail(PARAMS, "auth"); // resend circuit now open
  await svc.sendEmail(PARAMS, "auth");
  assertEquals(resend.sendCount, 2, "open circuit must not be retried");
  assertEquals(ses.sendCount, 3);
});

Deno.test("EmailService: every circuit open -> still tries rather than refusing", async () => {
  const ses = new MockEmailProvider("aws_ses", { shouldFail: true });
  const svc = service([ses], { circuitBreakerThreshold: 1 });
  await svc.sendEmail(PARAMS, "auth");
  await svc.sendEmail(PARAMS, "auth");
  assertEquals(ses.sendCount, 2);
});

Deno.test("EmailService: SES is first for every email type by default", () => {
  for (const [type, order] of Object.entries(DEFAULT_EMAIL_CONFIG.providerPriority)) {
    assertEquals(order[0], "aws_ses", `${type} must try SES first`);
    assertEquals(new Set(order).size, 4, `${type} keeps all four providers as failover`);
  }
});
