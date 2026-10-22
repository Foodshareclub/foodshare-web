import { join } from "bun:path";
/**
 * Tests for the build-network preflight's classification.
 *
 * The two failures this separates look identical from the outside and have
 * opposite remedies. Getting them backwards sends someone to fix a trust store
 * that was never the problem, which is not a five-minute mistake — it is an
 * afternoon of reading certificate documentation about a machine whose network
 * never completed a handshake.
 *
 * The script is a top-level side effect, so only the pure `diagnose` is
 * imported here. The network is not involved in any of these cases.
 */
import { afterAll, describe, expect, it } from "bun:test";

import { NativeResponse } from "../happydom";

const { diagnose } = await import(join(import.meta.dir, "..", "..", "..", "scripts", "check-build-network.ts"));

const ok = (status: number) => ({ ok: true as const, status });
const err = (error: string) => ({ ok: false as const, error });

describe("build network preflight", () => {
  it("passes on any HTTP status below 500", () => {
    // 200 and 404 both prove the handshake completed. The anon key being wrong
    // is a different problem, reported separately.
    expect(diagnose(ok(200), ok(0))).toEqual({ kind: "reachable", status: 200 });
    expect(diagnose(ok(404), ok(0))).toEqual({ kind: "reachable", status: 404 });
  });

  it("separates an unauthorised key from a server error", () => {
    expect(diagnose(ok(401), ok(0)).kind).toBe("unauthorised");
    expect(diagnose(ok(403), ok(0)).kind).toBe("unauthorised");
    expect(diagnose(ok(503), ok(0)).kind).toBe("server-error");
  });

  it("calls a no-handshake failure what it is", () => {
    // This machine's actual failure, and the one an earlier version of the
    // script misdiagnosed as a certificate problem.
    const verdict = diagnose(
      err("error:100000f7:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER"),
      err("error:100000f7:SSL routines:OPENSSL_internal:WRONG_VERSION_NUMBER"),
    );
    expect(verdict.kind).toBe("no-tls");
  });

  it("treats a record-header failure as no TLS", () => {
    expect(
      diagnose(
        err("tls_validate_record_header:wrong version number:ssl/record/methods/tlsany_meth.c:78"),
        err("same again"),
      ).kind,
    ).toBe("no-tls");
  });

  it("calls it a certificate problem when the insecure probe succeeds", () => {
    // The decisive pair: verification fails, verification off works. That is a
    // trust store problem and nothing else.
    expect(diagnose(err("unable to verify the first certificate"), ok(200)).kind).toBe("untrusted-certificate");
  });

  it("calls it a certificate problem on the error text alone", () => {
    expect(diagnose(err("self signed certificate in certificate chain"), err("nope")).kind).toBe(
      "untrusted-certificate",
    );
  });

  it("does not call a refused connection a certificate problem", () => {
    expect(diagnose(err("connect ECONNREFUSED 127.0.0.1:54321"), err("ECONNREFUSED")).kind).toBe("no-tls");
  });

  it("reports anything else as simply unreachable", () => {
    expect(diagnose(err("getaddrinfo ENOTFOUND db.example"), ok(0)).kind).toBe("unreachable");
    expect(diagnose(err("timed out after 10s"), ok(0)).kind).toBe("unreachable");
  });
});

/**
 * End-to-end, because this is the bug the unit tests above cannot see.
 *
 * The script probed with `node:https` unconditionally, so the remedy it prints
 * on failure — point at a local Supabase over plain HTTP — threw
 * `ERR_INVALID_PROTOCOL` and exited with a stack trace. `diagnose` was perfectly
 * correct throughout; the failure was in the plumbing underneath it, in the one
 * path a user is actually told to take.
 */
/**
 * A plain-HTTP server that answers with a fixed status.
 *
 * `Bun.serve`, with `NativeResponse` for the reply. The test runner preloads
 * happy-dom, which replaces the global `Response` with its own implementation,
 * and `Bun.serve` rejects that — it wants a real `Response` back. `NativeResponse`
 * is Bun's own, captured by the preload before happy-dom took the global.
 *
 * (The `fetch` that talks to this server runs in the child process, not here, so
 * happy-dom's cross-origin rules never apply to it.)
 */
const servers: ReturnType<typeof Bun.serve>[] = [];

afterAll(() => {
  for (const server of servers) server.stop(true);
});

async function withServer(
  status: number,
  body: (env: Record<string, string>) => Promise<{ code: number | null; out: string }>,
): Promise<{ code: number | null; out: string }> {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => new NativeResponse("{}", { status }),
  });
  servers.push(server);

  return body({
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${server.port}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon.test-key",
    FORCE_COLOR: "0",
  });
}

// The exit code is null when the process was killed by a signal rather than
// exiting, which is a real outcome and not a missing value.
async function runScript(env: Record<string, string>): Promise<{ code: number | null; out: string }> {
  const child = Bun.spawn([process.execPath, "scripts/check-build-network.ts"], {
    cwd: join(import.meta.dir, "..", "..", ".."),
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
  await child.exited;
  return { code: child.exitCode, out: `${stdout}${stderr}` };
}

describe("build network preflight, end to end", () => {
  it("passes against a reachable plain-HTTP server", async () => {
    // The documented local-Supabase path. It has to work, because it is what the
    // failure message tells people to do.
    const { code, out } = await withServer(200, runScript);
    expect(code).toBe(0);
    expect(out).toContain("the build can prerender real data");
  });

  it("reports an unauthorised key without a stack trace", async () => {
    const { code, out } = await withServer(401, runScript);
    expect(code).toBe(1);
    expect(out).toContain("refused the anon key");
    expect(out).not.toContain("at ");
  });
});
