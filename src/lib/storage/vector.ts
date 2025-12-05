/**
 * Upstash Vector Client
 * Used for semantic search and embeddings
 */
import { Index } from '@upstash/vector';

// Singleton instance
let vectorIndex: Index | null = null;

/**
 * Get Vector index instance (singleton)
 */
export function getVectorIndex(): Index {
  if (!vectorIndex) {
    vectorIndex = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
  }
  return vectorIndex;
}

export type VectorContentType = 'product' | 'user' | 'message' | 'location';

export interface VectorMetadata {
  id: string;
  type: VectorContentType;
  title?: string;
  content?: string;
  userId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface VectorUpsertItem {
  id: string;
  vector: number[];
  metadata?: VectorMetadata;
}

export interface VectorQueryResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
  vector?: number[];
}

/**
 * Upsert vectors into the index with error handling
 */
export async function upsertVectors(vectors: VectorUpsertItem[]): Promise<boolean> {
  if (vectors.length === 0) return true;

  try {
    const index = getVectorIndex();
    await index.upsert(vectors);
    return true;
  } catch (error) {
    console.error(`[Vector] Failed to upsert ${vectors.length} vectors:`, error);
    return false;
  }
}

/**
 * Upsert a single vector
 */
export async function upsertVector(
  id: string,
  vector: number[],
  metadata?: VectorMetadata
): Promise<boolean> {
  return upsertVectors([{ id, vector, metadata }]);
}

/**
 * Query similar vectors
 */
export async function querySimilar(
  vector: number[],
  options?: {
    topK?: number;
    filter?: string;
    includeMetadata?: boolean;
    includeVectors?: boolean;
    minScore?: number;
  }
): Promise<VectorQueryResult[]> {
  try {
    const index = getVectorIndex();
    const {
      topK = 10,
      filter,
      includeMetadata = true,
      includeVectors = false,
      minScore = 0,
    } = options || {};

    const results = await index.query({
      vector,
      topK,
      filter,
      includeMetadata,
      includeVectors,
    });

    return results
      .filter((result) => result.score >= minScore)
      .map((result) => ({
        id: result.id as string,
        score: result.score,
        metadata: result.metadata as VectorMetadata | undefined,
        vector: result.vector,
      }));
  } catch (error) {
    console.error(`[Vector] Query failed:`, error);
    return [];
  }
}

/**
 * Query similar items by type
 */
export async function querySimilarByType(
  vector: number[],
  type: VectorContentType,
  options?: { topK?: number; minScore?: number }
): Promise<VectorQueryResult[]> {
  return querySimilar(vector, {
    ...options,
    filter: `type = "${type}"`,
    includeMetadata: true,
  });
}

/**
 * Fetch vectors by IDs
 */
export async function fetchVectors(
  ids: string[],
  options?: { includeMetadata?: boolean; includeVectors?: boolean }
): Promise<Array<VectorQueryResult | null>> {
  if (ids.length === 0) return [];

  try {
    const index = getVectorIndex();
    const { includeMetadata = true, includeVectors = false } = options || {};

    const results = await index.fetch(ids, {
      includeMetadata,
      includeVectors,
    });

    return results.map((result) =>
      result
        ? {
            id: result.id as string,
            score: 1,
            metadata: result.metadata as VectorMetadata | undefined,
            vector: result.vector,
          }
        : null
    );
  } catch (error) {
    console.error(`[Vector] Failed to fetch vectors:`, error);
    return ids.map(() => null);
  }
}

/**
 * Delete vectors by IDs
 */
export async function deleteVectors(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;

  try {
    const index = getVectorIndex();
    await index.delete(ids);
    return true;
  } catch (error) {
    console.error(`[Vector] Failed to delete vectors:`, error);
    return false;
  }
}

/**
 * Delete all vectors for a specific type
 * Note: This queries vectors by type and deletes them in batches
 */
export async function deleteVectorsByType(type: VectorContentType): Promise<boolean> {
  try {
    const index = getVectorIndex();
    // Query vectors with the specified type filter
    const results = await index.query({
      topK: 1000,
      filter: `type = "${type}"`,
      includeMetadata: false,
      vector: new Array(1536).fill(0), // Dummy vector for filter-only query
    });
    
    if (results.length > 0) {
      const ids = results.map((r) => String(r.id));
      await index.delete(ids);
    }
    return true;
  } catch (error) {
    console.error(`[Vector] Failed to delete vectors by type "${type}":`, error);
    return false;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats(): Promise<{
  vectorCount: number;
  pendingVectorCount: number;
  indexSize: number;
  dimension: number;
} | null> {
  try {
    const index = getVectorIndex();
    const info = await index.info();
    return {
      vectorCount: info.vectorCount,
      pendingVectorCount: info.pendingVectorCount,
      indexSize: info.indexSize,
      dimension: info.dimension,
    };
  } catch (error) {
    console.error(`[Vector] Failed to get index stats:`, error);
    return null;
  }
}

// Vector namespaces for different content types
export const VECTOR_NAMESPACES = {
  PRODUCTS: 'products',
  USERS: 'users',
  MESSAGES: 'messages',
  LOCATIONS: 'locations',
} as const;

export type VectorNamespace = (typeof VECTOR_NAMESPACES)[keyof typeof VECTOR_NAMESPACES];
