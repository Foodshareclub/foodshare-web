# Restore Wave 2026-11-06 — tunnel + F1 + lockdown + F4, one pass

Status: **all code artifacts authored, verified, and signed off. M1 closed at
backend `5719f997` (web mirror `019c22a2`). M2 retracted, end state A confirmed
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
**current valid anon + service_role keys**. All §6 legs below run with
keys minted after this step.

1. Apply M0 + M1 (wave insertion A). The dark window is the key invalidation,
   not the tunnel state — M1's deadline is "before any new valid anon key
   ships", and right now that window is wide open.
2. Update the key-bearing envs in the same pass: edge-functions
   `SUPABASE_ANON_KEY` **and** the service-role key (both invalidate
   together), web CI secrets (`NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`), app CI secrets (`SUPABASE_URL` /
   `SUPABASE_ANON_KEY` — `android.yml:232-233` and the iOS equivalent).
3. Finish runbook steps 2–4 (api/studio tunnel, CF re-exposure) + E1/E2 (wave
   insertion B) + **web rebuild/redeploy** with the current key.
4. §6 verification with freshly-minted keys (@verifier leg 0: rotation status;
   leg 3: post-rotation mint requirement).

**Client-fleet consequence of a rotated JWT secret:** web recovers with a
rebuild (minutes); edge functions with the env update (minutes); **shipped
apps do not** — the anon key is baked at build time on both platforms
(Keychain/xcconfig on iOS, BuildConfig on Android), so installed fleets 401
until the next app release carries the current key. Apps are already down
(api dark), so the rotation _extends_ the app outage rather than creating one
— a product decision for @user: emergency app release with the current key,
or accept app downtime until the next scheduled release.

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
   - M0: the 5 pending migrations already on backend main (engagement state,
     internal-analytics restriction, function privilege lockdown,
     post-location privacy, image upload quota).
   - M1: `20261106000000_f1_posts_anon_column_grants.sql` @ backend
     `5719f997` (web mirror `019c22a2`) — `BEGIN;` → `REVOKE SELECT ON
public.posts FROM anon` → `GRANT SELECT (46 columns = 49 Row −
{location, location_json, post_address}) TO anon` → `COMMIT;` →
     `NOTIFY pgrst, 'reload schema';`, matching the tree's privilege-migration
     convention. **Signed off by security.** Do not split the apply: the
     `posts_with_location` view is `security_invoker`, so anon needs the column
     grants for the view to keep working (a bare revoke breaks public browse at
     re-exposure).
   - M2 (owner-scoped view): **retracted** — not in this wave and not in phase
     2 as specced. See §Design decisions.
3. **Wave insertion B — deploy the new web build + edge functions**
   (C1 web `55dc4c9d`; F4 edge functions) **before** re-exposure, with env
   coupling set first:
   - E1: `INTERNAL_SERVICE_SECRET` in `.env.functions` (F4's gated
     `?check=services` returns 503 without it — that 503 is the intended loud
     failure). External monitor does not probe this endpoint (verified in
     both vendored copies). Anyone with dashboards hitting `?check=services`
     unauthenticated will get 401/503 by design — tell them.
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
| M0 (5 pending migrations)              | backend, in main, mirror byte-identical on web                  | verifier (diff -rq)                                                                                                                                            |
| M1 anon REVOKE+GRANT                   | backend `5719f997` (web mirror `019c22a2`; original `aec49efd`) | verifier — column math recomputed: 49 Row − 46 GRANT = exactly the trio, no phantoms; security — signed off (convention edit: `BEGIN/COMMIT` + `NOTIFY pgrst`) |
| C1 (8 web sites) + Brevo HEAD deletion | web `55dc4c9d`                                                  | verifier — 8 sites line-by-line, 85/85 tests, type-check exit 0; Brevo absence confirmed via anonymous public clone                                            |
| F4 internal gate                       | backend `d1c3c28e` + `a84487c2`                                 | security — 8/8 new tests; strict check still exactly the 111 pre-existing budgeted errors                                                                      |
| F1 mapping (109 = 31/72/6)             | backend `ab406777`                                              | verifier — counts reconciled, four-path client inventory                                                                                                       |
| Type-debt bug + follow-ups             | backend `d1e069e7`                                              | verifier — 111/30 reproduced                                                                                                                                   |
| Mirror state                           | functions: exactly 3-file F4 drift (expected); migrations: 0    | verifier — `vendored` job red **by design** until the wave re-sync                                                                                             |

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
  @ `023e8b50`** — updated 2026-11-12, ~28 history-only values, P0→P2
  ordered): **P0 today: AWS full key pair** (ID + secret access key in public
  history — deactivate in IAM; the earlier "ID-only" claim is refuted) and
  **Supabase JWT signing secret** — verify against production and rotate at
  re-exposure (session-invalidating; per §Partial-restore state the deployed
  keys no longer validate, so leg 0 may find it already rotated). **P1**: 2×
  Supabase PAT + Postgres password (rotate in the same window as the
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
- **Q3 product sign-off** (user, at leisure, non-blocking) — confirm the
  behavior: owners see their own inactive rows.
- **PAT** (user, at leisure, non-blocking) — E2E blob reports, Dependabot
  enumeration. Runner status has the operator-side fallback in §Prerequisites.
