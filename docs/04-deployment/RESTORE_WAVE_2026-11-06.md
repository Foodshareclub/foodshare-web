# Restore Wave 2026-11-06 — tunnel + F1 + lockdown + F4, one pass

Status: **all code artifacts authored and verified (SHAs below). What remains is
execution: the operator runs `CLOUDFLARE-TUNNEL-OUTAGE-RUNBOOK.md` steps 1–5 with
the wave insertions below.** No user input blocks the restore itself — Q3 gates
only M2/phase 2 (post-restore), and the PAT has operator-side fallbacks (see
§Open items).

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
   - M1: `20261106000000_f1_posts_anon_column_grants.sql` — `REVOKE SELECT ON
public.posts FROM anon` **then, same migration**, `GRANT SELECT (46
columns = 49 Row − {location, location_json, post_address}) TO anon`.
     Do **not** split into separate applies: the `posts_with_location` view is
     `security_invoker`, so anon needs the column grants for the view to keep
     working (a bare revoke breaks public browse at re-exposure).
   - **Transaction note:** M1 has no explicit `BEGIN/COMMIT`. Confirm the
     applier executes the file atomically, or wrap the two statements in an
     explicit transaction. With the origin dark the risk window is zero either
     way, but the record should state which.
   - M2 (owner-scoped view): **not in this wave** — see §Open items (gated on
     Q3 + phase-2 end-state decision).
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
   - Auth-mail smoke: one real magic-link end-to-end (E2 coupling — a
     "restored" origin with silent auth-mail failure looks like a second
     outage).
   - 16 E2E shards + blob failure-shape per the acceptance rewording.

## Verified artifact record (as of this doc)

| Artifact                               | Repo @ SHA                                                   | Verified by                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| M0 (5 pending migrations)              | backend, in main, mirror byte-identical on web               | verifier (diff -rq)                                                                                                 |
| M1 anon REVOKE+GRANT                   | backend `aec49efd`                                           | verifier — column math recomputed: 49 Row − 46 GRANT = exactly the trio, no phantoms                                |
| C1 (8 web sites) + Brevo HEAD deletion | web `55dc4c9d`                                               | verifier — 8 sites line-by-line, 85/85 tests, type-check exit 0; Brevo absence confirmed via anonymous public clone |
| F4 internal gate                       | backend `d1c3c28e` + `a84487c2`                              | security — 8/8 new tests; strict check still exactly the 111 pre-existing budgeted errors                           |
| F1 mapping (109 = 31/72/6)             | backend `ab406777`                                           | verifier — counts reconciled, four-path client inventory                                                            |
| Type-debt bug + follow-ups             | backend `d1e069e7`                                           | verifier — 111/30 reproduced                                                                                        |
| Mirror state                           | functions: exactly 3-file F4 drift (expected); migrations: 0 | verifier — `vendored` job red **by design** until the wave re-sync                                                  |

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
- Rotation list (operator): Brevo (history copies), Upstash ×2, AWS/Twilio
  (history), backend F2 historical values, workspace `keys/` actions.
- App branch hygiene: none remaining (T2 closed — `feat/bun-tsrs-migration`
  deleted local + remote, full ancestor of main).

## Open items

- **Q3 (product/user):** may owners list their own inactive listings after
  F1? Gates M2 and shapes phase 2. Non-blocking for the restore.
- **Phase-2 end state (design, @security):** column-GRANT shape (as specced)
  vs eventual full REVOKE with view-only client access. M2 is only required
  by the latter — see the wave discussion of 2026-11-06.
- **PAT (user, optional for the restore):** E2E blob reports, Dependabot
  enumeration. Runner status has the operator-side fallback above.
- **M1 sign-off (@security):** requested by @hermes before runbook insertion.
