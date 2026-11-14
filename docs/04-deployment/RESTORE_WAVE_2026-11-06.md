# Restore Wave 2026-11-06 — tunnel + F1 + lockdown + F4, one pass

Status: **all code artifacts authored, verified, and signed off. M1 closed at
backend `5719f997` (web mirror `019c22a2`); M-RLS closed at backend
`fb688685` (v2 drop-only revision of `20471db7`, web mirror in the same
push). M2 retracted, end state A confirmed
(§Design decisions). What remains is execution: the operator runs
`CLOUDFLARE-TUNNEL-OUTAGE-RUNBOOK.md` steps 1–5 with the wave insertions below —
run it, or hand over estate-runner access and the team coordinates the run.**
The Q3 product sign-off and the PAT are both optional and non-blocking
(§Open items).
**As of 2026-11-12 a partial restore is in progress — read §Partial-restore
state first; it supersedes the §Execution order sequencing from the current
state (the target order is unchanged).**

## Partial-restore state (probed 2026-11-12)

A partial restore is under way and it invalidated two premises of this doc.
The continuation below applies **from the current state**; the target end
state and artifact set are unchanged.

**Facts (probes, 2026-11-12):**

- `foodshare.club/` → 200, real app. `api.`/`studio.` still dark (identical
  pre-restore TLS signature). Web is up; the API plane is not.
- The anon key baked into the live web bundle (role=anon, iat 2026-06-21) →
  **401 "Invalid API key"** on the production default domain. The deployed
  web is a **data-less shell**: every Supabase call 401s.
- The local untracked `foodshare-web/.env.production` holds a non-JWT
  placeholder (payload decodes to an `access`/`sessings` blob) — no local env
  file on this machine is a key source. The CI secrets and the Supabase
  dashboard are the only ones.
- The production default domain (`<ref>.supabase.co`) **resolves and serves a
  live PostgREST** — correcting the earlier "dark-by-NXDOMAIN" premise in the
  thread. It is _not_ dark; it is key-gated.
- **The production project is quota-restricted** — probed 2026-11-12 on the
  default domain: `GET /auth/v1/authorize?provider=google` (the one auth
  endpoint that skips the apikey gate) returns **402
  `exceed_db_size_quota`**. GoTrue rides the same project host, so while the
  restriction is live it cannot mint sessions at all: **clear the DB-size quota
  violation before re-exposure** (runbook step 3.6) or the restored site 402s
  on every auth call.

**Consequence — the leak invariant is sharper than "M1 before re-exposure":**
with no valid anon key in circulation (bundle key proven invalid on the live
default domain), the exact-location trio is currently unreachable on _every_
surface — default domain and tunnel alike. That closure is **accidental**
(key invalidation), not the designed M1 closure. The invariant for the rest
of the wave: **no newly-minted valid anon key may reach a public surface
(web bundle, app build, public env) before M1 is applied.** Re-exposing the
tunnel is not the leak path — a valid key is.

**Re-sequenced continuation (from the current partial state):** 0. Operator: confirm in the Supabase dashboard whether the JWT signing secret
was rotated (the bundle-key mismatch implies it — or the project config
changed; the runbook actions are identical either way) and pull the
**current valid anon + service_role keys**. Also clear the **DB-size quota
violation** in the same dashboard pass (probed 402 `exceed_db_size_quota`;
runbook step 3.6) — while it is active GoTrue cannot mint any session, which
makes every other step moot. All §6 legs below run with keys minted after this
step.

1. Apply M0 + M1 (wave insertion A). The dark window is the key invalidation,
   not the tunnel state — M1's deadline is "before any new valid anon key
   ships", and right now that window is wide open.
2. Update the key-bearing envs in the same pass: edge-functions
   `SUPABASE_ANON_KEY` **and** the service-role key (both invalidate
   together), web CI secrets (`NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`), app CI secrets (`SUPABASE_URL` /
   `SUPABASE_ANON_KEY` — `android.yml:233,521`; the iOS build config takes
   the publishable key, see the fleet note below).
3. Finish runbook steps 2–4 (api/studio tunnel, CF re-exposure —
   **landed 2026-11-13**: `api.` = Kong 404 over h2, studio 302,
   unauthenticated `?check=services` = 200 pre-F4) + **F4 edge-function
   deploy (gate)** + E1/E2 (wave insertion B, envs **after** the gate —
   hard gate below) + **web rebuild/redeploy** with the current key.
4. §6 verification with freshly-minted keys (@verifier leg 0: rotation status;
   leg 3: post-rotation mint requirement).

**Client-fleet consequence of a rotated JWT secret:** web recovers with a
rebuild (minutes); edge functions with the env update (minutes). The app
fleets are **asymmetric** — the two platforms use different credential
namespaces, and only one is necessarily invalidated by the rotation:

- **Android** bakes the **legacy anon JWT** (`SUPABASE_ANON_KEY` via
  `android.yml:233,521`) → if the JWT secret rotated, this fleet 401s on
  every call until a release ships the current key.
- **iOS** reads a **publishable key** (`supabasePublishableKey` → Keychain,
  `SecretsManager.swift:26-47`) — a separate namespace from
  SECRET_KEY_BASE-signed JWTs; **a JWT-secret rotation does not necessarily
  invalidate it.** Question 3 on the leg-0 list (dashboard, API → Keys)
  settles it: still valid → the iOS fleet resumes with the api, **no release
  needed**; invalidated → the iOS build config needs the new key in the next
  release.
Apps are already down (api dark), so any required release _extends_ the app
outage rather than creating one — the product decision for @user (emergency
release vs next scheduled release) applies **per platform, per the Q3
answer**.

## Contingency: self-hosted runner fleet down (observed 2026-11-13)

The estate VPS is the critical path while its runner pool is
0-registered (observed 2026-11-13: empty runner list, `supabase-rest`
unhealthy, backup service dead; **2026-11-14: the runner flaps 0→1 but
does not drain the queue — CI jobs pending 5h+ against a registered
runner; for the operator's VPS item, "recovered" means a full CI/CD run
*completes*, not runner count = 1** — dead backup first, per the
standing order). Adjudication for the batch gate's
"CI green" leg, per the dead-origin rule:

- **Queue-blocked legs** (Test/Lint/Validate-migrations/E2E queued
  indefinitely on 0 runners) are **ENVIRONMENTAL** — the fleet is the
  failure, not the code. No code action; closure = fleet recovery +
  green re-run.
- **Content reds** (jobs that ran and failed on measured content — the
  storage-lane `contract-drift` unreferenced-columns and `doc-drift`
  oracle.md-figure failures) do **not** match the dead-origin signature:
  they are **real findings in the normal lane**, fleet-independent, and
  must clear before the CI-green leg. They pre-date M-RLS and do not
  affect M-RLS's standing.
- **The migration apply (M0 + M1 + M-RLS + storage) is an operator
  action on the estate, not a CI job — it proceeds regardless of the
  fleet.** The CI-green leg is the *evidence* leg: interim standing =
  by-construction verifies + the GitHub-hosted legs that ran; closure =
  fleet re-run green after recovery.
- The E2E-gated deploy step proceeds per the runbook with the E2E gate
  **explicitly waived on the record** (E2E is structurally
  dead-origin-dependent — the three production-wiring points in
  `web.yml`; §6 is the verification that matters).
- Dependabot PR merges (the hono wave) are blocked until the fleet
  re-runs their CI.

## Prerequisites

- Estate runner / operator box access (runbook standing notes) + CF and
  Supabase dashboards.
- Check the self-hosted GH runner is online **as part of runbook step 1**
  (the operator is already on the machine). If it is down, restore it before
  the post-restore nightly re-run — a dead runner queues deploy/nightly jobs
  and confounds the E2E attribution. (This replaces the PAT "runner status"
  ask for wave purposes.)

## Execution order

1. **Runbook steps 1–3** (tunnel token → podman machine → quadlets).
   Origin stays dark.
2. **Wave insertion A — apply pending Supabase migrations, origin still dark,
   as one batch:**
   - M0: the pending migration batch — the original 5 (engagement state,
     internal-analytics restriction, function privilege lockdown,
     post-location privacy, image upload quota) **plus everything else
     pending per the pre-fix cluster-catalog probe**: the batch grew on
     backend main 2026-11-08/12 (the `20261108*` drop-dead batch — 249
     columns, 9 views, dead service-role policies, indexes, triggers,
     cron dedup — and
     `20261112120000_storage_authenticated_owner_access.sql`). Apply the
     exact pending list from the probe, one transaction-wrapped batch,
     origin dark.
   - M1: `20261106000000_f1_posts_anon_column_grants.sql` @ backend
     `5719f997` (web mirror `019c22a2`) — `BEGIN;` → `REVOKE SELECT ON
public.posts FROM anon` → `GRANT SELECT (46 columns = 49 Row −
{location, location_json, post_address}) TO anon` → `COMMIT;` →
     `NOTIFY pgrst, 'reload schema';`, matching the tree's privilege-migration
     convention. **Signed off by security.** Do not split the apply: the
     `posts_with_location` view is `security_invoker`, so anon needs the column
     grants for the view to keep working (a bare revoke breaks public browse at
     re-exposure).
   - M-RLS: `20261112000000_rls_privilege_fixes.sql` @ backend `fb688685`
     (v2 drop-only revision of `20471db7`, web mirror pushed with this doc) —
     closes F-013 (waste_logs policies keyed on the user-writable
     `household_id` JWT claim → the households-join pattern of the
     `household_waste_logs` sibling + the safe profile branch), F-010
     (telegram_user_states: permissive PUBLIC policy dropped, nothing
     created) and F-011 (rate_limits: same; no owner column exists), plus
     class completion: the 13 remaining TO-less (=> PUBLIC) policies on
     service-owned tables resolved — nine dropped with no replacement
     (their service-role predicates were inert: service_role bypasses RLS
     and no subject role can carry a genuine service_role claim), four
     re-created `TO authenticated` with predicates verbatim from the
     catalog. **v2 (2026-11-12):** the v1 batch also re-created the nine
     Section-B policies and the two F-010/F-011 policies `TO service_role`
     (eleven in all) — a policy whose TO list names only BYPASSRLS roles
     is a rule the database never applies, and `contract-drift.test.ts`
     rejects exactly that shape, so v1 failed the full suite by
     construction; v2 deletes those CREATE blocks. Observable behaviour is
     unchanged: zero policies + RLS enabled is default-deny for every
     subject role, and service_role keeps its BYPASSRLS access — the same
     end state `20261108240000_drop_dead_service_role_policies`
     established. Same `BEGIN/COMMIT/NOTIFY pgrst` convention, **same
     batch as M1**: the re-exposed surface must not carry the vulnerable
     policies. `catalog.json` regenerated via the PG17 oracle for this file;
     the companion `rls-audit.test.ts` case fix (F-012) is what makes the
     estate's own RLS audit see all of it — 27/27 green.
   - M2 (owner-scoped view): **retracted** — not in this wave and not in phase
     2 as specced. See §Design decisions.
3. **Wave insertion B — deploy the new web build + edge functions**
   (C1 web `55dc4c9d`; F4 edge functions). **Hard gate on
   edge-function deploy order (2026-11-13 ruling, @cybersecurity +
   @lead, from the live probe): the F4-gated build deploys strictly
   before — or atomically with — E1 and the service secrets it reads;
   never envs first.** The build still serving at 2026-11-13
   (unauthenticated `?check=services` = 200) is pre-F4, and its handler
   reads the 16 service secret names (Vault or env;
   `api-v1-cache/lib/health.ts` `checkUpstashServices`). Today they are
   all template placeholders, so the body is safe wording only
   (@verifier's 2026-11-13 probe: zero real-value tokens in the body).
   Once real values are set, that same unauthenticated body serves the
   raw service responses (`details`) — the load-bearing exposure:
   QStash is checked at `/v2/schedules` through the same path, so the
   estate's full schedule inventory (callback endpoints, intervals)
   plus live Vector/Search counts are anonymously readable:
   operationally reusable estate intelligence. No credential value
   reaches the body at any point (tokens ride the Authorization header
   only), and the catch path serializes `error.message` only — in Deno
   the host lives in `error.cause`, which is never serialized; measured
   2026-11-14 on Deno 2.9.8 (DNS/connect failures surface as the
   generic "fetch failed", the port-block string is host-free), the
   residual error-path exposure is generic messaging. E1 itself is not
   read by the pre-F4 build; the gate covers it anyway because
   insertion B sets E1/E2 and the service envs in the same pass. E2's
   auth-container copy is outside the gate — the echo surface is the
   api-v1-cache handler only. **MEDIUM (separate from the gate, carded
   as `t_b95f3346`): strip `details` (raw service response) from the
   health results — the load-bearing fix — and keep error messages
   host-free (defense-in-depth in case a future change starts
   serializing `error.cause`): a health endpoint should not echo
   service response content even when gated.**
   - E1: `INTERNAL_SERVICE_SECRET` in `.env.functions` (F4's gated
     `?check=services` returns 503 without it — that 503 is the intended
     loud failure). Set **after** the F4-gated build is serving.
     External monitor does not probe this endpoint (verified in
     both vendored copies). Anyone with dashboards hitting
     `?check=services` unauthenticated will get 401/503 by design —
     tell them.
   - E2: `GOTRUE_HOOK_SEND_EMAIL_SECRETS` in the auth container **and**
     `.env.functions` — without both, all auth mail (signup/recovery/
     magic-link) goes silently dark.
4. **Runbook step 4** — CF `api.`/`ai.` records. Origin now exposed.
5. **Runbook step 5** — Supabase Auth correction.
6. **Wave verification (§6 + wave triple, @verifier):**
   - §6 runbook probes (site 200, api TLS handshake, no stale magic-link host).
   - F1 triple: anon raw exact columns → 401/403; anon `posts_with_location`
     → 200 (its grants are untouched by M1 — the GRANT half buys exactly
     this); authenticated raw exact → 200 flagged (phase 2 removes it).
   - F4 gate probe (doubles as the F4 deploy confirmation):
     `curl -s -o /dev/null -w '%{http_code}'
'https://api.foodshare.club/functions/v1/api-v1-cache?check=services'`
     — **401** = gate live, E1 configured, anonymous correctly refused
     (pass, @verifier runs the anonymous leg); **200** = pre-F4 function
     still being served — the wave's edge-function deploy did not land,
     stop and fix it before finishing; **503** = F4 deployed but E1
     missing — set `INTERNAL_SERVICE_SECRET` and restart the function
     (dead-but-loud; nothing else in the estate probes this endpoint —
     both vendored external-monitor copies checked, 0 references).
     **Observed 2026-11-13 after re-exposure: 200** — pre-F4 build
     serving; per the rule the F4 deploy + E1 step precedes every §6
     leg, and the F4-before-envs hard gate (wave insertion B) applies
     to that deploy.
     Operator runs the with-token leg: same URL with
     `Authorization: Bearer $INTER...RET` → expect 200
     (the secret does not ride through the team thread).
   - Auth-mail smoke: one real magic-link end-to-end (E2 coupling — a
     "restored" origin with silent auth-mail failure looks like a second
     outage).
   - 16 E2E shards + blob failure-shape per the acceptance rewording.

## Verified artifact record (as of this doc)

| Artifact                               | Repo @ SHA                                                      | Verified by                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 (pending batch: original 5 + `20261108*` drop-dead + `20261112120000` storage; exact pending list per the pre-fix catalog probe) | backend main; web mirror byte-identical **except** `20261112120000` (absent from web origin) | verifier (diff -rq) — the 1-file gap closes with the wave re-sync, which must cover migrations as well as functions |
| M1 anon REVOKE+GRANT                   | backend `5719f997` (web mirror `019c22a2`; original `aec49efd`) | verifier — column math recomputed: 49 Row − 46 GRANT = exactly the trio, no phantoms; security — signed off (convention edit: `BEGIN/COMMIT` + `NOTIFY pgrst`) |
| M-RLS privilege fixes (F-013/F-010/F-011 + F-012 + 13-policy class) | backend `fb688685` (v2, 2026-11-12 — drop-only, BYPASSRLS contract fix; original `20471db7`; web mirror in the same push) | security — fix shapes specified per finding; hermes — predicates copied verbatim from the PG17-oracle catalog, 27/27 rls-audit + oracle green; v2 verified clean at tip `4d46337b`: BYPASSRLS contract now passes, remaining tip failures pre-date the fix (attributed on the runbook card) |
| C1 (8 web sites) + Brevo HEAD deletion | web `55dc4c9d`                                                  | verifier — 8 sites line-by-line, 85/85 tests, type-check exit 0; Brevo absence confirmed via anonymous public clone                                            |
| F4 internal gate                       | backend `d1c3c28e` + `a84487c2`                                 | security — 8/8 new tests; strict check still exactly the 111 pre-existing budgeted errors                                                                      |
| api-v1-cache health echo strip (MEDIUM)| carded `t_b95f3346` (ready, default) — not yet on origin; lands on backend before the F4 deploy step so one deploy carries gate + echo-strip | architect — spec; acceptance = local deno tests at the pushed SHA (fleet-independent); does not hold the F4 deploy (gate-only build is safe under the ordering gate) |
| F1 mapping (109 = 31/72/6)             | backend `ab406777`                                              | verifier — counts reconciled, four-path client inventory                                                                                                       |
| Type-debt bug + follow-ups             | backend `d1e069e7`                                              | verifier — 111/30 reproduced                                                                                                                                   |
| Mirror state                           | functions: exactly 3-file F4 drift (expected; grows to the same 3 files with new content when `t_b95f3346` lands); migrations: 1 file absent (`20261112120000`) | verifier — `vendored` job red **by design** until the wave re-sync (which must cover both surfaces)                    |

## Post-wave (explicitly not in this wave)

- **Phase 2** (gated on re-pointed app builds live): authenticated column
  REVOKE (same REVOKE+GRANT shape) + 25 re-points (web 22 / edge 1 / app 2;
  GDPR export composes user-client safe columns + `get_post_exact_location`
  for own rows).
- **M2** — owner-scoped view, if Q3 + the phase-2 end-state decision require
  it (see §Open items).
- **Functions mirror re-sync** (web ← backend) — resolves the 3-file F4 drift;
  `vendored` job red→green is the closure signal.
- Dependabot: 1 moderate ≤48h of restoration; 3 low next maintenance cycle.
- Rotation queue (operator, **authoritative list in the backend action doc
  @ `3c153775`** — updated 2026-11-12, ~28 history-only values, P0→P2
  ordered): **P0 today: AWS full key pair** (ID + secret access key in public
  history — deactivate in IAM; the earlier "ID-only" claim is refuted) and
  **Supabase JWT signing secret** — verify against production and rotate at
  re-exposure (session-invalidating; per §Partial-restore state the deployed
  keys no longer validate, so leg 0 may find it already rotated — **if NOT
  rotated, the at-re-exposure timing is void: rotate immediately**, the next
  minted anon key re-opens the exact-location path until M1 lands). **P1**:
  2× Supabase PAT + Postgres password (rotate in the same window as the
  key-bearing env updates in step 2 above — it touches every `DATABASE_URL`
  consumer). **P2**: remaining Upstash (8 tokens / 3 projects) / MotherDuck /
  Vercel / QStash / Resend / app-repo values per the doc.
- App branch hygiene: none remaining (T2 closed — `feat/bun-tsrs-migration`
  deleted local + remote, full ancestor of main).

## Design decisions (settled 2026-11-06)

- **M2 (owner-scoped view): retracted.** Post-phase-2, with `posts_select_policy`'s
  owner branch intact (no wave migration touches it) and phase 2 specced as
  REVOKE + 46-column GRANT, an owner keeps: own-inactive rows' safe columns via
  the raw table (RLS owner branch) + exact via `get_post_exact_location`
  (owner-gated, no `is_active` filter). The view adds zero capability in the
  specified end state.
- **End state A (column-GRANT shape) confirmed; end state B (full REVOKE +
  view-only client access) not pursued.** Reasons (security): B converts the
  estate's best failure property — loud 403s on a new safe column — into silent
  absence; B adds a third drift surface to a mirror model being actively shrunk;
  the exposure pattern found in this review was over-grants, not RLS bypasses.
  If B is wanted later, the owner view + policy change land together in their
  own wave.
- **Q3 dissolves as a build gate.** Owners listing their own inactive rows is
  already true after C1's user-scoped client swap (web) and becomes so for the
  app via the phase-2 GRANT + `get_post_exact_location`. What remains is a
  product _sign-off_ on that behavior, not a code decision.

## Open items

- **Execute the restore** — web is already up (data-less shell), api/studio
  still dark; continue per §Partial-restore state. Binary unchanged: the
  operator runs it, or hands over estate-runner access and the team
  coordinates.
- **Q3 product sign-off — SIGNED OFF (yes), 2026-11-13** (card t_d7e74d89).
  Owners see their own inactive rows, verified against the live tree:
  `getUserProducts` reads the `posts` base table through the user-scoped
  cookie client (C1, web `55dc4c9d`, on main), and
  `posts_select_policy`'s owner branch (`profile_id = auth.uid()`, verified
  in the PG17 catalog; M1 `20261106000000` carries no policy statements)
  admits own rows regardless of `is_active`; both callers (`/my-posts`,
  `/user-listings`) are session-gated. The app gets the same path in phase
  2 (§Post-wave) — unchanged.
- **PAT** (user, at leisure, non-blocking) — E2E blob reports, Dependabot
  enumeration. Runner status has the operator-side fallback in §Prerequisites.
