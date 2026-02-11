/**
 * Zod Validation Helpers
 * Schema validation utilities that return ActionResult
 */

import { type ZodError, type ZodSchema } from "zod";
import type { ActionResult } from "./types";
import { success, failure, validationError } from "./server-actions";

/**
 * Validate data against a Zod schema
 * Returns ActionResult with validation errors if invalid
 */
export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): ActionResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    return failure(validationError("Validation failed", errors));
  }

  return success(result.data);
}

/**
 * Format Zod errors into readable messages
 */
export function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "value";
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}
