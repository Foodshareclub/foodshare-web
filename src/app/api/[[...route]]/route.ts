import { Hono } from "hono";
import { handle } from "hono/vercel";

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
    stack: ["Bun", "Turbopack", "Oxlint", "Biome", "Hono"],
  });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
