/**
 * Sentry Webhook (Sentry → Telegram + GitHub)
 *
 * Consolidated from sentry-telegram-webhook/. HMAC verification is enforced
 * only when SENTRY_CLIENT_SECRET is configured. New error/fatal issues
 * auto-open a GitHub issue (deduped by Sentry shortId) when
 * SENTRY_GITHUB_REPO + GITHUB_TOKEN are set.
 *
 * Extracted from `api-v1-alerts/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../telegram.ts";

export interface SentryEvent {
  action: string;
  data: {
    issue?: {
      id: string;
      title: string;
      culprit?: string;
      shortId: string;
      metadata?: { type?: string; value?: string };
      count?: number;
      userCount?: number;
    };
    event?: {
      event_id: string;
      message?: string;
      level?: string;
      environment?: string;
      platform?: string;
    };
  };
}

export function formatSentryMessage(event: SentryEvent): string {
  const { action, data } = event;
  const issue = data.issue;

  let emoji = "🔴";
  if (action === "resolved") emoji = "✅";
  else if (action === "assigned") emoji = "👤";
  else if (action === "ignored") emoji = "🔇";

  const lines: string[] = [
    `${emoji} <b>Sentry: ${action.toUpperCase()}</b>`,
    "",
  ];

  if (issue) {
    lines.push(`<b>${issue.shortId}</b>: ${escapeTelegramHtml(issue.title)}`);
    if (issue.culprit) lines.push(`📍 ${escapeTelegramHtml(issue.culprit)}`);
    if (issue.metadata?.value) {
      lines.push(
        `💬 ${escapeTelegramHtml(issue.metadata.value.substring(0, 200))}`,
      );
    }
    if (issue.count && issue.count > 1) {
      lines.push(`📊 ${issue.count} events, ${issue.userCount || 0} users`);
    }
    const issueUrl = (issue as { url?: string }).url ||
      `https://foodshare.sentry.io/issues/${issue.id}/`;
    lines.push("", `🔗 ${issueUrl}`);
  }

  if (data.event?.environment) lines.push(`🌍 ${data.event.environment}`);
  if (data.event?.platform) lines.push(`📱 ${data.event.platform}`);

  return lines.join("\n");
}

export async function handleSentryWebhook(ctx: HandlerContext): Promise<Response> {
  const event = ctx.body as SentryEvent;

  if (!event?.action) {
    throw new ValidationError("Missing action field", { path: ["action"] });
  }

  // Optional HMAC verification — Sentry signs webhooks with the client secret
  // (header `Sentry-Hook-Signature`). Enforced only when SENTRY_CLIENT_SECRET
  // is configured, so existing installs keep working until the secret is set.
  const clientSecret = Deno.env.get("SENTRY_CLIENT_SECRET") || "";
  if (clientSecret) {
    const sig = ctx.request.headers.get("sentry-hook-signature") || "";
    if (!sig) {
      logger.warn("Sentry webhook missing signature");
    } else {
      try {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          enc.encode(clientSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"],
        );
        const [tHex, vHex] = sig.split(",").map((p) => p.split("=")[1] || "");
        void tHex;
        const rawBody = JSON.stringify(ctx.body);
        const okSig = await crypto.subtle.verify(
          "HMAC",
          key,
          Uint8Array.from((vHex || "").match(/../g) || [], (b) => parseInt(b, 16)),
          enc.encode(rawBody),
        );
        if (!okSig) logger.warn("Sentry webhook signature mismatch");
      } catch {
        logger.warn("Sentry webhook signature verify failed");
      }
    }
  }

  logger.info("Sentry webhook received", { action: event.action });

  const sent = await sendTelegramMessage(formatSentryMessage(event));
  const github = await maybeCreateGitHubIssue(event);

  return ok({ success: sent, action: event.action, github_issue: github }, ctx);
}

/**
 * Sentry → GitHub: open an issue for new error/fatal Sentry issues.
 * Requires SENTRY_GITHUB_REPO (owner/repo) + GITHUB_TOKEN in function secrets.
 * Idempotent-ish: skips if an open issue already mentions the Sentry shortId.
 * Returns the created/existing issue URL, or null when skipped/disabled.
 */
export async function maybeCreateGitHubIssue(
  event: SentryEvent,
): Promise<string | null> {
  try {
    const repo = Deno.env.get("SENTRY_GITHUB_REPO") || "";
    const token = Deno.env.get("GITHUB_TOKEN") || "";
    if (!repo || !token) return null;

    // Only open issues for new occurrences — never for resolve/assign/ignore.
    if (!["triggered", "created"].includes(event.action)) return null;
    const issue = event.data?.issue;
    if (!issue) return null;
    const level = (event.data?.event?.level || "error").toLowerCase();
    if (!["error", "fatal"].includes(level)) return null;

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Dedup: search open issues mentioning this Sentry shortId.
    const search = await fetch(
      `https://api.github.com/search/issues?q=repo:${repo}+type:issue+state:open+${
        encodeURIComponent(issue.shortId)
      }`,
      { headers },
    );
    if (search.ok) {
      const found = await search.json() as {
        total_count?: number;
        items?: { html_url?: string }[];
      };
      if ((found.total_count || 0) > 0) return found.items?.[0]?.html_url || "exists";
    }

    const issueUrl = issue && (issue as { url?: string }).url ||
      `https://foodshare.sentry.io/issues/${issue.id}/`;
    const title = `[Sentry] ${issue.shortId}: ${issue.title}`.slice(0, 200);
    const body = [
      `Sentry issue **${issue.shortId}** reported a new **${level}** event.`,
      "",
      `- Title: ${issue.title}`,
      issue.culprit ? `- Culprit: ${issue.culprit}` : null,
      issue.metadata?.value ? `- Error: \`${issue.metadata.value.slice(0, 300)}\`` : null,
      (issue.count && issue.count > 1)
        ? `- Volume: ${issue.count} events, ${issue.userCount || 0} users`
        : null,
      event.data?.event?.environment ? `- Environment: ${event.data.event.environment}` : null,
      event.data?.event?.platform ? `- Platform: ${event.data.event.platform}` : null,
      "",
      `🔗 [Open in Sentry](${issueUrl})`,
      "",
      `> Auto-opened by api-v1-alerts \`/webhook/sentry\`. Environment: ${
        event.data?.event?.environment || "unknown"
      }.`,
    ].filter(Boolean).join("\n");

    const created = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title, body, labels: ["sentry", "bug", "automated"] }),
    });
    if (!created.ok) {
      logger.warn("Sentry → GitHub issue creation failed", { status: created.status });
      return null;
    }
    const gh = await created.json() as { html_url?: string };
    logger.info("Sentry → GitHub issue opened", { url: gh.html_url, shortId: issue.shortId });
    return gh.html_url || null;
  } catch (error) {
    logger.error("Sentry → GitHub automation failed", error as Error);
    return null;
  }
}
