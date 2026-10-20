/**
 * Analytics Route Handlers (status + sync)
 *
 * Extracted from `api-v1-analytics/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import type { createHealthHandler } from "../../_shared/health-handler.ts";
import { logger } from "../../_shared/logger.ts";
import { CONFIG } from "./config.ts";
import { ensureSchema, getMotherDuckToken } from "./motherduck.ts";
import { getSyncStatus, updateSyncMetadata } from "./sync-metadata.ts";
import type { SyncRequest } from "./schemas.ts";
import { syncListings, syncUsers } from "./sync.ts";

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  async function handleGetStatus(ctx: HandlerContext): Promise<Response> {
    const url = new URL(ctx.request.url);
    const path = url.pathname;

    // GET /health
    if (path.endsWith("/health")) {
      return healthCheck(ctx);
    }

    // GET / — return sync status, or trigger incremental sync for cron
    const isCron = ctx.headers.get("x-supabase-cron") === "true" ||
      url.searchParams.get("cron") === "true";

    if (isCron) {
      return handleSync({
        ...ctx,
        body: { mode: "incremental" as const },
      } as HandlerContext<SyncRequest>);
    }

    // Return sync status
    const mdToken = await getMotherDuckToken();
    const syncStatus = await getSyncStatus(mdToken);

    return ok({
      version: CONFIG.version,
      tables: syncStatus,
    }, ctx);
  }

  async function handleSync(ctx: HandlerContext<SyncRequest>): Promise<Response> {
    const startTime = performance.now();
    const mode = ctx.body.mode || "incremental";

    logger.info("Starting analytics sync", { mode });

    const mdToken = await getMotherDuckToken();
    await ensureSchema(mdToken);

    const usersCount = await syncUsers(mdToken, mode);
    const listingsCount = await syncListings(mdToken, mode);

    await updateSyncMetadata(mdToken, "full_users", usersCount, mode);
    await updateSyncMetadata(mdToken, "full_listings", listingsCount, mode);

    const durationMs = Math.round(performance.now() - startTime);

    logger.info("Analytics sync complete", {
      mode,
      users: usersCount,
      listings: listingsCount,
      durationMs,
    });

    return ok(
      {
        mode,
        synced: { users: usersCount, listings: listingsCount },
        durationMs,
        lastSyncAt: new Date().toISOString(),
      },
      ctx,
    );
  }

  return { handleGetStatus, handleSync };
}
