/**
 * Image maintenance handlers — cleanup orphans and recompress old images.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { requireServiceAuth } from "../../_shared/service-auth.ts";
import { cleanupOrphanImages } from "../services/cleanup.ts";
import { recompressOldImages } from "../services/recompression.ts";

/**
 * Cleanup orphan images. Service/cron only.
 *
 * The old check only ran when `CRON_SECRET` was set, so a deployment that had
 * not configured it exposed deletion to anyone. `requireServiceAuth` fails
 * closed. The body is already parsed by the handler factory; reading
 * `request.json()` a second time throws `Body already used`.
 */
export async function handleCleanup(ctx: HandlerContext): Promise<Response> {
  requireServiceAuth(ctx.request);

  const body = (ctx.body ?? {}) as {
    gracePeriodHours?: number;
    batchSize?: number;
    dryRun?: boolean;
  };

  const stats = await cleanupOrphanImages(ctx.supabase, {
    gracePeriodHours: body.gracePeriodHours,
    batchSize: body.batchSize,
    dryRun: body.dryRun,
  });

  return ok(stats, ctx);
}

/**
 * Recompress old images. Protected by cron secret.
 */
export async function handleRecompress(ctx: HandlerContext): Promise<Response> {
  requireServiceAuth(ctx.request);

  const body = (ctx.body ?? {}) as {
    batchSize?: number;
    cutoffDate?: string;
  };

  const results = await recompressOldImages(ctx.supabase, {
    batchSize: body.batchSize,
    cutoffDate: body.cutoffDate,
  });

  return ok({ results }, ctx);
}
