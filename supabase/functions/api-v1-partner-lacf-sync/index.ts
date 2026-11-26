/**
 * Partner fridge sync - LA Community Fridges (network key `lacf`).
 *
 * GET only to their Airtable, through the shared read-only client. Every run
 * mirrors every field into private.airtable_fridge_records and calls
 * public.apply_partner_sync() in one transaction. Default is a dry run;
 * `?mode=live` posts the listings. Callable only with CRON_SECRET or the
 * service-role key.
 *
 * @module api-v1-partner-lacf-sync
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { logger } from "../_shared/logger.ts";
import { fetchRecords, loadAirtableConfig } from "../_shared/partner-sync/airtable.ts";
import { mapRecord, type PartnerRow } from "../_shared/partner-sync/mapper.ts";
import { requireServiceAuth } from "../_shared/service-auth.ts";
import { getAdminClient } from "../_shared/supabase.ts";

/** JSON value, as PostgREST receives the RPC arguments. */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const NETWORK = "lacf";
const VERSION = "1.0.0";

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

  const rows: PartnerRow[] = [];
  let skipped = 0;
  for (const record of records) {
    const row = mapRecord(record);
    if (row) rows.push(row);
    else skipped += 1;
  }
  if (skipped > 0) {
    logger.warn("Partner records without a name were skipped", { network: NETWORK, skipped });
  }

  // The arguments cross the PostgREST JSON boundary; serialize them the same way.
  const args = JSON.parse(
    JSON.stringify({
      p_network_key: NETWORK,
      p_records: records.map((record) => ({ record_id: record.id, fields: record.fields })),
      p_rows: rows,
      p_live: live,
    }),
  ) as { p_network_key: string; p_records: Json; p_rows: Json; p_live: boolean };
  const { data, error } = await getAdminClient().rpc("apply_partner_sync", args);
  if (error) throw error;

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.outcome === "locked") {
    return Response.json({ network: NETWORK, outcome: "locked" }, { status: 409 });
  }
  if (result.outcome === "refused_foreign_rows") {
    return Response.json(result, { status: 409 });
  }
  return Response.json({
    network: NETWORK,
    mode: live ? "live" : "dry_run",
    skipped,
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
