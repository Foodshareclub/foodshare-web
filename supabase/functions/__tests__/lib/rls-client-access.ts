/**
 * Client-writable access detectors for the RLS audit.
 *
 * Pure functions over the catalog's `relations`, `policies` and `grants`, so the
 * audit's sensitivity can be proven on synthetic input (see
 * `rls-audit.test.ts`, "audit sensitivity"). An audit that has only ever run on
 * the live schema cannot show it would notice a hole; it can only show that it
 * did not notice one.
 *
 * Three structurally different ways a client token reaches a write:
 *
 *   1. `grant-without-policy`: `anon`, `authenticated` or `PUBLIC` holds a write
 *      privilege (INSERT/UPDATE/DELETE/TRUNCATE) on an RLS-enabled table that
 *      has no policy at all. Row policies default-deny INSERT/UPDATE/DELETE, but
 *      TRUNCATE is not subject to row-level security, so the grant alone is a
 *      client-reachable destructive write, and the table's access then depends
 *      on nobody ever adding a policy.
 *   2. `permissive-write-policy`: a non-SELECT policy for a client role whose
 *      USING or WITH CHECK is literally `true`.
 *   3. `claim-keyed-policy`: a policy whose predicate trusts a JWT claim the
 *      user can set themselves (`user_metadata`, or any custom top-level claim
 *      such as `household_id`) instead of a server-held fact.
 */

export interface RelationLike {
  readonly name: string;
  readonly kind: string;
  readonly rlsEnabled: boolean;
}

export interface PolicyLike {
  readonly table: string;
  readonly name: string;
  readonly command: string;
  readonly roles: readonly string[];
  readonly using: string | null;
  readonly check: string | null;
}

export interface GrantLike {
  readonly object: string;
  readonly grantee: string;
  readonly privileges: readonly string[];
}

export type FindingKind =
  | "grant-without-policy"
  | "permissive-write-policy"
  | "claim-keyed-policy";

export interface Finding {
  readonly table: string;
  readonly kind: FindingKind;
  readonly detail: string;
}

export const CLIENT_ROLES = new Set(["anon", "authenticated", "public"]);
export const WRITE_PRIVILEGES = new Set(["INSERT", "UPDATE", "DELETE", "TRUNCATE"]);

/**
 * JWT claims a user cannot set. Everything else (`user_metadata` contents, a
 * custom `household_id`) is attacker-chosen for a registered account.
 * `app_metadata` is server-written, so a predicate on it is not flagged.
 */
const TRUSTED_CLAIMS = new Set([
  "role",
  "sub",
  "aud",
  "iss",
  "exp",
  "iat",
  "aal",
  "amr",
  "session_id",
  "is_anonymous",
  "app_metadata",
]);

const normalize = (expr: string | null): string =>
  (expr ?? "").replace(/[\s()]/g, "").toLowerCase();

/** True when the policy applies to a client-reachable role. No TO clause means PUBLIC. */
export function reachesClients(roles: readonly string[]): boolean {
  return roles.length === 0 || roles.some((r) => CLIENT_ROLES.has(r.toLowerCase()));
}

/** Every `auth.jwt() ->> 'claim'` key an expression reads, in pg deparsed or source form. */
export function jwtClaimsRead(expr: string | null): string[] {
  if (!expr) return [];
  const claims: string[] = [];
  const re = /auth\.jwt\(\)(?:\s+AS\s+jwt)?\s*\)?\s*->>?\s*'(\w+)'/gi;
  for (const m of expr.matchAll(re)) claims.push(m[1]);
  // `current_setting('request.jwt.claims', true)::json ->> 'claim'`
  const re2 = /request\.jwt\.claims?[^]*?->>?\s*'(\w+)'/gi;
  for (const m of expr.matchAll(re2)) claims.push(m[1]);
  return claims;
}

export function findClientWritableAccess(input: {
  readonly relations: readonly RelationLike[];
  readonly policies: readonly PolicyLike[];
  readonly grants: readonly GrantLike[];
}): Finding[] {
  const findings: Finding[] = [];
  const rlsTables = input.relations.filter((r) => r.kind === "table" && r.rlsEnabled);
  const rlsNames = new Set(rlsTables.map((r) => r.name));

  const policiesByTable = new Map<string, PolicyLike[]>();
  for (const p of input.policies) {
    policiesByTable.set(p.table, [...(policiesByTable.get(p.table) ?? []), p]);
  }

  // 1. write grants to a client role on an RLS table that has no policy.
  for (const t of rlsTables) {
    if ((policiesByTable.get(t.name) ?? []).length > 0) continue;
    for (const g of input.grants) {
      if (g.object !== t.name || !CLIENT_ROLES.has(g.grantee.toLowerCase())) continue;
      const writes = g.privileges.filter((p) => WRITE_PRIVILEGES.has(p));
      if (writes.length === 0) continue;
      findings.push({
        table: t.name,
        kind: "grant-without-policy",
        detail: `${g.grantee} holds ${writes.join(",")} and the table has no policy`,
      });
    }
  }

  for (const p of input.policies) {
    if (!rlsNames.has(p.table)) continue;
    if (!reachesClients(p.roles)) continue;
    const roles = p.roles.join(",") || "PUBLIC";

    // 2. permissive write policy.
    if (p.command !== "SELECT") {
      for (const [clause, expr] of [["USING", p.using], ["WITH CHECK", p.check]] as const) {
        if (normalize(expr) === "true") {
          findings.push({
            table: p.table,
            kind: "permissive-write-policy",
            detail: `${p.name} [${p.command} -> ${roles}] ${clause} (true)`,
          });
        }
      }
    }

    // 3. claim-keyed policy, any command: a read keyed on a forgeable claim is a
    // cross-tenant read.
    const untrusted = new Set(
      [...jwtClaimsRead(p.using), ...jwtClaimsRead(p.check)].filter(
        (c) => !TRUSTED_CLAIMS.has(c),
      ),
    );
    if (/user_metadata|raw_user_meta_data/i.test((p.using ?? "") + (p.check ?? ""))) {
      untrusted.add("user_metadata");
    }
    for (const claim of untrusted) {
      findings.push({
        table: p.table,
        kind: "claim-keyed-policy",
        detail: `${p.name} [${p.command} -> ${roles}] trusts user-writable claim '${claim}'`,
      });
    }
  }

  return findings.sort((a, b) =>
    a.table.localeCompare(b.table) || a.kind.localeCompare(b.kind) ||
    a.detail.localeCompare(b.detail)
  );
}
