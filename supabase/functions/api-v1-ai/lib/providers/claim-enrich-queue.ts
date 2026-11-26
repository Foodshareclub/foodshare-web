/** Select a bounded candidate set, then claim only rows still eligible.
 * PostgREST's representation limit must never be used to bound an UPDATE.
 */
// deno-lint-ignore no-explicit-any
export async function claimEnrichQueue(supabase: any, batchSize: number) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) {
    throw new Error("Cover queue batch size must be an integer from 1 to 100");
  }
  const now = new Date();
  const eligible = `status.eq.pending,or(status.eq.processing,claimed_at.lt.${
    new Date(now.getTime() - 600_000).toISOString()
  })`;
  const { data: candidates, error: readError } = await supabase
    .from("listing_enrich_queue").select("id").or(eligible)
    .order("created_at").order("id").limit(batchSize);
  if (readError) throw readError;
  if (!candidates?.length) return [];
  // Rechecking eligibility makes simultaneous selectors safe: a row claimed
  // by another worker no longer matches pending or the stale cutoff.
  const { data, error } = await supabase.from("listing_enrich_queue")
    .update({ status: "processing", claimed_at: now.toISOString() })
    .in("id", candidates.map((row: { id: number }) => row.id))
    .or(eligible).select("id, post_id");
  if (error) throw error;
  return data ?? [];
}
