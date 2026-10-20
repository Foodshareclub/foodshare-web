/**
 * Shared utilities barrel.
 *
 * Deliberately small. `cn()` is imported by 208 files, so every symbol reachable
 * from here is reachable from every one of them — including from every client
 * component, in every route's first-load bundle.
 *
 * This used to re-export `./security`, `./observability` and `./performance`,
 * and those barrels pull in `lib/security/mfa.ts` (which imports the *browser*
 * Supabase client, ~245 KB raw), `@sentry/nextjs` a second time, and the token
 * manager. Measured against the production build, that chain accounted for
 * ~110 KB gzip on *every* route, including `/privacy` and `/terms` — pages that
 * render a static legal document and need none of it.
 *
 * None of the four re-exported symbols had a single consumer outside this
 * directory, so nothing had to be updated. If you need one, import it from its
 * own module — `@/lib/security/email`, `@/lib/security/html`,
 * `@/lib/observability`, `@/lib/performance` — and pay for it only where it is
 * used. Do not add a re-export here without measuring what it drags in.
 */

export { cn, buttonClasses } from "./cn";
export { formatDate, type DateFormat, type FormatDateOptions } from "./dates";
export { escapeHtml, escapeFilterValue, slugify } from "./strings";
