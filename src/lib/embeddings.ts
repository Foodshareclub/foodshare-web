/**
 * Vector Embeddings Service
 *
 * Generates embeddings using OpenAI and stores them in Upstash Vector
 * for semantic search capabilities.
 */

import OpenAI from "openai";
import {
  upsertVector,
  upsertVectors,
  querySimilar,
  deleteVectors,
  type VectorMetadata,
  type VectorUpsertItem,
  type VectorQueryResult,
} from "@/lib/storage/vector";

// ============================================================================
// Configuration
// ============================================================================

// OpenAI embedding model configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Check if embeddings are available (OpenAI API key configured)
 */
export function isEmbeddingsAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY && !!process.env.UPSTASH_VECTOR_REST_URL;
}

// ============================================================================
// Core Embedding Functions
// ============================================================================

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!isEmbeddingsAvailable()) {
    console.warn("[Embeddings] Not available - missing API keys");
    return null;
  }

  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // Limit input length
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("[Embeddings] Failed to generate:", error);
    return null;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  if (!isEmbeddingsAvailable() || texts.length === 0) {
    return texts.map(() => null);
  }

  try {
    const client = getOpenAIClient();

    // OpenAI supports batch embedding
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 8000)),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Map results back to input order
    const result: (number[] | null)[] = new Array(texts.length).fill(null);
    for (const item of response.data) {
      result[item.index] = item.embedding;
    }

    return result;
  } catch (error) {
    console.error("[Embeddings] Failed to generate batch:", error);
    return texts.map(() => null);
  }
}

// ============================================================================
// Product Embeddings
// ============================================================================

export interface ProductEmbeddingInput {
  id: number;
  title: string;
  description: string;
  type: string;
  location?: string;
  userId: string;
}

/**
 * Generate and store embedding for a product
 */
export async function embedProduct(product: ProductEmbeddingInput): Promise<boolean> {
  // Create combined text for embedding
  const textContent = [product.title, product.description, product.type, product.location]
    .filter(Boolean)
    .join(" | ");

  const embedding = await generateEmbedding(textContent);
  if (!embedding) return false;

  const metadata: VectorMetadata = {
    id: product.id.toString(),
    type: "product",
    title: product.title,
    content: product.description.slice(0, 500),
    userId: product.userId,
    createdAt: new Date().toISOString(),
    productType: product.type,
    location: product.location,
  };

  return upsertVector(`product:${product.id}`, embedding, metadata);
}

/**
 * Generate and store embeddings for multiple products
 */
export async function embedProducts(products: ProductEmbeddingInput[]): Promise<number> {
  if (products.length === 0) return 0;

  const texts = products.map((p) =>
    [p.title, p.description, p.type, p.location].filter(Boolean).join(" | ")
  );

  const embeddings = await generateEmbeddings(texts);

  const vectors: VectorUpsertItem[] = [];
  for (let i = 0; i < products.length; i++) {
    const embedding = embeddings[i];
    if (!embedding) continue;

    const product = products[i];
    vectors.push({
      id: `product:${product.id}`,
      vector: embedding,
      metadata: {
        id: product.id.toString(),
        type: "product",
        title: product.title,
        content: product.description.slice(0, 500),
        userId: product.userId,
        createdAt: new Date().toISOString(),
        productType: product.type,
        location: product.location,
      },
    });
  }

  if (vectors.length === 0) return 0;

  const success = await upsertVectors(vectors);
  return success ? vectors.length : 0;
}

/**
 * Remove product embedding
 */
export async function removeProductEmbedding(productId: number): Promise<boolean> {
  return deleteVectors([`product:${productId}`]);
}

// ============================================================================
// Semantic Search
// ============================================================================

export interface SemanticSearchOptions {
  topK?: number;
  minScore?: number;
  type?: "product" | "user" | "message";
  userId?: string;
}

export interface SemanticSearchResult {
  id: string;
  score: number;
  title?: string;
  content?: string;
  type: string;
  metadata: VectorMetadata | { id: string; type: string };
}

/**
 * Semantic search using text query
 */
export async function semanticSearch(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const { topK = 10, minScore = 0.5, type, userId } = options;

  const queryEmbedding = await generateEmbedding(query);
  if (!queryEmbedding) return [];

  // Build filter
  const filters: string[] = [];
  if (type) filters.push(`type = "${type}"`);
  if (userId) filters.push(`userId = "${userId}"`);
  const filter = filters.length > 0 ? filters.join(" AND ") : undefined;

  const results = await querySimilar(queryEmbedding, {
    topK,
    minScore,
    filter,
    includeMetadata: true,
  });

  return results.map((result) => ({
    id: result.id,
    score: result.score,
    title: result.metadata?.title,
    content: result.metadata?.content,
    type: result.metadata?.type || "unknown",
    metadata: result.metadata || { id: result.id, type: "unknown" },
  }));
}

/**
 * Find similar products by product ID
 */
export async function findSimilarProducts(
  productId: number,
  topK: number = 5
): Promise<SemanticSearchResult[]> {
  // First, fetch the product's embedding
  const embedding = await getProductEmbedding(productId);
  if (!embedding) return [];

  const results = await querySimilar(embedding, {
    topK: topK + 1, // +1 because the product itself will be in results
    filter: 'type = "product"',
    includeMetadata: true,
  });

  // Filter out the source product
  return results
    .filter((r) => r.id !== `product:${productId}`)
    .slice(0, topK)
    .map((result) => ({
      id: result.id,
      score: result.score,
      title: result.metadata?.title,
      content: result.metadata?.content,
      type: "product",
      metadata: result.metadata || { id: result.id, type: "product" },
    }));
}

/**
 * Get embedding for a product (if exists)
 */
async function getProductEmbedding(productId: number): Promise<number[] | null> {
  try {
    const { fetchVectors } = await import("@/lib/storage/vector");
    const results = await fetchVectors([`product:${productId}`], {
      includeVectors: true,
    });
    return results[0]?.vector || null;
  } catch {
    return null;
  }
}

// ============================================================================
// User Profile Embeddings
// ============================================================================

export interface UserEmbeddingInput {
  id: string;
  name: string;
  bio?: string;
  interests?: string[];
  location?: string;
}

/**
 * Generate and store embedding for a user profile
 */
export async function embedUserProfile(user: UserEmbeddingInput): Promise<boolean> {
  const textContent = [user.name, user.bio, user.interests?.join(", "), user.location]
    .filter(Boolean)
    .join(" | ");

  const embedding = await generateEmbedding(textContent);
  if (!embedding) return false;

  const metadata: VectorMetadata = {
    id: user.id,
    type: "user",
    title: user.name,
    content: user.bio?.slice(0, 500),
    createdAt: new Date().toISOString(),
    location: user.location,
  };

  return upsertVector(`user:${user.id}`, embedding, metadata);
}

/**
 * Find similar users (for recommendations)
 */
export async function findSimilarUsers(
  userId: string,
  topK: number = 5
): Promise<SemanticSearchResult[]> {
  try {
    const { fetchVectors } = await import("@/lib/storage/vector");
    const results = await fetchVectors([`user:${userId}`], {
      includeVectors: true,
    });

    const embedding = results[0]?.vector;
    if (!embedding) return [];

    const similar = await querySimilar(embedding, {
      topK: topK + 1,
      filter: 'type = "user"',
      includeMetadata: true,
    });

    return similar
      .filter((r) => r.id !== `user:${userId}`)
      .slice(0, topK)
      .map((result) => ({
        id: result.id,
        score: result.score,
        title: result.metadata?.title,
        content: result.metadata?.content,
        type: "user",
        metadata: result.metadata || { id: result.id, type: "user" },
      }));
  } catch {
    return [];
  }
}
