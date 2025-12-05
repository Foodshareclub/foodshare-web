/**
 * MotherDuck Client (DuckDB Analytics)
 * Used for analytics queries and data warehousing
 * Note: This is a client-side only module (WASM-based)
 */

// MotherDuck connection configuration
export interface MotherDuckConfig {
  token: string;
  database?: string;
}

/**
 * Get MotherDuck configuration from environment
 */
export function getMotherDuckConfig(): MotherDuckConfig {
  const token = process.env.MOTHERDUCK_TOKEN;
  if (!token) {
    throw new Error('MOTHERDUCK_TOKEN environment variable is not set');
  }
  return {
    token,
    database: 'my_db',
  };
}

/**
 * Analytics query types for the application
 */
export const ANALYTICS_QUERIES = {
  // Product analytics
  PRODUCTS_BY_TYPE: `
    SELECT type, COUNT(*) as count, DATE_TRUNC('day', created_at) as date
    FROM products
    GROUP BY type, DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `,

  // User activity
  USER_ACTIVITY: `
    SELECT user_id, COUNT(*) as actions, DATE_TRUNC('day', created_at) as date
    FROM user_actions
    GROUP BY user_id, DATE_TRUNC('day', created_at)
    ORDER BY date DESC
  `,

  // Popular locations
  POPULAR_LOCATIONS: `
    SELECT location, COUNT(*) as listing_count
    FROM products
    WHERE active = true
    GROUP BY location
    ORDER BY listing_count DESC
    LIMIT 10
  `,

  // Daily active users
  DAILY_ACTIVE_USERS: `
    SELECT DATE_TRUNC('day', last_active) as date, COUNT(DISTINCT user_id) as dau
    FROM user_sessions
    WHERE last_active >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', last_active)
    ORDER BY date DESC
  `,
} as const;

export type AnalyticsQueryKey = keyof typeof ANALYTICS_QUERIES;

/**
 * Result type for analytics queries
 */
export interface AnalyticsResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
  executionTime: number;
}

/**
 * Note: MotherDuck WASM client must be used in client components only.
 * 
 * Example usage in a client component:
 * 
 * ```typescript
 * 'use client';
 * 
 * import { useEffect, useState } from 'react';
 * import { MDConnection } from '@motherduck/wasm-client';
 * import { getMotherDuckConfig, ANALYTICS_QUERIES } from '@/lib/storage/motherduck';
 * 
 * export function AnalyticsDashboard() {
 *   const [data, setData] = useState(null);
 * 
 *   useEffect(() => {
 *     async function fetchAnalytics() {
 *       const config = getMotherDuckConfig();
 *       const connection = MDConnection.create({ mdToken: config.token });
 *       await connection.connect();
 *       
 *       const result = await connection.evaluateQuery(ANALYTICS_QUERIES.PRODUCTS_BY_TYPE);
 *       setData(result.data.toRows());
 *       
 *       await connection.close();
 *     }
 *     fetchAnalytics();
 *   }, []);
 * 
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 */

// Export environment variable names for reference
export const MOTHERDUCK_ENV = {
  TOKEN: 'MOTHERDUCK_TOKEN',
  READ_SCALING_TOKEN: 'MOTHERDUCK_READ_SCALING_TOKEN',
} as const;
