/**
 * Tailscale Webhook Handler
 *
 * Handles Tailscale tailnet management webhook events:
 * - nodeCreated, nodeDeleted, policyUpdate, user events, etc.
 * - subnetIPForwardingNotEnabled, exitNodeIPForwardingNotEnabled
 * - SSH session events
 *
 * See: https://supabase.com/docs/guides/functions/webhooks
 *
 * CRITICAL: Always returns 200 to prevent retry storms from Tailscale.
 * Webhook delivery is at-least-once, so idempotent handling is required.
 */

import { createAPIHandler, type HandlerContext } from "../_shared/api-handler.ts";
import { logger } from "../_shared/logger.ts";
import { verifyHmacSignature } from "../_shared/webhook-security.ts";

const VERSION = "1.0.0";
const SERVICE = "api-v1-tailscale-webhook";

// Tailscale webhook secret from environment or GitHub secrets
const TAILSCALE_WEBHOOK_SECRET: string | undefined = Deno.env.get("TAILSCALE_WEBHOOK_SECRET");

const TAILSCALE_AUTH_KEY: string | undefined = Deno.env.get("TAILSCALE_AUTH_KEY");

const VPS_HOST: string | undefined = Deno.env.get("VPS_HOST") || "api.foodshare.club";

// =============================================================================
// Route Handlers
// =============================================================================

async function handlePost(ctx: HandlerContext): Promise<Response> {
  const url = new URL(ctx.request.url);

  // Parse body from context
  const body = ctx.body;
  const rawBody = typeof body === "string" ? body : (body ? JSON.stringify(body) : "");

  // Log the incoming webhook event
  logger.info("Tailscale webhook received", {
    service: SERVICE,
    hostname: ctx.request.headers.get("X-Tailscale-Hostname") || "unknown",
    source: ctx.request.headers.get("X-Forwarded-For") || "unknown",
    hasSecret: !!TAILSCALE_WEBHOOK_SECRET,
    bodyType: url.searchParams.get("type") || "unknown",
  });

  // Verify webhook signature if secret is configured
  if (TAILSCALE_WEBHOOK_SECRET) {
    const signature = ctx.request.headers.get("X-Tailscale-Signature") || "";
    const valid = await verifyHmacSignature(
      rawBody,
      signature,
      TAILSCALE_WEBHOOK_SECRET,
    );

    if (!valid.valid) {
      logger.warn("Tailscale webhook signature verification failed", {
        error: valid.error,
        service: SERVICE,
      });
      // Return 200 to prevent retry storms - Tailscale delivers at-least-once
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid signature" }),
        {
          status: 200,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // Parse the event type from the body
  let event = "policyUpdate";
  if (body && typeof body === "object") {
    // deno-lint-ignore no-explicit-any
    event = (body as any)?.type || (body as any)?.event || "policyUpdate";
  } else if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      event = parsed?.type || parsed?.event || "policyUpdate";
    } catch {
      // default to policyUpdate
    }
  }

  // Handle the event based on type - all handled in try/catch to always return 200
  try {
    // Handle based on event type
    if (event === "nodeCreated") {
      // Handle node created - could trigger onboarding, ACL updates
    } else if (event === "nodeDeleted") {
      // Handle node deleted - could trigger cleanup, ACL updates
    } else if (event === "nodeKeyExpired") {
      // Handle node key expired - could trigger key rotation
    } else if (event === "nodeKeyExpiringInOneDay") {
      // Handle node key expiring in 1 day - could trigger proactive rotation
    } else if (event === "nodeApproved") {
      // Handle node approved - could trigger ACL updates
    } else if (event === "nodeNeedsSignature") {
      // Handle node needs signature - could trigger signature request
    } else if (event === "nodeSigned") {
      // Handle node signed - could trigger post-signature actions
    } else if (event === "policyUpdate") {
      // Handle policy update - most common: re-advertise routes
      // Could trigger Tailscale up command on VPS to pick up new policies
    } else if (event === "userCreated") {
      // Handle user created
    } else if (event === "userSuspended") {
      // Handle user suspended
    } else if (event === "userRestored") {
      // Handle user restored
    } else if (event === "userDeleted") {
      // Handle user deleted
    } else if (event === "userApproved") {
      // Handle user approved
    } else if (event === "userRoleUpdated") {
      // Handle user role updated
    } else if (event === "subnetIPForwardingNotEnabled") {
      // Handle subnet IP forwarding not enabled
    } else if (event === "exitNodeIPForwardingNotEnabled") {
      // Handle exit node IP forwarding not enabled
    } else if (event === "SSH_session") {
      // Handle SSH session event
    } else {
      logger.warn("Unsupported Tailscale webhook event type", { event, service: SERVICE });
    }
  } catch (error) {
    logger.error("Error handling Tailscale webhook event", {
      event,
      error: error instanceof Error ? error.message : String(error),
      service: SERVICE,
    });
  }

  // CRITICAL: Always return 200 to Tailscale to prevent retry storms
  // Tailscale webhook delivery is at-least-once, so idempotent handling is required
  return new Response(
    JSON.stringify({
      ok: true,
      event,
      timestamp: new Date().toISOString(),
      status: "processed",
    }),
    {
      status: 200,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleGet(ctx: HandlerContext): Promise<Response> {
  const url = new URL(ctx.request.url);
  const mode = url.searchParams.get("mode");

  if (mode === "health") {
    return new Response(
      JSON.stringify({
        status: "healthy",
        service: SERVICE,
        version: VERSION,
        webhookSecretConfigured: !!TAILSCALE_WEBHOOK_SECRET,
        authKeyConfigured: !!TAILSCALE_AUTH_KEY,
        vpsHost: VPS_HOST,
        events: [
          "nodeCreated",
          "nodeDeleted",
          "nodeApproved",
          "nodeKeyExpired",
          "policyUpdate",
          "userCreated",
          "userSuspended",
          "subnetIPForwardingNotEnabled",
          "exitNodeIPForwardingNotEnabled",
        ],
      }),
      {
        status: 200,
        headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // List supported events
  return new Response(
    JSON.stringify({
      service: SERVICE,
      version: VERSION,
      supportedEvents: [
        "nodeCreated",
        "nodeNeedsApproval",
        "nodeApproved",
        "nodeKeyExpiringInOneDay",
        "nodeKeyExpired",
        "nodeDeleted",
        "nodeNeedsSignature",
        "nodeSigned",
        "policyUpdate",
        "userCreated",
        "userNeedsApproval",
        "userSuspended",
        "userRestored",
        "userDeleted",
        "userApproved",
        "userRoleUpdated",
        "subnetIPForwardingNotEnabled",
        "exitNodeIPForwardingNotEnabled",
        "SSH_session",
      ],
    }),
    {
      status: 200,
      headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
    },
  );
}

// =============================================================================
// API Handler
// =============================================================================

Deno.serve(createAPIHandler({
  service: SERVICE,
  version: VERSION,
  requireAuth: false,
  csrf: false,
  rateLimit: {
    limit: 100,
    windowMs: 60_000,
    keyBy: "ip",
  },
  routes: {
    GET: { handler: handleGet, requireAuth: false },
    POST: { handler: handlePost, requireAuth: false },
  },
}));
