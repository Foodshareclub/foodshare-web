import { assertEquals, assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { createContext } from "../_shared/context.ts";
import { handleGet, handlePost, normalizeDimensions } from "../api-v1-vector-search/index.ts";
import { ValidationError } from "../_shared/errors.ts";

function createMockHandlerContext(
  request: Request,
  supabaseMock: any,
  body: unknown = {},
): HandlerContext {
  return {
    request,
    ctx: createContext(request, "api-v1-vector-search"),
    userId: "test-user-id",
    supabase: supabaseMock,
    body,
    query: {},
    params: {},
    headers: request.headers,
    idempotencyKey: null,
    corsHeaders: { "Access-Control-Allow-Origin": "*" },
    getSecret: (name: string) => Promise.resolve(Deno.env.get(name)),
  };
}

Deno.test("api-v1-vector-search: normalizeDimensions behavior", () => {
  // Exact dimensions
  const exact = Array.from({ length: 384 }, () => 0.5);
  assertEquals(normalizeDimensions(exact, 384).length, 384);
  assertEquals(normalizeDimensions(exact, 384)[0], 0.5);

  // Truncation
  const longer = Array.from({ length: 512 }, () => 1.0);
  const truncated = normalizeDimensions(longer, 384);
  assertEquals(truncated.length, 384);
  assertEquals(truncated[0], 1.0);

  // Padding
  const shorter = [0.1, 0.2, 0.3];
  const padded = normalizeDimensions(shorter, 384);
  assertEquals(padded.length, 384);
  assertEquals(padded[0], 0.1);
  assertEquals(padded[1], 0.2);
  assertEquals(padded[2], 0.3);
  assertEquals(padded[3], 0);
  assertEquals(padded[383], 0);
});

Deno.test("api-v1-vector-search: migration preserves the RPC contract", async () => {
  const migration = await Deno.readTextFile(
    new URL("../../migrations/20260925000001_restore_vector_search_contract.sql", import.meta.url),
  );
  const requiredFragments = [
    "post_name text",
    "post_description text",
    "post_type text",
    "posts.is_active = true",
    "COALESCE(match_count, 50)",
    "REVOKE ALL ON FUNCTION public.match_posts(vector, float, int) FROM PUBLIC, anon, authenticated",
  ];
  for (const fragment of requiredFragments) {
    if (!migration.includes(fragment)) {
      throw new Error(`Vector migration is missing: ${fragment}`);
    }
  }
});

Deno.test("api-v1-vector-search: GET health route", async () => {
  const mockSupabase = {
    rpc: () => Promise.resolve({ data: [], error: null }),
  };
  const req = new Request("http://localhost/api-v1-vector-search?route=health", {
    method: "GET",
  });
  const ctx = createMockHandlerContext(req, mockSupabase);

  const res = await handleGet(ctx, mockSupabase as any);
  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(body.data.service, "api-v1-vector-search");
  assertEquals(body.data.status, "healthy");
  assertEquals(body.data.targetDimensions, 384);
});

Deno.test("api-v1-vector-search: GET validates missing query parameter 'q'", async () => {
  const mockSupabase = {
    rpc: () => Promise.resolve({ data: [], error: null }),
  };
  const req = new Request("http://localhost/api-v1-vector-search", {
    method: "GET",
  });
  const ctx = createMockHandlerContext(req, mockSupabase);

  await assertRejects(
    async () => {
      await handleGet(ctx, mockSupabase as any);
    },
    ValidationError,
    "Query parameter 'q' is required",
  );
});

Deno.test("api-v1-vector-search: POST validates missing query body field", async () => {
  const mockSupabase = {
    rpc: () => Promise.resolve({ data: [], error: null }),
  };
  const req = new Request("http://localhost/api-v1-vector-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const ctx = createMockHandlerContext(req, mockSupabase, {});

  await assertRejects(
    async () => {
      await handlePost(ctx, mockSupabase as any);
    },
    ValidationError,
    "Body field 'query' is required",
  );
});

Deno.test("api-v1-vector-search: GET successfully queries match_posts RPC", async () => {
  const mockPosts = [
    {
      id: 101,
      post_name: "Fresh Sourdough Bread",
      post_description: "Freshly baked sourdough",
      post_type: "food",
      similarity: 0.92,
    },
    {
      id: 102,
      post_name: "Organic Apples",
      post_description: "Fresh organic apples",
      post_type: "food",
      similarity: 0.85,
    },
  ];

  const mockSupabase = {
    rpc: (_fn: string, _params: Record<string, unknown>) => {
      return Promise.resolve({
        data: mockPosts,
        error: null,
      });
    },
  };

  const req = new Request(
    "http://localhost/api-v1-vector-search?q=sourdough&threshold=0.7&limit=5",
    {
      method: "GET",
    },
  );
  const requestSupabase = {
    rpc: () => {
      throw new Error("request client should not be used");
    },
  };
  const ctx = createMockHandlerContext(req, requestSupabase);

  // Mock global Supabase.ai Session
  const originalGlobal = (globalThis as any).Supabase;
  (globalThis as any).Supabase = {
    ai: {
      Session: class {
        run() {
          return Promise.resolve(new Float32Array(384).fill(0.1));
        }
      },
    },
  };

  try {
    const res = await handleGet(ctx, mockSupabase as any);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.data.results.length, 2);
    assertEquals(body.data.results[0].post_name, "Fresh Sourdough Bread");
    assertEquals(body.data.results[0].post_type, "food");
    assertEquals(body.data.total, 2);
  } finally {
    (globalThis as any).Supabase = originalGlobal;
  }
});

Deno.test("api-v1-vector-search: handlePost successfully executes with Supabase.ai", async () => {
  const mockPosts = [
    {
      id: 201,
      post_name: "Croissant Box",
      post_description: "Fresh croissants",
      post_type: "food",
      similarity: 0.88,
    },
  ];

  const mockSupabase = {
    rpc: (_fn: string, _params: Record<string, unknown>) => {
      return Promise.resolve({
        data: mockPosts,
        error: null,
      });
    },
  };

  const req = new Request("http://localhost/api-v1-vector-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "croissants", limit: 5 }),
  });
  const ctx = createMockHandlerContext(req, mockSupabase, { query: "croissants", limit: 5 });

  const originalGlobal = (globalThis as any).Supabase;
  (globalThis as any).Supabase = {
    ai: {
      Session: class {
        run() {
          return Promise.resolve(new Float32Array(384).fill(0.2));
        }
      },
    },
  };

  try {
    const res = await handlePost(ctx, mockSupabase as any);
    assertEquals(res.status, 200);

    const body = await res.json();
    assertEquals(body.success, true);
    assertEquals(body.data.results[0].post_name, "Croissant Box");
    assertEquals(body.data.results[0].post_type, "food");
  } finally {
    (globalThis as any).Supabase = originalGlobal;
  }
});
