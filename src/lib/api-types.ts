/**
 * Shared API Response Types
 * Ensures consistent error/success responses across all API routes
 * Follows bleeding-edge TypeScript strict mode patterns
 */

export type ApiErrorResponse<T = never> = {
  success: false;
  error: string;
  code?: string;
  path?: string;
  details?: T;
  timestamp?: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  timestamp?: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse<T>;

export type PaginatedResponse<T> = ApiSuccessResponse<{
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}>;

export type EmptyResponse = ApiSuccessResponse<null>;
