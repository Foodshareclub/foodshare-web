import { createLogger } from "@/lib/logger";
import { verifyTotp } from "@/lib/wasm-crypto";
import { calculateHaversineDistance } from "@/lib/wasm-geo";
import { calculateSmartWidth } from "@/lib/wasm-image";
import { calculateDistanceDecay, calculateHybridScore } from "@/lib/wasm-search";
import { Hono } from "hono";
import type { Context } from "hono";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");
const logger = createLogger("EngineRoute");

/**
 * The largest body the endpoints will read.
 *
 * The endpoints take a handful of numbers, a secret and a code, or a
 * pair of embedding vectors. A vector of the size the app uses is a few
 * tens of kilobytes of text, so this is generous for what is asked of
 * them, and it keeps a body from being read into memory whole.
 */
const MAX_BODY_LENGTH = 256 * 1024;

const encoder = new TextEncoder();

/** A body that is larger than the endpoints will read. */
class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`body must be at most ${limit} bytes`);
    this.name = "BodyTooLargeError";
  }
}

/**
 * The engine endpoints are public and unauthenticated, and their bodies
 * arrive from the network. Each value is therefore checked before it
 * reaches a module: a `&str` parameter is read out of the module's
 * memory by length, so a value that is not a string sends it off the end
 * of the allocation. That is an out-of-bounds access inside the module
 * rather than a JavaScript exception, so it does not behave like a type
 * error and cannot be caught by the handler.
 *
 * A body that cannot be used is reported with a `TypeError` or a
 * `RangeError`, the same way the bridges report one, and both are
 * answered with a 400.
 */
function readNumber(body: Record<string, unknown>, name: string): number {
  const value = body[name];
  if (typeof value !== "number") {
    throw new TypeError(`${name} must be a number`);
  }
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
  return value;
}

function readString(body: Record<string, unknown>, name: string): string {
  const value = body[name];
  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string`);
  }
  if (value.length === 0) {
    throw new RangeError(`${name} must not be empty`);
  }
  return value;
}

/** A coordinate pair, in the order the modules take them. */
function readCoordinate(body: Record<string, unknown>, latName: string, lngName: string): [number, number] {
  const lat = readNumber(body, latName);
  const lng = readNumber(body, lngName);
  if (lat < -90 || lat > 90) {
    throw new RangeError(`${latName} must be between -90 and 90`);
  }
  if (lng < -180 || lng > 180) {
    throw new RangeError(`${lngName} must be between -180 and 180`);
  }
  return [lat, lng];
}

/**
 * Read the body of a request.
 *
 * A body that is too large is refused before it is read, and one that
 * cannot be parsed is refused as a body that cannot be used, rather than
 * being reported as a fault of the server.
 */
async function readBody(c: Context): Promise<Record<string, unknown>> {
  const declared = c.req.header("content-length");
  if (declared !== undefined) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size > MAX_BODY_LENGTH) {
      throw new BodyTooLargeError(MAX_BODY_LENGTH);
    }
  }

  const text = await c.req.text();
  // A character is at least one byte, so a body with more characters than
  // the limit has more bytes than the limit as well. This is the cheap
  // check, and it bounds the copy the exact one makes.
  if (text.length > MAX_BODY_LENGTH) {
    throw new BodyTooLargeError(MAX_BODY_LENGTH);
  }
  if (encoder.encode(text).byteLength > MAX_BODY_LENGTH) {
    throw new BodyTooLargeError(MAX_BODY_LENGTH);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new TypeError("body must be valid JSON");
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new TypeError("body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

/** Answer a request whose body could not be used. */
function errorResponse(error: unknown): Response {
  // A body that cannot be used is the caller's fault, so it is answered
  // with a 400 rather than being reported as a fault of the server.
  if (error instanceof BodyTooLargeError) {
    return Response.json({ error: error.message }, { status: 413 });
  }
  if (error instanceof TypeError || error instanceof RangeError) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  // A fault of the server is logged and not repeated to the caller: the
  // message can name a module, a field or a file.
  logger.error("Engine endpoint failed", error instanceof Error ? error : new Error(String(error)));
  return Response.json({ error: "Internal error" }, { status: 500 });
}

app.get("/health-check", (c) => {
  return c.json({
    status: "healthy",
    framework: "Hono",
    runtime: "Bun/Next.js (Turbopack)",
    timestamp: new Date().toISOString(),
  });
});

app.get("/version", (c) => {
  return c.json({
    version: "3.0.2",
    stack: ["Bun", "Turbopack", "Oxlint", "Biome", "Hono", "Rust/WASM"],
  });
});

// WASM Engine Status
app.get("/engine/status", (c) => {
  return c.json({
    status: "online",
    engines: {
      search: "foodshare-search (WASM/Rust)",
      geo: "foodshare-geo (WASM/Rust)",
      crypto: "foodshare-crypto (WASM/Rust)",
      compression: "foodshare-compression (WASM/Rust)",
      image: "foodshare-image (WASM/Rust)",
    },
    capabilities: [
      "8-wide autovectorized cosine similarity",
      "Multi-modal hybrid ranking (vector + keyword + geo decay)",
      "High-speed Haversine and PostGIS parsing",
      "RFC 6238 TOTP and timing-safe verification",
      "Brotli / Gzip response compression & ETag generation",
      "Instant zero-allocation magic byte format detection and smart width resizing",
    ],
  });
});

// Hybrid Ranking Endpoint
app.post("/engine/search/hybrid", async (c) => {
  try {
    const body = await readBody(c);
    const textQuery = readString(body, "textQuery");
    const targetText = readString(body, "targetText");
    const distanceKm = body.distanceKm === undefined ? undefined : readNumber(body, "distanceKm");
    const score = calculateHybridScore({
      textQuery,
      targetText,
      queryVector: body.queryVector as number[] | undefined,
      itemVector: body.itemVector as number[] | undefined,
      distanceKm,
    });
    return c.json({ score });
  } catch (err) {
    return errorResponse(err);
  }
});

// Geo Distance & Decay Endpoint
app.post("/engine/geo/distance", async (c) => {
  try {
    const body = await readBody(c);
    const [lat1, lng1] = readCoordinate(body, "lat1", "lng1");
    const [lat2, lng2] = readCoordinate(body, "lat2", "lng2");
    const halfLifeKm = body.halfLifeKm === undefined ? 10 : readNumber(body, "halfLifeKm");
    const distanceKm = calculateHaversineDistance(lat1, lng1, lat2, lng2);
    const decayScore = calculateDistanceDecay(distanceKm, halfLifeKm);
    return c.json({ distanceKm, decayScore });
  } catch (err) {
    return errorResponse(err);
  }
});

// Crypto Verification Endpoint
app.post("/engine/crypto/verify-totp", async (c) => {
  try {
    const body = await readBody(c);
    const secret = readString(body, "secret");
    const token = readString(body, "token");
    const valid = verifyTotp(secret, token);
    return c.json({ valid });
  } catch (err) {
    return errorResponse(err);
  }
});

// Image Geometry Smart Width Endpoint
app.post("/engine/image/smart-width", async (c) => {
  try {
    const body = await readBody(c);
    const fileSizeBytes = readNumber(body, "fileSizeBytes");
    const currentWidth = readNumber(body, "currentWidth");
    const currentHeight = readNumber(body, "currentHeight");
    const targetWidth = calculateSmartWidth(fileSizeBytes, currentWidth, currentHeight);
    return c.json({ targetWidth, needsResize: targetWidth > 0 });
  } catch (err) {
    return errorResponse(err);
  }
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
