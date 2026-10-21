/**
 * AI Configuration
 *
 * Version, provider key accessors, and cache bounds.
 * Extracted from `api-v1-ai/index.ts` — no changes.
 */

export const VERSION = "1.0.0";

export const getGroqKey = () => Deno.env.get("GROQ_API_KEY") || "";
export const getZaiKey = () => Deno.env.get("ZAI_API_KEY") || "";
export const getHfKey = () => Deno.env.get("HUGGINGFACE_ACCESS_TOKEN") || "";

export const HF_CACHE_TTL = 3600000; // 1 hour
export const MAX_INFERENCE_CACHE_SIZE = 200;
