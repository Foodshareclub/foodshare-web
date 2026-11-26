/**
 * Partner fridge sync - LA Community Fridges (network key `lacf`).
 *
 * GET only to their Airtable, through the shared read-only client. Every run
 * mirrors every field into private.airtable_fridge_records and calls
 * public.apply_partner_sync() in one transaction. Default is a dry run;
 * `?mode=live` posts the listings. Callable only with CRON_SECRET or the
 * service-role key.
 *
 * Their Airtable is the source of truth, photos included. A record's photo is
 * downloaded and re-hosted in the listings bucket under the owner's
 * `partner-lacf/` namespace before the write; a record with no photo clears
 * ours. A failed download keeps the current photo for a later run rather than
 * turning a CDN error into an empty listing.
 *
 * @module api-v1-partner-lacf-sync
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { logger } from "../_shared/logger.ts";
import { downloadImage } from "../_shared/image-utils.ts";
import { STORAGE_BUCKETS } from "../_shared/storage-constants.ts";
import { uploadImage } from "../api-v1-images/lib/storage.ts";
import { fetchRecords, loadAirtableConfig } from "../_shared/partner-sync/airtable.ts";
import { mapRecord, type PartnerRow } from "../_shared/partner-sync/mapper.ts";
import { inspectRecords } from "../_shared/partner-sync/validate.ts";
import {
  type PartnerPhotoDeps,
  type PartnerPhotoSource,
  removePartnerPhoto,
  resolvePartnerPhoto,
  type StoredPartnerPhoto,
} from "../_shared/partner-sync/photo.ts";
import { requireServiceAuth } from "../_shared/service-auth.ts";
import { getAdminClient } from "../_shared/supabase.ts";

/** JSON value, as PostgREST receives the RPC arguments. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const NETWORK = "lacf";
const VERSION = "1.1.0";
const SYSTEM_OWNER = "00000000-0000-0000-0000-000000000001";

interface ExistingPost {
  id: number;
  profile_id: string;
  fridge_id: string | null;
  images: string[] | null;
  metadata: { lacf?: { photo?: StoredPartnerPhoto } } | null;
}

async function handleSync(ctx: { request: Request }): Promise<Response> {
  requireServiceAuth(ctx.request);
  const live = new URL(ctx.request.url).searchParams.get("mode") === "live";

  const config = await loadAirtableConfig();
  const records = await fetchRecords(config);
  if (records.length === 0) {
    return Response.json(
      { network: NETWORK, outcome: "refused_empty_source" },
      { status: 409 },
    );
  }

  // A renamed column or a changed status vocabulary must not silently hide
  // the network; refuse the run and keep the listings as they are.
  const shape = inspectRecords(records);
  if (shape.refused.length > 0) {
    return Response.json(
      { network: NETWORK, outcome: "refused_schema_drift", missing: shape.refused },
      { status: 409 },
    );
  }

  const admin = getAdminClient();
  const rows: PartnerRow[] = [];
  let skipped = 0;
  for (const record of records) {
    const row = mapRecord(record);
    if (row) rows.push(row);
    else skipped += 1;
  }
  if (skipped > 0) {
    logger.warn("Partner records without a name were skipped", {
      network: NETWORK,
      skipped,
    });
  }

  // Photos: resolve before the write, so the listing gets the re-hosted URL in
  // the same transaction. A dry run writes nothing, so it downloads nothing.
  let photosUpdated = 0;
  const replaced = new Set<string>();
  if (live) {
    const { data: existing, error: existingError } = await admin
      .from("posts")
      .select("id, profile_id, fridge_id, images, metadata")
      .eq("network_key", NETWORK)
      .not("fridge_id", "is", null);
    if (existingError) throw existingError;
    const byFridge = new Map<string, ExistingPost>();
    for (const post of (existing ?? []) as ExistingPost[]) {
      if (post.fridge_id) byFridge.set(post.fridge_id, post);
    }

    const deps: PartnerPhotoDeps = {
      download: downloadImage,
      store: async (path, bytes, contentType) =>
        (await uploadImage(
          admin,
          STORAGE_BUCKETS.POSTS,
          path,
          bytes,
          contentType,
        )).publicUrl,
      readback: downloadImage,
    };

    for (const row of rows) {
      const current = byFridge.get(row.fridge_id);
      // Only a listed record needs a cover. A record that is not Active is
      // hidden anyway; its photo is fetched when it becomes Active.
      if ((row.partner_status ?? "").toLowerCase() !== "active") {
        row.images = current?.images ?? [];
        const kept = current?.metadata?.lacf?.photo;
        if (kept) row.metadata.lacf.photo = kept;
        else delete row.metadata.lacf.photo;
        continue;
      }
      const attachment = (row.metadata.lacf.photo as PartnerPhotoSource | null | undefined) ??
        null;
      try {
        const resolved = await resolvePartnerPhoto({
          ownerId: current?.profile_id ?? SYSTEM_OWNER,
          attachment,
          currentImages: current?.images ?? [],
          stored: current?.metadata?.lacf?.photo ?? null,
        }, deps);
        row.images = resolved.images;
        if (resolved.photo) row.metadata.lacf.photo = resolved.photo;
        else delete row.metadata.lacf.photo;
        if (resolved.replacedUrl) replaced.add(resolved.replacedUrl);
        if (
          resolved.replacedUrl ||
          (attachment === null && (current?.images?.length ?? 0) > 0)
        ) {
          photosUpdated += 1;
        }
      } catch (error) {
        // Fail closed on the photo only: keep what the listing has, sync the
        // rest, and let the next run retry the download.
        logger.warn("Partner photo refresh failed; keeping the current photo", {
          network: NETWORK,
          record_id: row.fridge_id,
          error: String(error).slice(0, 200),
        });
        row.images = current?.images ?? [];
        const kept = current?.metadata?.lacf?.photo;
        if (kept) row.metadata.lacf.photo = kept;
        else delete row.metadata.lacf.photo;
      }
    }
  }

  // The arguments cross the PostgREST JSON boundary; serialize them the same way.
  const args = JSON.parse(
    JSON.stringify({
      p_network_key: NETWORK,
      p_records: records.map((record) => ({
        record_id: record.id,
        fields: record.fields,
      })),
      p_rows: rows,
      p_live: live,
    }),
  ) as {
    p_network_key: string;
    p_records: Json;
    p_rows: Json;
    p_live: boolean;
  };
  const { data, error } = await admin.rpc("apply_partner_sync", args);
  if (error) throw error;

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.outcome === "locked") {
    return Response.json({ network: NETWORK, outcome: "locked" }, {
      status: 409,
    });
  }
  if (result.outcome === "refused_foreign_rows") {
    return Response.json(result, { status: 409 });
  }

  // Only after the listing no longer points at them; shared cover objects are
  // never touched (the helper refuses any path outside partner-lacf/).
  if (live && result.outcome === "ok") {
    for (const url of replaced) {
      try {
        await removePartnerPhoto(admin, url);
      } catch (cleanupError) {
        logger.warn("Partner photo cleanup failed", {
          network: NETWORK,
          error: String(cleanupError).slice(0, 200),
        });
      }
    }
  }

  return Response.json({
    network: NETWORK,
    mode: live ? "live" : "dry_run",
    skipped,
    photos_updated: live ? photosUpdated : 0,
    warnings: shape.warnings,
    ...result,
  });
}

Deno.serve(
  createAPIHandler({
    service: "api-v1-partner-lacf-sync",
    version: VERSION,
    requireAuth: false, // service credential enforced in the handler
    csrf: false,
    rateLimit: { limit: 6, windowMs: 60_000, keyBy: "ip" },
    routes: { GET: { handler: handleSync } },
  }),
);
