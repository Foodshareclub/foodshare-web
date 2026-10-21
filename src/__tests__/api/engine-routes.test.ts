import { describe, expect, it } from "bun:test";

/**
 * The `/api/engine/*` endpoints.
 *
 * They are public and unauthenticated, and their bodies arrive from the
 * network, so every value is checked before it reaches a module.
 *
 * The check is not politeness. A `&str` parameter is read out of the
 * module's memory by length, so a value that is not a string sends it off
 * the end of the allocation — an out-of-bounds access inside the module
 * rather than a JavaScript exception, and so not something a handler can
 * catch and answer with a status.
 *
 * These tests pin the properties the fix depends on: a body that cannot be
 * used is answered with a 400 and a message naming the field, and a
 * usable body is answered with the computed value.
 */

import { POST } from "@/app/api/[[...route]]/route";

function post(path: string, body: unknown): Request {
  return new Request(`https://foodshare.club/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A request whose body is written out as it is, so it can be malformed. */
function raw(path: string, text: string, headers: Record<string, string> = {}): Request {
  const request = new Request(`https://foodshare.club/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: text,
  });
  // The extra headers are set once the request is made: the DOM library
  // the test runner loads recomputes the length of a body it is given,
  // and one of these tests is about a body that says it is longer than
  // it is.
  for (const [name, value] of Object.entries(headers)) {
    request.headers.set(name, value);
  }
  return request;
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST /api/engine/geo/distance", () => {
  const VALID = { lat1: 51.5074, lng1: -0.1278, lat2: 48.8566, lng2: 2.3522 };

  it("answers with the distance and the decay score", async () => {
    const response = await POST(post("/engine/geo/distance", VALID));

    expect(response.status).toBe(200);
    const parsed = await body(response);
    // London to Paris is about 343 km.
    expect(parsed.distanceKm).toBeGreaterThan(340);
    expect(parsed.distanceKm).toBeLessThan(346);
    expect(parsed.decayScore).toBeGreaterThan(0);
  });

  it("rejects a body it cannot use", async () => {
    const cases: Array<[string, unknown]> = [
      ["a string coordinate", { ...VALID, lat1: "51.5" }],
      ["a null coordinate", { ...VALID, lat1: null }],
      ["a NaN coordinate", { ...VALID, lat1: Number.NaN }],
      ["an infinite coordinate", { ...VALID, lng1: Number.POSITIVE_INFINITY }],
      ["a boolean coordinate", { ...VALID, lat1: true }],
      ["a missing coordinate", { lat1: 51.5, lng1: 0 }],
      ["a latitude out of range", { ...VALID, lat1: 91 }],
      ["a longitude out of range", { ...VALID, lng1: 181 }],
      // A half-life of zero is not a decay curve, and the module holds one
      // of its own to fall back on, so it is refused rather than answered
      // with a curve that was not asked for.
      ["a half-life of zero", { ...VALID, halfLifeKm: 0 }],
      ["a negative half-life", { ...VALID, halfLifeKm: -1 }],
    ];

    for (const [label, payload] of cases) {
      const response = await POST(post("/engine/geo/distance", payload));

      expect(response.status, label).toBe(400);
      const parsed = await body(response);
      expect(parsed.distanceKm, label).toBeUndefined();
      expect(parsed.error, label).toBeString();
    }
  });

  it("rejects a body that is not an object", async () => {
    const response = await POST(post("/engine/geo/distance", "nonsense"));

    expect(response.status).toBe(400);
  });
});

describe("the body of an engine request", () => {
  it("rejects a body that is not JSON", async () => {
    // A body that cannot be parsed is a body the caller cannot use, not
    // a fault of the server.
    for (const text of ["{not json", "", "[1, 2", "undefined"]) {
      const response = await POST(raw("/engine/geo/distance", text));

      expect(response.status, JSON.stringify(text)).toBe(400);
      const parsed = await body(response);
      expect(parsed.error, JSON.stringify(text)).toBeString();
    }
  });

  it("rejects a body that is not an object", async () => {
    for (const text of ["[]", '"a string"', "42", "null", "true"]) {
      const response = await POST(raw("/engine/geo/distance", text));

      expect(response.status, text).toBe(400);
    }
  });

  it("refuses a body that declares itself too large", async () => {
    const response = await POST(
      raw("/engine/geo/distance", JSON.stringify({ lat1: 1, lng1: 2, lat2: 3, lng2: 4 }), {
        "content-length": String(1024 * 1024),
      }),
    );

    expect(response.status).toBe(413);
    const parsed = await body(response);
    expect(parsed.error).toBeString();
  });

  it("refuses a body that is too large without declaring it", async () => {
    // The length is checked again against the body itself, because a
    // request does not have to say how long it is.
    const response = await POST(
      raw("/engine/geo/distance", JSON.stringify({ lat1: 1, lng1: 2, lat2: 3, lng2: 4, note: "x".repeat(300_000) })),
    );

    expect(response.status).toBe(413);
  });

  it("refuses a body that is too many bytes without being too many characters", async () => {
    // Three bytes to a character, so a body of characters can be over the
    // limit in bytes while it is under it in characters.
    const response = await POST(
      raw("/engine/geo/distance", JSON.stringify({ lat1: 1, lng1: 2, lat2: 3, lng2: 4, note: "€".repeat(100_000) })),
    );

    expect(response.status).toBe(413);
  });

  it("accepts a body of a size the endpoints are meant to take", async () => {
    // A pair of embedding vectors of the size the app uses.
    const vector = Array.from({ length: 1536 }, (_, index) => index / 1536);
    const response = await POST(
      post("/engine/search/hybrid", { textQuery: "bread", targetText: "Fresh bread", queryVector: vector, itemVector: vector }),
    );

    expect(response.status).toBe(200);
  });
});

describe("POST /api/engine/crypto/verify-totp", () => {
  it("answers whether the code is valid", async () => {
    const response = await POST(
      post("/engine/crypto/verify-totp", { secret: "12345678901234567890", token: "287082" }),
    );

    expect(response.status).toBe(200);
    const parsed = await body(response);
    expect(parsed.valid).toBe(false);
  });

  it("rejects a secret that is not a string", async () => {
    // A number would be read out of the module's memory by a length that
    // is not a number, so it must never reach the module.
    const response = await POST(post("/engine/crypto/verify-totp", { secret: 12345, token: "287082" }));

    expect(response.status).toBe(400);
    const parsed = await body(response);
    expect(parsed.valid).toBeUndefined();
  });

  it("rejects a missing secret or token", async () => {
    for (const payload of [{ token: "287082" }, { secret: "12345678901234567890" }, { secret: "", token: "" }]) {
      const response = await POST(post("/engine/crypto/verify-totp", payload));

      expect(response.status).toBe(400);
    }
  });
});

describe("POST /api/engine/image/smart-width", () => {
  it("answers with the target width", async () => {
    const response = await POST(
      post("/engine/image/smart-width", { fileSizeBytes: 3 * 1024 * 1024, currentWidth: 4000, currentHeight: 3000 }),
    );

    expect(response.status).toBe(200);
    const parsed = await body(response);
    expect(parsed.targetWidth).toBe(600);
    expect(parsed.needsResize).toBe(true);
  });

  it("rejects a body it cannot use", async () => {
    const cases: Array<[string, unknown]> = [
      ["a string size", { fileSizeBytes: "3145728", currentWidth: 4000, currentHeight: 3000 }],
      ["a fractional width", { fileSizeBytes: 3145728, currentWidth: 4000.5, currentHeight: 3000 }],
      ["a negative width", { fileSizeBytes: 3145728, currentWidth: -1, currentHeight: 3000 }],
      ["a missing size", { currentWidth: 4000, currentHeight: 3000 }],
    ];

    for (const [label, payload] of cases) {
      const response = await POST(post("/engine/image/smart-width", payload));

      expect(response.status, label).toBe(400);
      const parsed = await body(response);
      expect(parsed.targetWidth, label).toBeUndefined();
    }
  });
});

describe("POST /api/engine/search/hybrid", () => {
  it("answers with a score", async () => {
    const response = await POST(
      post("/engine/search/hybrid", { textQuery: "sourdough", targetText: "Fresh artisan sourdough bread" }),
    );

    expect(response.status).toBe(200);
    const parsed = await body(response);
    expect(parsed.score).toBeGreaterThan(0);
  });

  it("rejects a body it cannot use", async () => {
    const cases: Array<[string, unknown]> = [
      ["a missing query", { targetText: "Fresh artisan sourdough bread" }],
      ["a non-string query", { textQuery: 42, targetText: "Fresh artisan sourdough bread" }],
      ["a string vector", { textQuery: "a", targetText: "b", queryVector: "abc" }],
      ["a vector of strings", { textQuery: "a", targetText: "b", queryVector: ["x", "y"] }],
      ["a non-finite distance", { textQuery: "a", targetText: "b", distanceKm: Number.NaN }],
      ["a negative distance", { textQuery: "a", targetText: "b", distanceKm: -1 }],
    ];

    for (const [label, payload] of cases) {
      const response = await POST(post("/engine/search/hybrid", payload));

      expect(response.status, label).toBe(400);
      const parsed = await body(response);
      expect(parsed.score, label).toBeUndefined();
    }
  });
});
