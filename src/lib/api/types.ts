/**
 * Shared API Types
 *
 * Types for communicating with Edge Functions.
 * These match the schemas in foodshare-backend/functions/api-v1-*
 */

// =============================================================================
// Generic API Response Types
// =============================================================================

export interface APISuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    version?: string;
    responseTime?: number;
  };
  uiHints?: UIHints;
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
    retryAfterMs?: number;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    responseTime?: number;
  };
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

export interface APIPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    responseTime?: number;
  };
  uiHints?: UIHints;
}

// =============================================================================
// UI Hints (sent by backend for client rendering guidance)
// =============================================================================

export interface UIHints {
  refreshAfter?: number;
  displayMode?: string;
  badges?: string[];
  pullToRefresh?: boolean;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
}

// =============================================================================
// Product API Types (matches api-v1-products Edge Function)
// =============================================================================

/**
 * Request body for creating a product via Edge Function
 * Note: Uses camelCase to match Edge Function schema
 */
export interface CreateProductRequest {
  title: string;
  description?: string;
  images: string[];
  postType: "food" | "non-food" | "request";
  latitude: number;
  longitude: number;
  pickupAddress?: string;
  pickupTime?: string;
  categoryId?: number;
  expiresAt?: string;
}

/**
 * Request body for updating a product via Edge Function
 * Requires version for optimistic locking
 */
export interface UpdateProductRequest {
  title?: string;
  description?: string;
  images?: string[];
  pickupAddress?: string;
  pickupTime?: string;
  categoryId?: number;
  expiresAt?: string;
  isActive?: boolean;
  version: number; // Required for optimistic locking
}

/**
 * Product response from Edge Function
 */
export interface ProductResponse {
  id: number;
  title: string;
  description: string | null;
  images: string[];
  postType: "food" | "non-food" | "request";
  location: {
    lat: number;
    lng: number;
    address: string | null;
  };
  pickupTime: string | null;
  categoryId: number | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  version: number;
  userId: string;
}

/**
 * Detailed product response (includes user and category)
 */
export interface ProductDetailResponse extends ProductResponse {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    memberSince: string;
  } | null;
  category: {
    id: number;
    name: string;
    icon: string | null;
  } | null;
}

// =============================================================================
// Chat API Types (matches api-v1-chat Edge Function)
// =============================================================================

export interface CreateMessageRequest {
  roomId: string;
  content: string;
  type?: "text" | "image" | "system";
}

export interface CreateRoomRequest {
  productId: number;
  sellerId: string;
  initialMessage?: string;
}

export interface MessageResponse {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "system";
  createdAt: string;
  readAt: string | null;
}

export interface RoomResponse {
  id: string;
  productId: number;
  buyerId: string;
  sellerId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

// =============================================================================
// Error Code Mapping
// =============================================================================

/**
 * Map Edge Function error codes to web app error codes
 */
export const ERROR_CODE_MAP: Record<string, string> = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMIT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",
  AUTHENTICATION_ERROR: "UNAUTHORIZED",
  AUTHORIZATION_ERROR: "FORBIDDEN",
} as const;
