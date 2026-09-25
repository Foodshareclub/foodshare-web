import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { ActionResult } from "@/lib/errors";

const owner = "00000000-0000-4000-8000-000000000001";
const state = {
  current: { profile_id: owner, post_type: "food" } as Record<string, unknown> | null,
  revision: 25,
  writes: [] as Array<{ data: Record<string, unknown>; filters: Record<string, unknown> }>,
  reads: 0,
};
const invalidateTag = mock();
const embedProduct = mock(async (_input: unknown) => {});
const createProductAPI = mock(
  async (
    _input: unknown
  ): Promise<ActionResult<{ id: number; post_type: string; is_active: boolean }>> => ({
    success: true,
    data: { id: 42, post_type: "thing", is_active: true },
  })
);
const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: owner } } }) },
  from: () => {
    let data: Record<string, unknown> | undefined;
    let insert = false;
    const filters: Record<string, unknown> = {};
    const resolve = async () => {
      if (data) {
        state.writes.push({ data, filters });
        return {
          data: insert || filters.version === state.revision ? { id: 42 } : null,
          error: null,
        };
      }
      state.reads++;
      return { data: state.current, error: null };
    };
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return query;
      },
      insert: (value: Record<string, unknown>) => {
        data = value;
        insert = true;
        return query;
      },
      update: (value: Record<string, unknown>) => {
        data = value;
        return query;
      },
      single: resolve,
      maybeSingle: resolve,
    };
    return query;
  },
};

process.env.USE_EDGE_FUNCTIONS_FOR_PRODUCTS = "false";
mock.module("@/lib/supabase/server", () => ({ createClient: async () => supabase }));
mock.module("@/lib/data/cache-keys", () => ({
  CACHE_TAGS: { USER_PRODUCTS: (id: string) => id },
  getProductTags: () => ["products"],
}));
mock.module("@/lib/data/cache-invalidation", () => ({
  invalidateTag,
  invalidatePostActivityCaches: mock(),
}));
mock.module("@/app/actions/analytics", () => ({ trackEvent: mock(async () => {}) }));
mock.module("@/app/actions/post-activity", () => ({ logPostActivity: mock() }));
mock.module("@/lib/storage/search", () => ({
  indexProduct: mock(async () => true),
  removeProductFromSearch: mock(),
}));
mock.module("@/lib/embeddings", () => ({ embedProduct }));
mock.module("@/lib/structured-logger", () => ({
  createActionLogger: async () => ({ info: mock(), debug: mock(), warn: mock() }),
}));
mock.module("@/lib/api/products", () => ({ createProductAPI, deleteProductAPI: mock() }));

const { createProduct, updateProduct } = await import("@/app/actions/products");

beforeEach(() => {
  state.current = { profile_id: owner, post_type: "food" };
  state.revision = 25;
  state.writes = [];
  state.reads = 0;
  invalidateTag.mockClear();
  embedProduct.mockClear();
  createProductAPI.mockClear();
});

describe("listing mutation actions", () => {
  it("uses the revision from the edit form and enforces ownership on the write", async () => {
    const form = new FormData();
    form.set("post_name", "Green apples");
    form.set("version", "25");
    const result = await updateProduct(42, form);
    expect(result.success).toBe(true);
    expect(state.writes[0].filters).toEqual({ id: 42, profile_id: owner, version: 25 });
    expect(state.writes[0].data).toEqual({ post_name: "Green apples" });
  });

  it("reports a conflict instead of success when the original revision is stale", async () => {
    const form = new FormData();
    form.set("post_name", "Green apples");
    form.set("version", "24");
    const result = await updateProduct(42, form);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("CONFLICT");
    expect(state.writes[0].filters.version).toBe(24);
    expect(invalidateTag).not.toHaveBeenCalled();
    expect(embedProduct).not.toHaveBeenCalled();
  });

  it("rejects missing and malformed revisions before querying the database", async () => {
    for (const version of [undefined, "0", "1.5", "NaN", "9007199254740992"]) {
      const form = new FormData();
      if (version !== undefined) form.set("version", version);
      const result = await updateProduct(42, form);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(state.reads).toBe(0);
    expect(state.writes).toHaveLength(0);
  });

  it("does not report success or write when the listing no longer exists", async () => {
    state.current = null;
    const form = new FormData();
    form.set("version", "25");
    const result = await updateProduct(42, form);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("NOT_FOUND");
    expect(state.writes).toHaveLength(0);
  });

  it("routes creation through classification even with the legacy flag off and preserves zero coordinates", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      post_name: "Apples",
      post_description: "Fresh apples",
      post_type: "food",
      profile_id: owner,
      images: "[]",
      latitude: "0",
      longitude: "-0.12",
    })) {
      form.set(key, value);
    }
    expect((await createProduct(form)).success).toBe(true);
    expect(state.writes).toHaveLength(0);
    expect(createProductAPI.mock.calls[0][0]).toMatchObject({ latitude: 0, longitude: -0.12 });
    expect(embedProduct.mock.calls[0][0]).toMatchObject({ type: "thing" });
  });

  it("rejects incomplete coordinates instead of silently discarding location", async () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      post_name: "Apples",
      post_description: "Fresh apples",
      post_type: "food",
      profile_id: owner,
      images: "[]",
      latitude: "0",
    })) {
      form.set(key, value);
    }
    expect((await createProduct(form)).success).toBe(false);
    expect(state.writes).toHaveLength(0);
  });

  it("keeps a failed edge publish from bypassing classification with a direct insert", async () => {
    createProductAPI.mockResolvedValueOnce({
      success: false,
      error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" },
    });
    const form = new FormData();
    for (const [key, value] of Object.entries({
      post_name: "Apples",
      post_description: "Fresh apples",
      post_type: "food",
      profile_id: owner,
      images: "[]",
    }))
      form.set(key, value);
    const result = await createProduct(form);
    expect(result.success).toBe(false);
    expect(state.writes).toHaveLength(0);
    expect(embedProduct).not.toHaveBeenCalled();
  });

  it("records category corrections as manual decisions and preserves other metadata", async () => {
    state.current = { profile_id: owner, post_type: "food", metadata: { importSource: "legacy" } };
    const form = new FormData();
    form.set("version", "25");
    form.set("post_type", "thing");
    expect((await updateProduct(42, form)).success).toBe(true);
    expect(state.writes[0].data).toMatchObject({
      post_type: "thing",
      category_id: null,
      metadata: {
        importSource: "legacy",
        classification: { source: "manual", postType: "thing", needsReview: false },
      },
    });
  });
});
