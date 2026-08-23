import * as Sentry from "@sentry/nextjs";

export async function GET() {
  Sentry.captureException(new Error("Sentry Test Error from foodshare-web!"));
  throw new Error("Sentry Test Error from foodshare-web!");
}
