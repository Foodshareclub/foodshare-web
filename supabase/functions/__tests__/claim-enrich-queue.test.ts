import { assertEquals, assertRejects } from "@std/assert";
import { claimEnrichQueue } from "../api-v1-ai/lib/providers/claim-enrich-queue.ts";

Deno.test("cover claims bound mutations and competing workers cannot duplicate ownership", async () => {
  const rows = Array.from(
    { length: 12 },
    (_, id) => ({ id, post_id: id + 100, status: "pending" }),
  );
  let reads = 0;
  let release!: () => void;
  const bothSelected = new Promise<void>((resolve) => {
    release = resolve;
  });
  const client = {
    from(table: string) {
      assertEquals(table, "listing_enrich_queue");
      let mutation = false;
      let ids: number[] | undefined;
      let guarded = false;
      const query = {
        select(_columns: string) {
          return query;
        },
        update(_values: unknown) {
          mutation = true;
          return query;
        },
        in(_column: string, values: number[]) {
          ids = values;
          return query;
        },
        or(_filter: string) {
          guarded = true;
          return query;
        },
        order(_column: string) {
          return query;
        },
        async limit(count: number) {
          const selected = rows.filter((row) => row.status === "pending").slice(0, count).map((
            row,
          ) => ({ id: row.id }));
          if (++reads === 2) release();
          await bothSelected;
          return { data: selected, error: null };
        },
        then(resolve: (result: unknown) => void) {
          assertEquals(mutation, true);
          assertEquals(guarded, true);
          // A missing ID bound reproduces the old PostgREST UPDATE behavior:
          // it changes the whole queue, even when its representation is limited.
          const claimed = rows.filter((row) =>
            (!ids || ids.includes(row.id)) && (!guarded || row.status === "pending")
          );
          for (const row of claimed) row.status = "processing";
          resolve({ data: claimed, error: null });
        },
      };
      return query;
    },
  };
  const claims = await Promise.all([claimEnrichQueue(client, 3), claimEnrichQueue(client, 3)]);
  assertEquals(claims.map((batch) => batch.length).sort(), [0, 3]);
  assertEquals(rows.filter((row) => row.status === "processing").length, 3);
  assertEquals(rows.filter((row) => row.status === "pending").length, 9);
});

Deno.test("cover claims reject invalid limits before touching the database", async () => {
  for (const limit of [0, -1, 1.5, NaN, Infinity, 101]) {
    await assertRejects(() => claimEnrichQueue({}, limit), Error, "batch size");
  }
});

Deno.test("empty cover queue performs no mutation and read errors propagate", async () => {
  const client = (result: unknown) => ({
    from: () => ({
      select: () => ({ or: () => ({ order: () => ({ order: () => ({ limit: () => result }) }) }) }),
    }),
  });
  assertEquals(await claimEnrichQueue(client({ data: [], error: null }), 5), []);
  await assertRejects(
    () => claimEnrichQueue(client({ data: null, error: new Error("database unavailable") }), 5),
    Error,
    "database unavailable",
  );
});
