/**
 * Fetch wrapper with automatic logging
 * Logs all API requests with timing, status, and size
 */

import { pretty } from './pretty';

type FetchOptions = RequestInit & {
  /** Skip logging for this request */
  silent?: boolean;
  /** Custom label for the request */
  label?: string;
};

/**
 * Logged fetch - wraps native fetch with automatic logging
 */
export async function loggedFetch(
  input: RequestInfo | URL,
  init?: FetchOptions
): Promise<Response> {
  const { silent, label, ...fetchInit } = init || {};
  
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = fetchInit.method?.toUpperCase() || 'GET';
  const startTime = performance.now();

  try {
    const response = await fetch(input, fetchInit);
    const duration = performance.now() - startTime;
    
    if (!silent) {
      // Try to get response size from headers
      const contentLength = response.headers.get('content-length');
      const size = contentLength ? parseInt(contentLength, 10) : undefined;
      
      pretty.api(method, label || url, response.status, duration, size);
    }

    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    if (!silent) {
      pretty.api(method, label || url, 0, duration);
      pretty.error(`Fetch failed: ${label || url}`, error instanceof Error ? error : undefined);
    }

    throw error;
  }
}

/**
 * Create a logged fetch instance with default options
 */
export function createLoggedFetch(defaultOptions?: FetchOptions) {
  return (input: RequestInfo | URL, init?: FetchOptions) => 
    loggedFetch(input, { ...defaultOptions, ...init });
}

/**
 * Measure and log a Supabase query
 */
export async function loggedQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<{ data: T | null; error: Error | null; count?: number | null }>
): Promise<{ data: T | null; error: Error | null; count?: number | null }> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    
    const rowCount = result.count ?? (Array.isArray(result.data) ? result.data.length : undefined);
    
    if (result.error) {
      pretty.error(`DB ${operation} failed on ${table}`, result.error);
    } else {
      pretty.db(operation, table, duration, rowCount);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    pretty.db(operation, table, duration);
    pretty.error(`DB ${operation} exception on ${table}`, error instanceof Error ? error : undefined);
    throw error;
  }
}

export default loggedFetch;
