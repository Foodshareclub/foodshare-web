/**
 * Schema Validation (Zod + Valibot)
 *
 * Dual-schema validation with normalized error output.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import { ValidationError } from "../errors.ts";
import type { Schema } from "./types.ts";

export function validateWithSchema<T>(
  schema: Schema<T>,
  data: unknown,
  location: string,
): T {
  // Try Zod first (check safeParse before _parse, since Zod also has _parse
  // but with a different signature that expects ParseInput, not raw data)
  if (typeof schema.safeParse === "function") {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      throw new ValidationError(`Invalid ${location}`, errors);
    }

    return result.data;
  }

  // Fall back to Valibot
  if (typeof schema._parse === "function") {
    const result = schema._parse(data);

    if ("issues" in result) {
      const errors = result.issues.map((
        issue: { path?: Array<{ key: string }>; message: string },
      ) => ({
        field: issue.path?.map((p: { key: string }) => p.key).join(".") ||
          "root",
        message: issue.message,
      }));
      throw new ValidationError(`Invalid ${location}`, errors);
    }

    return result.output;
  }

  throw new ValidationError(`Invalid schema for ${location}`);
}
