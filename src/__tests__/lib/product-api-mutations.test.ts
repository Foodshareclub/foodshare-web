import { describe, expect, it, mock } from "bun:test";

const apiPost = mock(async (_endpoint: string, _body: unknown) => ({
  success: true,
  data: { id: 42, post_type: "thing", is_active: true },
}));
const apiPut = mock(async (_endpoint: string, _body: unknown, _query: unknown) => ({ success: true, data: {} }));
mock.module("@/lib/api/client", () => ({ apiPost, apiPut, apiDelete: mock() }));
const { createProductAPI, updateProductAPI } = await import("@/lib/api/products");

describe("product classification API contract", () => {
  it("preserves omitted coordinates and returns the saved category", async () => {
    const result = await createProductAPI({
      post_name: "A chair",
      post_description: "Wooden chair",
      post_type: "food",
      profile_id: "owner",
      images: [],
      transportation: "Collection",
      condition: "good",
    });
    const sent = apiPost.mock.calls[0][1];
    expect(sent).toMatchObject({ postType: "food", transportation: "Collection", condition: "good" });
    expect(JSON.parse(JSON.stringify(sent))).not.toHaveProperty("latitude");
    expect(JSON.parse(JSON.stringify(sent))).not.toHaveProperty("longitude");
    expect(result).toEqual({ success: true, data: { id: 42, post_type: "thing", is_active: true } });
  });

  it("forwards an explicit manual override", async () => {
    await createProductAPI({
      post_name: "Marmelade",
      post_description: "Homemade jam",
      post_type: "thing",
      category_mode: "manual",
      profile_id: "owner",
      images: [],
      latitude: 0,
      longitude: 0,
    });
    expect(apiPost.mock.calls[1][1]).toMatchObject({
      categoryMode: "manual",
      postType: "thing",
      latitude: 0,
      longitude: 0,
    });
  });

  it("forwards an owner's category correction together with its edit revision", async () => {
    await updateProductAPI(42, { post_type: "thing", version: 3 });
    expect(apiPut.mock.calls[0]).toEqual([
      "api-v1-products",
      expect.objectContaining({ postType: "thing", version: 3 }),
      { id: 42 },
    ]);
  });
});
