import { Hono } from "hono";
import { handle } from "hono/vercel";
import { calculateHybridScore, calculateDistanceDecay } from "@/lib/wasm-search";
import { calculateHaversineDistance } from "@/lib/wasm-geo";
import { verifyTotp } from "@/lib/wasm-crypto";
import { calculateSmartWidth } from "@/lib/wasm-image";

const app = new Hono().basePath("/api");

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
    const body = await c.req.json();
    const { textQuery, targetText, queryVector, itemVector, distanceKm } = body;
    if (!textQuery || !targetText) {
      return c.json({ error: "textQuery and targetText are required" }, 400);
    }
    const score = calculateHybridScore({
      textQuery,
      targetText,
      queryVector,
      itemVector,
      distanceKm,
    });
    return c.json({ score });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

// Geo Distance & Decay Endpoint
app.post("/engine/geo/distance", async (c) => {
  try {
    const body = await c.req.json();
    const { lat1, lng1, lat2, lng2, halfLifeKm = 10 } = body;
    if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) {
      return c.json({ error: "lat1, lng1, lat2, lng2 are required" }, 400);
    }
    const distanceKm = calculateHaversineDistance(lat1, lng1, lat2, lng2);
    const decayScore = calculateDistanceDecay(distanceKm, halfLifeKm);
    return c.json({ distanceKm, decayScore });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

// Crypto Verification Endpoint
app.post("/engine/crypto/verify-totp", async (c) => {
  try {
    const body = await c.req.json();
    const { secret, token } = body;
    if (!secret || !token) {
      return c.json({ error: "secret and token are required" }, 400);
    }
    const valid = verifyTotp(secret, token);
    return c.json({ valid });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

// Image Geometry Smart Width Endpoint
app.post("/engine/image/smart-width", async (c) => {
  try {
    const body = await c.req.json();
    const { fileSizeBytes, currentWidth, currentHeight } = body;
    if (fileSizeBytes === undefined || currentWidth === undefined || currentHeight === undefined) {
      return c.json({ error: "fileSizeBytes, currentWidth, and currentHeight are required" }, 400);
    }
    const targetWidth = calculateSmartWidth(fileSizeBytes, currentWidth, currentHeight);
    return c.json({ targetWidth, needsResize: targetWidth > 0 });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

