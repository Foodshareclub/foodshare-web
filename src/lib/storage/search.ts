/**
 * Upstash Search Client
 * Used for full-text search across products, users, etc.
 */
import { Search } from '@upstash/search';

// Singleton instance
let searchClient: Search | null = null;

/**
 * Get Search client instance (singleton)
 */
export function getSearchClient(): Search {
  if (!searchClient) {
    searchClient = Search.fromEnv();
  }
  return searchClient;
}

// Index names for different content types
export const SEARCH_INDEXES = {
  PRODUCTS: 'products',
  USERS: 'users',
  MESSAGES: 'messages',
} as const;

export type SearchIndexName = (typeof SEARCH_INDEXES)[keyof typeof SEARCH_INDEXES];

export interface SearchDocument {
  id: string;
  [key: string]: unknown;
}

export interface SearchResult<T = SearchDocument> {
  id: string;
  score: number;
  document: T;
}

/**
 * Index a document for search
 */
export async function indexDocument<T extends SearchDocument>(
  indexName: SearchIndexName,
  document: T
): Promise<boolean> {
  try {
    const client = getSearchClient();
    const index = client.index(indexName);
    await index.upsert({ id: document.id, ...document });
    return true;
  } catch (error) {
    console.error(`[Search] Failed to index document in "${indexName}":`, error);
    return false;
  }
}

/**
 * Index multiple documents
 */
export async function indexDocuments<T extends SearchDocument>(
  indexName: SearchIndexName,
  documents: T[]
): Promise<boolean> {
  if (documents.length === 0) return true;

  try {
    const client = getSearchClient();
    const index = client.index(indexName);
    await index.upsert(documents.map((doc) => ({ id: doc.id, ...doc })));
    return true;
  } catch (error) {
    console.error(`[Search] Failed to index ${documents.length} documents in "${indexName}":`, error);
    return false;
  }
}

/**
 * Search documents
 */
export async function searchDocuments<T = SearchDocument>(
  indexName: SearchIndexName,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    filter?: string;
  }
): Promise<{
  results: SearchResult<T>[];
  total: number;
}> {
  try {
    const client = getSearchClient();
    const index = client.index(indexName);

    const { limit = 10, offset = 0, filter } = options || {};

    const response = await index.search({
      query,
      limit,
      offset,
      filter,
    });

    return {
      results: response.hits.map((hit) => ({
        id: hit.id as string,
        score: hit.score,
        document: hit as unknown as T,
      })),
      total: response.total,
    };
  } catch (error) {
    console.error(`[Search] Query failed in "${indexName}":`, error);
    return { results: [], total: 0 };
  }
}

/**
 * Delete a document from search index
 */
export async function deleteDocument(
  indexName: SearchIndexName,
  documentId: string
): Promise<boolean> {
  try {
    const client = getSearchClient();
    const index = client.index(indexName);
    await index.delete(documentId);
    return true;
  } catch (error) {
    console.error(`[Search] Failed to delete document "${documentId}" from "${indexName}":`, error);
    return false;
  }
}

/**
 * Delete multiple documents from search index
 */
export async function deleteDocuments(
  indexName: SearchIndexName,
  documentIds: string[]
): Promise<number> {
  if (documentIds.length === 0) return 0;

  try {
    const client = getSearchClient();
    const index = client.index(indexName);
    await Promise.all(documentIds.map((id) => index.delete(id)));
    return documentIds.length;
  } catch (error) {
    console.error(`[Search] Failed to delete documents from "${indexName}":`, error);
    return 0;
  }
}

// Product search document type
export interface ProductSearchDocument extends SearchDocument {
  id: string;
  title: string;
  description: string;
  type: string;
  location: string;
  userId: string;
  createdAt: string;
  active: boolean;
}

/**
 * Index a product for search
 */
export async function indexProduct(product: ProductSearchDocument): Promise<boolean> {
  return indexDocument(SEARCH_INDEXES.PRODUCTS, product);
}

/**
 * Index multiple products for search
 */
export async function indexProducts(products: ProductSearchDocument[]): Promise<boolean> {
  return indexDocuments(SEARCH_INDEXES.PRODUCTS, products);
}

/**
 * Search products
 */
export async function searchProducts(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
    activeOnly?: boolean;
    location?: string;
  }
): Promise<{
  results: SearchResult<ProductSearchDocument>[];
  total: number;
}> {
  const { limit = 10, offset = 0, type, activeOnly = true, location } = options || {};

  const filters: string[] = [];

  if (activeOnly) {
    filters.push('active = true');
  }
  if (type) {
    filters.push(`type = "${type}"`);
  }
  if (location) {
    filters.push(`location = "${location}"`);
  }

  const filter = filters.length > 0 ? filters.join(' AND ') : undefined;

  return searchDocuments<ProductSearchDocument>(SEARCH_INDEXES.PRODUCTS, query, {
    limit,
    offset,
    filter,
  });
}

/**
 * Remove a product from search index
 */
export async function removeProductFromSearch(productId: string): Promise<boolean> {
  return deleteDocument(SEARCH_INDEXES.PRODUCTS, productId);
}

/**
 * Remove multiple products from search index
 */
export async function removeProductsFromSearch(productIds: string[]): Promise<number> {
  return deleteDocuments(SEARCH_INDEXES.PRODUCTS, productIds);
}
