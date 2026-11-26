/**
 * Create-path hook: async background queue that upgrades new fridge/foodbank
 * listings to real photographs via the enrichListing pipeline.
 *
 * The create path (whatsapp-bot food listing insert) calls enqueueEnrich()
 * non-blockingly after the insert; a worker (POST /enrichListingQueue,
 * service/cron auth, or a pg_cron sweep) claims and processes rows. The create
 * response is never blocked by the pipeline (which can take up to 2 min).
 *
 * Lifecycle (consistent with the email queue):
 *   pending -> processing -> done | failed
 *   - Idempotent at the queue level: a unique index allows at most one
 *     pending/processing row per post; re-enqueue on an active row is a no-op.
 *   - Idempotent at the pipeline level: enrichListing skips a listing whose
 *     metadata.image_provenance.status === "placed".
 *   - Stale-claim recovery: a row in `processing` longer than STALE_CLAIM_SECONDS
 *     is assumed to belong to a dead worker and is reclaimable.
 *   - Retry bound: a row that fails MAX_ATTEMPTS times is marked `failed`.
 *
 * Card: t_5e01973c (create-path hook).
 */

import { enrichListing } from "./image-pipeline.ts";
import { claimEnrichQueue } from "./claim-enrich-queue.ts";

// Give up after this many attempts (a row at MAX_ATTEMPTS is `failed`).
const MAX_ATTEMPTS = 3;

/**
 * Enqueue a listing for real-photo enrichment. Non-blocking: resolves without
 * waiting for the pipeline. Idempotent — a listing with an active (pending or
 * processing) row is not re-queued. The create path calls this fire-and-forget.
 *
 * @returns true if a row was (re)enqueued, false if one is already active.
 */
// deno-lint-ignore no-explicit-any
export async function enqueueEnrich(supabase: any, postId: number): Promise<boolean> {
  const { error } = await supabase.from("listing_enrich_queue").upsert(
    { post_id: postId, status: "pending", retry_count: 0 },
    { onConflict: "post_id", ignore: true },
  );
  if (error) return false;
  return true;
}

export interface ProcessQueueResult {
  processed: number;
  placed: number;
  skipped: number;
  fellThrough: number;
  failed: number;
}

/**
 * Claim and process a batch of pending enrich-queue rows.
 *
 * Claim a bounded candidate set with an atomic eligibility recheck, so two
 * workers cannot own the same pending or stale row.
 *
 * @param batchSize rows to process in this call.
 * @param dryRun claim + report without calling the pipeline.
 */
// deno-lint-ignore no-explicit-any
export async function processEnrichQueue(
  supabase: any,
  batchSize = 10,
  dryRun = false,
): Promise<ProcessQueueResult> {
  const result: ProcessQueueResult = {
    processed: 0,
    placed: 0,
    skipped: 0,
    fellThrough: 0,
    failed: 0,
  };

  const claimed = await claimEnrichQueue(supabase, batchSize);
  if (!claimed || claimed.length === 0) return result;

  for (const row of claimed) {
    const rowId = row.id as number;
    const postId = row.post_id as number;
    result.processed++;

    if (dryRun) continue;

    try {
      const out = await enrichListing({ post_id: postId }, supabase);
      const status = out.status as string;
      if (status === "placed") {
        result.placed++;
        await markDone(supabase, rowId);
      } else if (status === "skipped") {
        result.skipped++;
        await markDone(supabase, rowId);
      } else {
        // fell_through / error: retry up to MAX_ATTEMPTS, then fail.
        await markFailure(supabase, rowId, out.error ?? status);
        if (status === "fell_through") result.fellThrough++;
      }
    } catch (err) {
      result.failed++;
      await markFailure(supabase, rowId, String(err).slice(0, 500));
    }
  }

  return result;
}

async function markDone(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  rowId: number,
): Promise<void> {
  await supabase.from("listing_enrich_queue")
    .update({ status: "done", claimed_at: null, updated_at: new Date().toISOString() })
    .eq("id", rowId);
}

async function markFailure(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  rowId: number,
  error: string,
): Promise<void> {
  // Increment retry_count; if it reaches MAX_ATTEMPTS, mark failed (terminal).
  const { data: row } = await supabase.from("listing_enrich_queue")
    .select("retry_count").eq("id", rowId).single();
  const nextRetry = ((row?.retry_count as number) ?? 0) + 1;
  const terminal = nextRetry >= MAX_ATTEMPTS;
  await supabase.from("listing_enrich_queue").update({
    status: terminal ? "failed" : "pending",
    retry_count: nextRetry,
    last_error: error,
    claimed_at: null,
    updated_at: new Date().toISOString(),
  }).eq("id", rowId);
}
