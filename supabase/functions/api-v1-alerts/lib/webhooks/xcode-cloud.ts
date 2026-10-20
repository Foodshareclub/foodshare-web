/**
 * Xcode Cloud Webhook (Apple → Telegram)
 *
 * Only terminal build states notify; intermediate Apple webhooks
 * (started/running/progress with no completionStatus) are skipped silently.
 *
 * Extracted from `api-v1-alerts/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { logger } from "../../../_shared/logger.ts";
import { escapeTelegramHtml, sendTelegramMessage } from "../telegram.ts";

export interface XcodeCloudPayload {
  ciBuildRun?: {
    attributes?: {
      number?: number;
      executionProgress?: string;
      completionStatus?: string;
      startedDate?: string;
      finishedDate?: string;
    };
  };
  ciWorkflow?: {
    attributes?: {
      name?: string;
    };
  };
  scmGitReference?: {
    attributes?: {
      name?: string;
      canonicalName?: string;
    };
  };
  scmCommit?: {
    attributes?: {
      message?: string;
      author?: {
        displayName?: string;
      };
    };
  };
  [key: string]: unknown;
}

// Terminal Xcode Cloud states that produce a Telegram notification.
// Intermediate Apple webhooks (started/running/progress with no
// completionStatus) are skipped silently. Single source of truth for both
// the skip-guard and the message rendering below.
export const XCODE_STATUS_META: Record<string, { emoji: string; text: string }> = {
  SUCCEEDED: { emoji: "🚀", text: "Succeeded" },
  FAILED: { emoji: "❌", text: "Failed" },
  ERRORED: { emoji: "💥", text: "Errored" },
  CANCELED: { emoji: "⏹️", text: "Cancelled" },
};

export function getXcodeCloudStatus(data: XcodeCloudPayload): string | null {
  const raw = data?.ciBuildRun?.attributes?.completionStatus ||
    (data as Record<string, unknown>)?.status as string | undefined;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return raw.trim().toUpperCase();
}

export function formatXcodeCloudMessage(data: XcodeCloudPayload): string | null {
  const status = getXcodeCloudStatus(data);
  const meta = status ? XCODE_STATUS_META[status] : undefined;
  // Skip intermediate Apple webhooks (started/running/finished-progress with
  // no completionStatus) — only terminal states produce a notification.
  if (!status || !meta) return null;
  const { emoji, text: statusText } = meta;
  const buildRun = data?.ciBuildRun;
  const buildNumber = buildRun?.attributes?.number ||
    (data as Record<string, unknown>)?.number || "?";
  const workflowName = data?.ciWorkflow?.attributes?.name || "FoodShare CI/CD";
  const commit = data?.scmCommit?.attributes;
  const branch = data?.scmGitReference?.attributes?.name || "main";

  const lines: string[] = [
    `${emoji} <b>Xcode Cloud: Build #${buildNumber} ${statusText}</b>`,
    "",
    `📱 <b>App:</b> FoodShare Club (iOS)`,
    `🛠️ <b>Workflow:</b> ${escapeTelegramHtml(workflowName)}`,
    `🌿 <b>Branch:</b> <code>${escapeTelegramHtml(branch)}</code>`,
  ];

  if (commit?.message) {
    const cleanMsg = commit.message.split("\n")[0].substring(0, 150);
    lines.push(`💬 <b>Commit:</b> ${escapeTelegramHtml(cleanMsg)}`);
  }
  if (commit?.author?.displayName) {
    lines.push(`👤 <b>Author:</b> ${escapeTelegramHtml(commit.author.displayName)}`);
  }

  if (status === "SUCCEEDED") {
    lines.push("", `👥 <b>TestFlight:</b> Distributed to internal & external testers`);
  }

  lines.push(
    "",
    `🔗 <a href="https://appstoreconnect.apple.com/apps/1573242804/testflight">View in TestFlight</a>`,
  );

  return lines.join("\n");
}

export async function handleXcodeCloudWebhook(ctx: HandlerContext): Promise<Response> {
  const body = (ctx.body || {}) as XcodeCloudPayload;
  logger.info("Xcode Cloud webhook received", {
    buildNumber: body?.ciBuildRun?.attributes?.number,
    status: body?.ciBuildRun?.attributes?.completionStatus,
    executionProgress: body?.ciBuildRun?.attributes?.executionProgress,
  });

  const message = formatXcodeCloudMessage(body);
  if (!message) {
    const rawStatus = body?.ciBuildRun?.attributes?.completionStatus;
    const logFields = {
      buildNumber: body?.ciBuildRun?.attributes?.number ?? null,
      status: rawStatus ?? null,
      executionProgress: body?.ciBuildRun?.attributes?.executionProgress ??
        null,
    };
    // A present-but-unknown status may mean Apple added a new terminal state
    // that we are silently dropping — surface it at warn level.
    if (typeof rawStatus === "string" && rawStatus.trim() !== "") {
      logger.warn("Xcode Cloud webhook skipped (unknown status)", logFields);
    } else {
      logger.info(
        "Xcode Cloud webhook skipped (non-terminal/intermediate event)",
        logFields,
      );
    }
    return ok(
      { success: true, skipped: true, event: "xcode_cloud" },
      ctx,
    );
  }
  const sent = await sendTelegramMessage(message);

  return ok({ success: sent, event: "xcode_cloud" }, ctx);
}
