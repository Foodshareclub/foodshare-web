/**
 * Next.js Instrumentation
 * Initializes Sentry on server and edge runtimes
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (
  error: Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource: string;
    revalidateReason: string | undefined;
    renderType: string;
  }
) => {
  // Import Sentry dynamically to avoid initialization issues
  const Sentry = await import("@sentry/nextjs");

  Sentry.captureException(error, {
    tags: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      renderType: context.renderType,
    },
    extra: {
      path: request.path,
      method: request.method,
      revalidateReason: context.revalidateReason,
    },
  });
};
