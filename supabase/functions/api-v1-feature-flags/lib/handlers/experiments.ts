/**
 * Experiment Variant Handler (GET /experiments/:key)
 *
 * Authenticated deterministic variant assignment.
 * Extracted from `api-v1-feature-flags/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../../_shared/api-handler.ts";
import { AuthenticationError, NotFoundError, ServerError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import type { FlagsQuery } from "../schemas.ts";

export async function handleExperimentVariant(
  ctx: HandlerContext<unknown, FlagsQuery>,
  experimentKey: string,
): Promise<Response> {
  const { supabase, userId, ctx: requestCtx } = ctx;

  if (!userId) {
    throw new AuthenticationError("Authentication required for experiments");
  }

  logger.info("Getting experiment variant", {
    userId: userId.substring(0, 8),
    experimentKey,
    requestId: requestCtx?.requestId,
  });

  const { data, error } = await supabase.rpc("get_experiment_variant", {
    p_user_id: userId,
    p_experiment_key: experimentKey,
  });

  if (error) {
    logger.error("Failed to get experiment variant", {
      error: error.message,
      requestId: requestCtx?.requestId,
    });
    throw new ServerError("Failed to get experiment variant");
  }

  const dbResponse = data as {
    success: boolean;
    experimentKey: string;
    variant: string | null;
    assignedAt?: string;
    isNewAssignment?: boolean;
    reason?: string;
    error?: string;
  };

  if (!dbResponse.success) {
    throw new NotFoundError("Experiment", experimentKey);
  }

  return ok(
    {
      experimentKey: dbResponse.experimentKey,
      variant: dbResponse.variant,
      assignedAt: dbResponse.assignedAt,
      isNewAssignment: dbResponse.isNewAssignment || false,
      reason: dbResponse.reason,
    },
    ctx,
  );
}
