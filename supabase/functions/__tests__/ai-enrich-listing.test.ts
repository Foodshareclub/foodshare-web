/**
 * enrichListing — the host-listing city/state read (posts has no city/state
 * columns; the community_fridges host carries them) and the a1-first /
 * operator-gated-a2 tier order, pinned by the place-cover merge (t_d12b4ce9).
 */
import { assertEquals } from "@std/assert";
import { enrichListing } from "../api-v1-ai/lib/providers/image-pipeline.ts";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  return fn().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  });
}

interface SelectLog {
  [table: string]: string[];
}

function stubSupabase(
  post: Record<string, unknown>,
  fridge: Record<string, unknown> | null,
  selects: SelectLog,
) {
  return {
    from(table: string) {
      return {
        select(cols: string) {
          (selects[table] ??= []).push(cols);
          if (table === "posts") {
            return {
              eq: () => ({ single: () => Promise.resolve({ data: post, error: null }) }),
            };
          }
          if (table === "community_fridges") {
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: fridge, error: null }),
              }),
            };
          }
          throw new Error(`unexpected table: ${table}`);
        },
      };
    },
  };
}

const basePost = {
  id: 7,
  post_name: "Parnell Community Fridge",
  post_address: "1 Main St, Auckland",
  post_type: "fridge",
  fridge_id: 42,
  website: null,
  metadata: null,
  images: [],
};

Deno.test("enrichListing: city/state come from the host listing, not posts", async () => {
  const selects: SelectLog = {};
  const supabase = stubSupabase(basePost, { city: "Auckland", state: "Auckland" }, selects);
  await withEnv({ ALLOW_SERP_FALLBACK: undefined }, async () => {
    const result = await enrichListing({ post_id: 7 }, supabase);
    assertEquals(result.status, "fell_through");
    assertEquals(selects.posts[0].includes("fridge_id"), true);
    assertEquals(selects.posts[0].includes("website"), true);
    assertEquals(selects.posts[0].includes("city"), false);
    assertEquals(selects.posts[0].includes("state"), false);
    assertEquals(selects.community_fridges[0], "city, state");
    assertEquals(result.error?.includes("a2 gated"), true);
  });
});

Deno.test("enrichListing: a1 scrape runs before the gated a2 tier", async () => {
  const selects: SelectLog = {};
  // Stubbed DNS: the SSRF primitive resolves before fetching; the private
  // resolution makes a1Scrape fail-closed hermetically (no network, no
  // fetch), so the a1→a2 ordering and the consent-gate decision are
  // observable on their own.
  const website = "https://ownsite.example";
  const PRIVATE_IP = "10.2.3.4";
  const supabase = stubSupabase({ ...basePost, website }, null, selects);
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  // Indirect reference: the repo tsrs shim's Deno surface lacks resolveDns.
  // Deno resolveDns resolves to string[] (addresses), not record objects.
  const deno = Deno as unknown as {
    resolveDns?: (_name: string, _type: "A" | "AAAA") => Promise<string[]>;
  };
  const originalDns = deno.resolveDns;
  deno.resolveDns =
    ((_name: string, _type: "A" | "AAAA") =>
      Promise.resolve(_type === "A" ? [PRIVATE_IP] : [])) as NonNullable<typeof deno.resolveDns>;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    urls.push(url);
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  try {
    await withEnv({ ALLOW_SERP_FALLBACK: undefined }, async () => {
      const result = await enrichListing({ post_id: 7 }, supabase);
      assertEquals(result.status, "fell_through");
      assertEquals(urls, []);
      assertEquals(result.error?.includes("a2 gated"), true);
    });
  } finally {
    globalThis.fetch = originalFetch;
    deno.resolveDns = originalDns;
  }
});
