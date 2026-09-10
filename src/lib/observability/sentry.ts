/**
 * Canonical Sentry capture helpers.
 *
 * Thin wrappers over `@sentry/nextjs` so app code never imports Sentry
 * directly outside `sentry.*.config.ts`, `instrumentation.ts`, and this module.
 * Re-exported from `@/lib/observability`.
 *
 * Issue → PR linkage is configured server-side in Sentry (GitHub integration
 * + suspect-commits via `SENTRY_RELEASE`). These helpers ensure every capture
 * carries the release, route/component tags, and user context Sentry needs to
 * open issues and link PRs.
 */
import * as Sentry from "@sentry/nextjs";

export interface CaptureContext {
  route?: string;
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

function release(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    process.env.SENTRY_RELEASE ||
    process.env.NEXT_PUBLIC_APP_VERSION
  );
}

function baseContext(context: CaptureContext = {}) {
  return {
    tags: {
      ...(context.route ? { route: context.route } : {}),
      ...(context.component ? { component: context.component } : {}),
      ...(context.action ? { action: context.action } : {}),
      ...(release() ? { release: release() as string } : {}),
    },
    extra: context.metadata,
    user: context.userId ? { id: context.userId } : undefined,
  };
}

/** Capture an exception with route/component/action context. */
export function captureError(error: unknown, context: CaptureContext = {}): string | undefined {
  if (error instanceof Error) {
    return Sentry.captureException(error, baseContext(context));
  }
  return Sentry.captureException(new Error(String(error)), baseContext(context));
}

/** Capture a message at a given level with context. */
export function captureLog(
  message: string,
  level: "info" | "warning" | "error" | "fatal" = "info",
  context: CaptureContext = {}
): string | undefined {
  return Sentry.captureMessage(message, { level, ...baseContext(context) });
}

/** Attach the current user to all subsequent Sentry events. */
export function setSentryUser(userId: string | null | undefined): void {
  Sentry.setUser(userId ? { id: userId } : null);
}
