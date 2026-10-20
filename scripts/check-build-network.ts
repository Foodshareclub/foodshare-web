#!/usr/bin/env bun
/**
 * Diagnostic: can this machine reach the database?
 *
 * **This no longer gates `bun run build`, and the reason is a measurement.**
 * The original premise here was that `next build` prerenders every route and a
 * `'use cache'` read executes while prerendering, so a build fetches real data
 * and fails without database access. That premise is false in this codebase:
 * with `cacheComponents` on, every data-bearing route is emitted as a partial
 * prerender — a static shell plus a dynamic hole — and the holes are filled at
 * request time, not at build time. A full `bun next build` was run with this
 * endpoint unreachable and completed 114/114 static pages with zero fetch
 * errors, because nothing in the build attempted a fetch that could fail.
 *
 * Gating the build on it therefore blocked builds that worked. It remains as a
 * standalone check for when something *does* need the database, and it is still
 * worth running before blaming the build for a failure that is really a network
 * one.
 *
 * What it does well is distinguish the two failures that look identical from the
 * outside and have opposite remedies. The experiment is cheap: probe once with
 * certificate verification on and once with it off.
 *
 *   verification fails, unverified succeeds  ->  the certificate is not trusted
 *                                               by this machine. A CA problem.
 *   both fail identically                     ->  there is no TLS handshake at
 *                                               all. Not a certificate problem.
 *
 * On this machine both fail with
 * `tls_validate_record_header:wrong version number`, so the endpoint is not
 * speaking TLS to this network at all. An earlier version of this file
 * attributed the same failure to a certificate and pointed at
 * `NODE_EXTRA_CA_CERTS`, which would have sent someone down that road for an
 * hour and found nothing: there is no certificate to distrust.
 *
 * What it cannot do: verify the *response* is usable. A reachable but
 * unauthorised endpoint still fails the data layer later, correctly.
 *
 * The classification is exported and pure. The network work is not, and is
 * gated on `import.meta.main` so `build-network-check.test.ts` can import
 * `diagnose` without the module deciding to exit the process on import.
 */

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export type Probe = { ok: true; status: number } | { ok: false; error: string };

export type Diagnosis =
  | { kind: "reachable"; status: number }
  | { kind: "unauthorised"; status: number }
  | { kind: "server-error"; status: number }
  | { kind: "no-tls"; secure: string; insecure: string }
  | { kind: "untrusted-certificate"; secure: string }
  | { kind: "unreachable"; secure: string };

/** Some failure never reaches the TLS layer at all. */
const NEVER_TLS =
  /wrong version number|WRONG_VERSION_NUMBER|wrong_version_number|record header|EPROTO|ECONNRESET|ECONNREFUSED|socket hang up|non-?TLS|HTTP response was sent to an HTTPS/i;

/** A certificate was offered and this machine would not accept it. */
const CERT_TRUST = /certificate|CERT_|UNABLE_TO_VERIFY|self.signed|self signed|unable to verify|unknown ca/i;

/**
 * The classification, as a pure function.
 *
 * This is the part worth testing: the two failures that look identical from the
 * outside send you to opposite places, and the wrong one costs an afternoon.
 */
export function diagnose(secure: Probe, insecure: Probe): Diagnosis {
  if (secure.ok) {
    if (secure.status === 401 || secure.status === 403) return { kind: "unauthorised", status: secure.status };
    if (secure.status >= 500) return { kind: "server-error", status: secure.status };
    return { kind: "reachable", status: secure.status };
  }

  if (CERT_TRUST.test(secure.error)) return { kind: "untrusted-certificate", secure: secure.error };

  if (!NEVER_TLS.test(secure.error)) return { kind: "unreachable", secure: secure.error };

  // The decisive pair. An insecure probe that succeeds means the handshake works
  // and only the trust decision failed. An insecure probe that fails the same
  // way means no handshake happened at all.
  if (insecure.ok) return { kind: "untrusted-certificate", secure: secure.error };
  return { kind: "no-tls", secure: secure.error, insecure: insecure.error };
}

function fail(lines: string[]): never {
  console.error(`${RED}${BOLD}✗ the build cannot reach the database${RESET}\n`);
  for (const line of lines) console.error(`  ${line}`);
  console.error("");
  process.exit(1);
}

/**
 * Probe with `fetch`, because that is the client the prerender actually uses:
 * the build runs on Bun, and `@supabase/supabase-js` talks HTTP over `fetch`.
 * An earlier version of this file used `node:https` unconditionally, and the
 * remedy it prints on failure points at a local Supabase over plain HTTP — so
 * following its own advice threw `ERR_INVALID_PROTOCOL: Protocol "http:" not
 * supported` and exited with a stack trace instead of a diagnosis. A tool whose
 * suggested fix does not work is worse than one that gives none. `fetch`
 * handles both schemes, so that trap is gone.
 *
 * The failure classification below is written against the error text Bun
 * produces. `fetch` and `node:https` were compared against a real
 * wrong-version-number handshake, a self-signed certificate and a refused
 * connection, and both clients produce text the two regexes classify the same
 * way:
 *
 *   - wrong version number -> `WRONG_VERSION_NUMBER` (node:https) /
 *     `EPROTO` (fetch) — both match `NEVER_TLS`
 *   - untrusted certificate -> `self signed certificate` in both — both match
 *     `CERT_TRUST`
 *   - connection refused -> `ECONNREFUSED` in both — both match `NEVER_TLS`
 */
async function probe(target: URL, anonKey: string, rejectUnauthorized: boolean): Promise<Probe> {
  try {
    const response = await fetch(target, {
      method: "GET",
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(10_000),
      // Do not follow redirects: this asks whether the endpoint itself answers.
      redirect: "manual",
      tls: { rejectUnauthorized },
    });
    await response.body?.cancel(); // Drain so the socket can close.
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The lines to print for a failure, or `null` when there is nothing to report.
 *
 * Returning the message rather than printing it from each branch keeps the
 * switch out of `main`, which had `fail()` calls in every arm and so read as
 * fall-through to two linters — correctly, since nothing in the type system
 * tells a reader that `fail` never returns.
 */
function explain(verdict: Diagnosis, url: string, target: URL): string[] | null {
  switch (verdict.kind) {
    case "reachable":
      return null;

    case "unauthorised":
      return [
        `${url} answered HTTP ${verdict.status}.`,
        "",
        "The endpoint is reachable and the TLS is fine, but it refused the anon key.",
        "Cached reads cannot work around this: they use the public key by design, so",
        "an unauthorised key fails the prerender.",
      ];

    case "server-error":
      return [
        `${url} answered HTTP ${verdict.status}.`,
        "",
        "The endpoint is reachable but failing. Check the Supabase instance is up and",
        "not mid-deploy.",
      ];

    case "untrusted-certificate":
      return [
        `TLS verification failed talking to ${url}, and the certificate is not trusted by this`,
        "machine. That is a certificate trust problem.",
        "",
        `Observed: ${verdict.secure}`,
        "",
        "  1. A TLS-intercepting proxy whose CA is not in the trust store — add it via",
        "     NODE_EXTRA_CA_CERTS, or trust the intercepting root.",
        "  2. An expired or misissued certificate on the Supabase host.",
        "",
        "Pointing at a local Supabase also works:",
        "  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
      ];

    case "no-tls":
      return [
        `No TLS handshake with ${url} — and this is not a certificate problem.`,
        "",
        "The endpoint never presents a certificate: the connection fails the same way",
        "with verification disabled, so there is nothing to distrust. A certificate",
        "problem fails verification and succeeds without it.",
        "",
        `Observed: ${verdict.secure}`,
        "",
        "What produces this:",
        "",
        "  1. Something on this network is intercepting or replacing the connection",
        "     before TLS. Corporate TLS inspection, a filtering proxy, or a sandbox",
        "     with no route to port 443.",
        "  2. The host is not serving HTTPS on that port, or the address is fronted by",
        "     something that answers in cleartext. It resolves to a Cloudflare address,",
        "     so the origin is probably fine and the path to it is not.",
        "",
        "Check with a tool that separates the layers:",
        `  openssl s_client -connect ${target.hostname}:443 -servername ${target.hostname}`,
        "",
        "A `wrong version number` on the record header means the first bytes back were",
        "not a TLS record. No certificate handling will fix that.",
        "",
        "Pointing at a local Supabase also works:",
        "  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
      ];

    case "unreachable":
      return [
        `Could not reach ${url}: ${verdict.secure}`,
        "",
        "Probed with Node's TLS stack, the one the build uses. Check network access and",
        "that the Supabase instance is up.",
      ];
  }
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    fail([
      "NEXT_PUBLIC_SUPABASE_URL is not set.",
      "",
      "It is needed at build time, not just at runtime: `next build` prerenders",
      "every route, and a cached read executes while prerendering. Copy",
      "`.env.local.example` to `.env.local`, or export the variable.",
    ]);
  }

  if (!anonKey) {
    fail([
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.",
      "",
      "The cached reads use the cookie-less client, which is the only client",
      "safe inside a `'use cache'` scope — the session client reads cookies.",
    ]);
  }

  const target = new URL("/rest/v1/", url);
  const secure = await probe(target, anonKey, true);

  // Always run the second probe when the first failed. A shortcut that guessed
  // the outcome — "if a successful insecure probe would mean untrusted, skip it"
  // — is true for exactly the no-TLS case, so it skipped the probe that decides
  // the question and reported a certificate problem instead. One extra round
  // trip is cheaper than a wrong diagnosis.
  const insecure = secure.ok ? { ok: true as const, status: 0 } : await probe(target, anonKey, false);

  const verdict = diagnose(secure, insecure);

  const explanation = explain(verdict, url, target);
  if (explanation) fail(explanation);
  console.log(`${GREEN}✓ ${url} reachable (HTTP ${verdict.status})${RESET} — the build can prerender real data`);
}
if (import.meta.main) await main();
