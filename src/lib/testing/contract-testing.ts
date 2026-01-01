/**
 * Contract Testing Utilities
 *
 * Validates that client expectations match server responses.
 * Uses Zod schemas for contract verification.
 *
 * @module lib/testing/contract-testing
 */

import { z, ZodSchema } from "zod";

// =============================================================================
// Types
// =============================================================================

export interface ContractDefinition<TRequest = unknown, TResponse = unknown> {
  /** Endpoint path (without base URL) */
  endpoint: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body schema (for POST/PUT/PATCH) */
  requestSchema?: ZodSchema<TRequest>;
  /** Response data schema */
  responseSchema: ZodSchema<TResponse>;
  /** Description of the contract */
  description?: string;
  /** Example request for documentation */
  exampleRequest?: TRequest;
  /** Example response for documentation */
  exampleResponse?: TResponse;
}

export interface ContractTestResult {
  endpoint: string;
  method: string;
  passed: boolean;
  errors: string[];
  requestValid?: boolean;
  responseValid?: boolean;
}

export interface ContractTestSuite {
  name: string;
  contracts: ContractDefinition[];
  results: ContractTestResult[];
  passed: boolean;
}

// =============================================================================
// Common Response Schemas
// =============================================================================

/**
 * Standard API response wrapper schema
 */
export const apiResponseSchema = <T extends ZodSchema>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        requestId: z.string(),
        timestamp: z.string(),
        responseTime: z.number(),
      })
      .optional(),
  });

/**
 * Standard API error response schema
 */
export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

/**
 * Paginated response schema
 */
export const paginatedSchema = <T extends ZodSchema>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasMore: z.boolean(),
  });

// =============================================================================
// Domain Schemas
// =============================================================================

export const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  status: z.enum(["active", "reserved", "completed", "expired"]),
  quantity: z.number(),
  unit: z.string(),
  expiresAt: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  images: z.array(z.string()),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["user", "admin", "moderator"]),
  createdAt: z.string(),
});

export const roomSchema = z.object({
  id: z.string(),
  productId: z.string(),
  requesterId: z.string(),
  ownerId: z.string(),
  status: z.enum(["pending", "accepted", "completed", "cancelled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const messageSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  senderId: z.string(),
  content: z.string(),
  type: z.enum(["text", "image", "system"]),
  createdAt: z.string(),
});

// =============================================================================
// Contract Definitions
// =============================================================================

/**
 * Product API contracts
 */
export const productContracts: ContractDefinition[] = [
  {
    endpoint: "api-v1-products",
    method: "GET",
    responseSchema: z.array(productSchema),
    description: "List all products",
  },
  {
    endpoint: "api-v1-products/:id",
    method: "GET",
    responseSchema: productSchema,
    description: "Get product by ID",
  },
  {
    endpoint: "api-v1-products",
    method: "POST",
    requestSchema: z.object({
      title: z.string().min(1),
      description: z.string(),
      category: z.string(),
      quantity: z.number().positive(),
      unit: z.string(),
      expiresAt: z.string(),
      location: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      images: z.array(z.string()).optional(),
    }),
    responseSchema: productSchema,
    description: "Create a new product",
  },
  {
    endpoint: "api-v1-products/:id",
    method: "PUT",
    requestSchema: z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      quantity: z.number().positive().optional(),
      status: z.enum(["active", "reserved", "completed", "expired"]).optional(),
    }),
    responseSchema: productSchema,
    description: "Update a product",
  },
  {
    endpoint: "api-v1-products/:id",
    method: "DELETE",
    responseSchema: z.void(),
    description: "Delete a product",
  },
];

/**
 * Chat API contracts
 */
export const chatContracts: ContractDefinition[] = [
  {
    endpoint: "api-v1-food-chat/rooms",
    method: "GET",
    responseSchema: z.array(roomSchema),
    description: "List chat rooms",
  },
  {
    endpoint: "api-v1-food-chat/rooms",
    method: "POST",
    requestSchema: z.object({
      productId: z.string(),
      message: z.string().optional(),
    }),
    responseSchema: roomSchema,
    description: "Create a chat room",
  },
  {
    endpoint: "api-v1-food-chat/rooms/:roomId/messages",
    method: "GET",
    responseSchema: z.array(messageSchema),
    description: "List messages in a room",
  },
  {
    endpoint: "api-v1-food-chat/rooms/:roomId/messages",
    method: "POST",
    requestSchema: z.object({
      content: z.string().min(1),
      type: z.enum(["text", "image"]).optional(),
    }),
    responseSchema: messageSchema,
    description: "Send a message",
  },
];

/**
 * Profile API contracts
 */
export const profileContracts: ContractDefinition[] = [
  {
    endpoint: "api-v1-profile",
    method: "GET",
    responseSchema: userSchema,
    description: "Get current user profile",
  },
  {
    endpoint: "api-v1-profile",
    method: "PUT",
    requestSchema: z.object({
      displayName: z.string().optional(),
      bio: z.string().optional(),
    }),
    responseSchema: userSchema,
    description: "Update profile",
  },
];

// =============================================================================
// Contract Testing Functions
// =============================================================================

/**
 * Validate a request against a contract
 */
export function validateRequest<T>(
  contract: ContractDefinition<T>,
  request: unknown
): { valid: boolean; errors: string[] } {
  if (!contract.requestSchema) {
    return { valid: true, errors: [] };
  }

  const result = contract.requestSchema.safeParse(request);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    ),
  };
}

/**
 * Validate a response against a contract
 */
export function validateResponse<TReq, TRes>(
  contract: ContractDefinition<TReq, TRes>,
  response: unknown
): { valid: boolean; errors: string[] } {
  const result = contract.responseSchema.safeParse(response);
  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    ),
  };
}

/**
 * Run contract tests against actual API responses
 */
export async function runContractTests(
  contracts: ContractDefinition[],
  fetchFn: (
    endpoint: string,
    method: string,
    body?: unknown
  ) => Promise<unknown>
): Promise<ContractTestSuite> {
  const results: ContractTestResult[] = [];

  for (const contract of contracts) {
    const result: ContractTestResult = {
      endpoint: contract.endpoint,
      method: contract.method,
      passed: true,
      errors: [],
    };

    try {
      // Validate example request if provided
      if (contract.exampleRequest && contract.requestSchema) {
        const requestValidation = validateRequest(
          contract,
          contract.exampleRequest
        );
        result.requestValid = requestValidation.valid;
        if (!requestValidation.valid) {
          result.errors.push(...requestValidation.errors.map((e) => `Request: ${e}`));
          result.passed = false;
        }
      }

      // Fetch and validate response
      const response = await fetchFn(
        contract.endpoint,
        contract.method,
        contract.exampleRequest
      );

      const responseValidation = validateResponse(contract, response);
      result.responseValid = responseValidation.valid;
      if (!responseValidation.valid) {
        result.errors.push(...responseValidation.errors.map((e) => `Response: ${e}`));
        result.passed = false;
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(`Fetch error: ${(error as Error).message}`);
    }

    results.push(result);
  }

  return {
    name: "API Contract Tests",
    contracts,
    results,
    passed: results.every((r) => r.passed),
  };
}

/**
 * Generate contract documentation
 */
export function generateContractDocs(contracts: ContractDefinition[]): string {
  let docs = "# API Contracts\n\n";

  for (const contract of contracts) {
    docs += `## ${contract.method} ${contract.endpoint}\n\n`;
    if (contract.description) {
      docs += `${contract.description}\n\n`;
    }

    if (contract.requestSchema) {
      docs += "### Request\n\n```json\n";
      docs += JSON.stringify(contract.exampleRequest || {}, null, 2);
      docs += "\n```\n\n";
    }

    docs += "### Response\n\n```json\n";
    docs += JSON.stringify(contract.exampleResponse || {}, null, 2);
    docs += "\n```\n\n---\n\n";
  }

  return docs;
}

// =============================================================================
// Jest Matchers
// =============================================================================

/**
 * Custom Jest matcher for contract validation
 */
export function toMatchContract<T>(
  received: unknown,
  contract: ContractDefinition<unknown, T>
) {
  const validation = validateResponse(contract, received);

  if (validation.valid) {
    return {
      pass: true,
      message: () =>
        `Expected response not to match contract ${contract.endpoint}`,
    };
  }

  return {
    pass: false,
    message: () =>
      `Expected response to match contract ${contract.endpoint}:\n${validation.errors.join("\n")}`,
  };
}

// Extend Jest matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchContract<T>(contract: ContractDefinition<unknown, T>): R;
    }
  }
}

// Register the matcher
if (typeof expect !== "undefined") {
  expect.extend({ toMatchContract });
}
