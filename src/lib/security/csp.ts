/**
 * Content-Security-Policy construction.
 *
 * Kept dependency-free and pure so it can be unit-tested — a CSP assembled by
 * string concatenation inside `next.config.ts` is effectively untestable, and a
 * malformed policy silently degrades to no protection at all.
 *
 * ── Why this is not nonce-based ──────────────────────────────────────────────
 * The strict form is `script-src 'self' 'nonce-…' 'strict-dynamic'`. The four
 * things that actually stand in the way, in dependency order:
 *
 *   1. THE CSP IS WIRED IN THE WRONG PLACE. Next reads the nonce from the
 *      **request** CSP header at render time (`app-render.js` →
 *      `getScriptNonceFromHeader`), then stamps it onto its own flight /
 *      bootstrap `<script>` tags. This policy is set from `next.config.ts`
 *      `headers()`, which is response-side and build-time-constant, so Next
 *      never sees a nonce and ships bare `<script>` tags everywhere. A nonce
 *      migration therefore has to move CSP generation into `src/proxy.ts` and
 *      set it on *both* the request (for Next) and the response (for the
 *      browser). Until that happens, `'unsafe-inline'` is load-bearing for the
 *      framework itself — this is the dominant reason it is present.
 *
 *   2. STATIC SHELLS. Nonce-based CSP requires dynamic rendering; Next docs
 *      state static optimization/ISR are disabled and PPR is incompatible,
 *      because a shell baked at build time cannot know a per-request nonce.
 *      `cacheComponents: true` plus the 33 prerendered HTML shells in
 *      `.next/server/app/` mean enforcing a nonce policy without first paying
 *      that cost would block hydration on those routes — a production outage.
 *
 *   3. `src/app/layout.tsx:96` renders an executable inline locale/RTL script
 *      via `dangerouslySetInnerHTML`. React does not auto-nonce arbitrary
 *      `<script>` elements, so this one needs an explicit `nonce` prop threaded
 *      from `headers()`. (`GoogleAnalytics`, by contrast, picks the nonce up
 *      from `HeadManagerContext` on its own once one exists.)
 *
 * Previously cited blockers, now REFUTED — recorded so they are not reintroduced:
 *
 *   - `next-intl` was believed to render an unnonced inline bootstrap script.
 *      It does not. v4.13.7's `NextIntlClientProvider` is a 3-line passthrough
 *      to `use-intl`'s `IntlProvider`, and `rg '<script' node_modules/next-intl`
 *      returns zero hits. The provider emits nothing to the DOM. Its `messages`
 *      prop is serialized into **Next's** flight tags, which is probably where
 *      the attribution came from. Its type defs having no `nonce` is true but
 *      irrelevant.
 *   - JSON-LD was cited as 16 unnonced blocks behind `next-safe-jsonld`. There
 *      are 15, they come from `src/lib/jsonld.ts` (no such package exists), and
 *      they are not blockers at all: `<script type="application/ld+json">` is a
 *      non-executed data block, so `script-src` does not apply to it.
 *   - The Leaflet popup's inline `onclick` (a real blocker: event-handler
 *      attributes fall back to `script-src-attr` and a nonce does not allow
 *      them) was removed in favour of a native `<a href>` in
 *      `src/utils/mapHelpers.tsx`.
 *
 * Shipping a strict policy while items 1–3 stand is a guaranteed production
 * outage on a donation platform. This policy instead removes the *other* attack
 * classes, which is most of the value and none of the risk:
 *
 *   - no `<script>` from an arbitrary origin (was: anything at all)
 *   - no `<script src="data:…">` / `blob:` (script smuggling)
 *   - `object-src 'none'` — no plugin content
 *   - `frame-ancestors 'none'` — clickjacking, replacing the weaker
 *     `X-Frame-Options: SAMEORIGIN` (which also cannot protect the app from
 *     itself framing it)
 *   - `base-uri 'self'` — blocks `<base>` tag hijacking of relative URLs
 *   - `form-action 'self'` — blocks credential exfiltration via form posts
 *   - egress allow-list for `img-src` / `connect-src`, so an injected payload
 *     cannot beacon home to an attacker's collector
 *
 * Upgrade path, in order: (1) generate the nonce per request in `proxy.ts` and
 * emit it as `Content-Security-Policy-Report-Only` first, while the enforced
 * policy keeps `'unsafe-inline'`; (2) decide whether the 33 static shells go
 * dynamic or get `'sha256-'` hashes while the streamed responses are nonced;
 * (3) thread `nonce` into the `layout.tsx` locale script; (4) flip enforcement
 * and drop `'unsafe-inline'`.
 */

export interface CspOptions {
  /** Extra origins appended to `connect-src` (e.g. env-driven endpoints). */
  extraConnectSources?: string[];
  /** Extra origins appended to `img-src` (e.g. user-supplied image hosts). */
  extraImageSources?: string[];
  /** Development needs eval for React Fast Refresh and HMR. */
  isDev?: boolean;
}

/**
 * Supabase project origins. Self-hosted in production
 * (`NEXT_PUBLIC_SUPABASE_URL` = https://api.foodshare.club) but the hosted
 * form is also allowed so a preview deploy against Supabase Cloud works.
 */
function supabaseOrigins(envUrl: string | undefined): string[] {
  const origins = ["https://*.supabase.co", "wss://*.supabase.co"];
  if (!envUrl) return origins;
  try {
    const { protocol, host } = new URL(envUrl);
    origins.push(`${protocol}//${host}`);
    const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
    origins.push(`${wsProtocol}//${host}`);
  } catch {
    /* unparseable env — the wildcards above still cover hosted Supabase */
  }
  return origins;
}

const IMG_SRC = [
  "'self'",
  "blob:",
  "data:",
  "https://api.qrserver.com",
  "https://unpkg.com",
  // Carto basemap tiles + OpenStreetMap tiles used by every Leaflet map.
  "https://*.basemaps.cartocdn.com",
  "https://*.tile.openstreetmap.org",
  // Image hosts allow-listed in src/lib/image.ts (next.config.ts remotePatterns).
  "https://*.r2.cloudflarestorage.com",
  "https://firebasestorage.googleapis.com",
];

const CONNECT_SRC = [
  "'self'",
  // Leaflet geocoding via leaflet-geosearch (components/leaflet/SearchMenu.tsx).
  "https://nominatim.openstreetmap.org",
  // Apple Sign-In SDK performs its own XHRs.
  "https://appleid.cdn-apple.com",
  // Google Analytics (env-gated, but the <Script> tag renders unconditionally).
  "https://www.googletagmanager.com",
];

const SCRIPT_SRC = ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://appleid.cdn-apple.com"];

/**
 * Build the policy string. Directives are joined with "; " and values with " ".
 */
export function buildContentSecurityPolicy(options: CspOptions = {}): string {
  const { extraConnectSources = [], extraImageSources = [], isDev = false } = options;

  const connectSrc = [...CONNECT_SRC, ...supabaseOrigins(process.env.NEXT_PUBLIC_SUPABASE_URL), ...extraConnectSources];

  const scriptSrc = isDev
    ? // React Fast Refresh and Turbopack HMR both evaluate strings at runtime.
      [...SCRIPT_SRC, "'unsafe-eval'"]
    : SCRIPT_SRC;

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    // See the module comment: 'unsafe-inline' is a known, accepted gap pending
    // the nonce migration. 'unsafe-eval' is NOT needed in production — there is
    // no eval()/new Function() anywhere in src/ outside src/wasm/, which is
    // server-only.
    ["script-src", scriptSrc],
    // 370 style={{...}} usages across 102 tsx files; nonce support for inline
    // style attributes is not shipped in any browser, so this is unavoidable.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", [...IMG_SRC, ...extraImageSources]],
    ["font-src", ["'self'"]],
    ["media-src", ["'self'"]],
    // Sentry browser reporting uses a same-origin tunnel, so no sentry.io here.
    ["connect-src", connectSrc],
    // Both iframes in the app use srcDoc (admin email preview), so they inherit
    // this policy and resolve to our own origin. No third-party frames exist.
    ["frame-src", ["'self'"]],
    // Web Worker for client-side distance calc + service workers. Same-origin
    // only: no blob: workers, no client-side WebAssembly.
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    // Blocks any framing at all, including same-origin. Stronger than the
    // X-Frame-Options: SAMEORIGIN fallback.
    ["frame-ancestors", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ...(isDev ? [] : ([["upgrade-insecure-requests", []]] as Array<[string, string[]]>)),
  ];

  return directives.map(([name, values]) => (values.length > 0 ? `${name} ${values.join(" ")}` : name)).join("; ");
}
