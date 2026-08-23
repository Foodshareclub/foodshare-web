import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://3467e48f7cb71ccbe4b0e96b0136da1b@o4509901022691328.ingest.de.sentry.io/4511957598797904",
  tracesSampleRate: 1,
  debug: false,
});
