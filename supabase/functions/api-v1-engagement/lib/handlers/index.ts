/**
 * Engagement Route Dispatch (GET / POST router)
 *
 * Extracted from `api-v1-engagement/index.ts` — no logic changes.
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import type { createHealthHandler } from "../../../_shared/health-handler.ts";
import { getEngagement, getUserBookmarks } from "./get-engagement.ts";
import { recordShare } from "./share.ts";
import { toggleBookmark, toggleFavorite, toggleLike } from "./toggle.ts";
import { handleBatchOperations } from "./batch.ts";
import type { BatchOperationsBody, QueryParams, ShareBody, ToggleBody } from "../schemas.ts";

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  function handleGet(
    ctx: HandlerContext<unknown, QueryParams>,
  ): Promise<Response> {
    // Health check
    const url = new URL(ctx.request.url);
    if (url.pathname.endsWith("/health")) {
      return healthCheck(ctx);
    }

    if (ctx.query.action === "bookmarks") {
      return getUserBookmarks(ctx);
    }
    return getEngagement(ctx);
  }

  function handlePost(
    ctx: HandlerContext<
      ToggleBody | ShareBody | BatchOperationsBody,
      QueryParams
    >,
  ): Promise<Response> {
    const url = new URL(ctx.request.url);

    if (url.pathname.endsWith("/batch")) {
      return handleBatchOperations(
        ctx as HandlerContext<BatchOperationsBody, QueryParams>,
      );
    }

    const action = ctx.query.action;

    switch (action) {
      case "like":
        return toggleLike(ctx as HandlerContext<ToggleBody, QueryParams>);
      case "bookmark":
        return toggleBookmark(ctx as HandlerContext<ToggleBody, QueryParams>);
      case "favorite":
        return toggleFavorite(ctx as HandlerContext<ToggleBody, QueryParams>);
      case "share":
        return recordShare(ctx as HandlerContext<ShareBody, QueryParams>);
      default:
        throw new ValidationError(
          "action query param required (like, bookmark, favorite, share)",
        );
    }
  }

  return { handleGet, handlePost };
}
