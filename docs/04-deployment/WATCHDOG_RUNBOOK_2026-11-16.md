# Watchdog Runbook (2026-11-16)

> Operator reference for the estate's independent-network watchdog.
> **Authoritative spec:** `Foodshareclub/foodshare-backend` →
> `docs/WATCHDOG_SPEC_2026-11-16.md` (includes the §15 binding amendment,
> spec v2 review 2026-11-16). This runbook covers spec §11.7: architecture,
> operator procedures (incl. token rotation and the monthly proof ritual),
> the failure-mode matrix, and the xFi note. Where this document and the
> spec disagree, the spec wins — file a card.
>
> Naming is frozen by spec §9. Do not rename the worker, monitors, KV
> namespace, Healthchecks check, or Telegram chat — the two-lane probe
> (sibling card) and any future automation key off these names.

## 1. What this is and why

Three independent outages (2026-11-14/15: Upstash Free-quota 500s for 25 h,
the `chown` incident, the xFi Advanced Security SNI block for ~30 h) were all
discovered by manual probing. The estate's in-estate monitor
(`foodshare-backend/scripts/external-monitor.sh`) runs on the web host and
cannot report an estate-wide failure: if the web host or the whole CF plane
is down, it is down too.

The watchdog runs on a network independent of **both** this LAN and the
estate VPS, alerts the operator's phone within minutes, and is provably
alive — a dead-man's switch on the watchdog itself.

## 2. Architecture

```
                    ┌────────────────────────────────────────────┐
                    │  Cloudflare (Free tier, account organicnz) │
                    │                                            │
  every 5 min  ───▶ │  foodshare-watchdog (CF Worker)            │
  (CF cron)         │    ├─ 5 lane-1 checks (§5 of the spec)     │
                    │    ├─ Upstash quota probe (every 30 min)   │
                    │    ├─ daily 06:00Z Upstash Developer API   │
                    │    ├─ Healthchecks ping (every run)        │
                    │    └─ GET /status · POST /test (gated)     │
                    └──────┬──────────────┬──────────────┬───────┘
                           │              │              │
                           ▼              ▼              ▼
                    Telegram thread   Healthchecks    Upstash API
                    "foodshare-      foodshare-       (REST get, read-only
                    watchdog"         watchdog-self-   token; Developer API
                    (PHONE)            check (5m,       daily at 06:00Z)
                                        15m grace)

  UptimeRobot Free (separate vendor) ── lane 2, 5-min HTTP monitors,
  e-mail alerts — no shared infrastructure with CF, so a total CF outage
  still produces an e-mail.

  This LAN (xFi) and the estate VPS run nothing watchdog-related.
```

**The three alert lanes** (all three on by default; any one of them can
independently page the operator):

| Lane | Runs on | Delivers | Notices what |
|---|---|---|---|
| 1 | CF Worker (CF network) | Telegram → phone | estate endpoint outages (incl. body-coded api_health), Upstash quota, config/token errors |
| 2 | UptimeRobot (their network) | e-mail (Pushover optional) | HTTP-plane outages of apex + api ping — independent of CF |
| 3 | Healthchecks (their network) | their alert channels (wire per taste) | **the watchdog itself** stops pinging (worker down, CF cron starved, CF account problem) |

**Lane-1 checks** (spec §5.1; first-hop HTTP status — redirects observed, not followed):

| Check | Endpoint | Verdict rule |
|---|---|---|
| `apex` | `https://foodshare.club/` | 2xx = up, else down |
| `api_health` | `https://api.foodshare.club/functions/v1/api-v1-cache?check=health` (+ `WATCHDOG_INTERNAL_SERVICE_SECRET`) | **body-coded**: `healthy`/`degraded` = up, `unhealthy`/`critical` = down, `not_configured`/401/403 = config track. Auth failure falls back to public `?check=ping` for api-plane liveness. |
| `studio` | `https://studio.foodshare.club/` | 2xx or 3xx = up (baseline 302) |
| `ai` | `https://ai.foodshare.club/` | 2xx or 3xx = up (baseline 302) |
| `supabase_auth` | `https://iazmjdjwnkilycbjwpzp.supabase.co/auth/v1/authorize?provider=google` | **not-402 = up**. 402 `exceed_db_size_quota` is the cloud-plane quota condition — a real production state, alerted, not noise. |

## 3. The `known_down` flag (spec v2 amendment, 2026-11-16)

Expected-red conditions — known, tracked, operator-owned outages that persist
for weeks (`supabase_auth` 402 until the cloud-plane quota decision; `apex`
500 until the Upstash fix lands) — must not re-alert at the 6-hourly
cadence: a known condition paging ~4×/day trains the operator to ignore the
channel.

- **Mechanism:** a `known_down` boolean in the KV state `chk:<name>`.
- **Auto-set** on the down transition for the expected-red checks
  (`apex`, `supabase_auth`) → one transition alert at go-live + a
  **once-per-24h reminder** while flagged.
- **Auto-cleared** when the state returns to up (the recovery message fires
  as normal); a later re-down re-sets it.
- **Cadence branch:** `known_down` down → 24 h repeat; any other down → 6 h
  repeat. Everything else in the alert policy is unchanged.
- **Visible** in `/status`: the check entry carries `"known_down": true`
  while flagged.

**Operator override (both directions), via KV:**

```bash
# from the backend repo, with the Workers token (KV:Edit scope):
export CLOUDFLARE_API_TOKEN=<your CF_API_TOKEN_WORKERS value>

# read the current state of one check:
bunx --bun wrangler@4 kv key get chk:apex --binding STATE --remote

# clear the flag (revert that check to the 6-hourly cadence) — put the
# same JSON back with "known_down": false:
bunx --bun wrangler@4 kv key get chk:apex --binding STATE --remote \
  | sed 's/"known_down":true/"known_down":false/' \
  | bunx --bun wrangler@4 kv key put chk:apex --binding STATE --remote

# set the flag on a NON-expected-red check (e.g. a planned 24 h outage of
# studio) to give it the calm 24-hourly reminder instead of 6-hourly pages:
bunx --bun wrangler@4 kv key get chk:studio --binding STATE --remote \
  | sed 's/"state":"down"/"state":"down","known_down":true/' \
  | bunx --bun wrangler@4 kv key put chk:studio --binding STATE --remote
```

The worker re-reads the keys every run, so the change takes effect on the
next 5-minute cycle. Do not hand-edit other fields of the check state.

## 4. `/status` and `/test`

**`GET https://foodshare-watchdog.<org>.workers.dev/status`** — public, no
auth, never emits a secret. Shape (spec §9, as amended by the 2026-11-16
security gate):

```json
{
  "ts": "2026-11-16T11:00:00.000Z",
  "check_number": 12345,
  "checks": {
    "apex":            { "state": "down", "http": 500, "expected": "2xx", "known_down": true, "since": "2026-11-15T22:04:00.000Z" },
    "api_health":      { "state": "up", "http": 200, "body_status": "degraded", "expected": "healthy|degraded" },
    "studio":          { "state": "up", "http": 302, "expected": "2xx|3xx" },
    "ai":              { "state": "up", "http": 302, "expected": "2xx|3xx" },
    "supabase_auth":   { "state": "down", "http": 402, "expected": "!402", "known_down": true, "since": "2026-11-15T22:04:00.000Z" }
  },
  "self": { "healthchecks_ping_ok": true, "hc_last_ping": "…", "telegram_last_send": "…" }
}
```

**Deliberately absent: any `upstash` block.** Publishing the quota cap plus
a live usage counter on an anonymous endpoint would be a closed-loop gauge
on the estate's one currently-unremediated DoS-reachable weakness (Upstash
Free-plan quota — `t_c304087e` pending): the operator channel already
carries every Upstash value (🟠 QUOTA alerts with Limit/Usage, the daily
ALIVE line, the monthly proof), and the internal `quota`/`devapi` KV keys
remain the source of truth the alerts read. If a future spec revision
re-adds public Upstash telemetry, it must come with the unremediated
weakness remediated first.

Reading it: `ts` is the last completed run — anything older than 10 minutes
means the worker itself is not running (the Healthchecks lane will already
have paged you). `self.telegram_last_send` is the timestamp of the last
successful Telegram delivery. Upstash state is read from the alerts and the
Upstash dashboard, not from this endpoint.

**`POST /test`** — gated by the `x-test-token` header (constant-time
compared; the token is the `WATCHDOG_TEST_TOKEN` GitHub secret). Actions:

```bash
# live-alert demo — sends the 🧪 message to the phone:
curl -X POST "$URL/test" -H "x-test-token: ***" \
  -H "content-type: application/json" -d '{"action":"test"}'

# failure-path demo — forces one check DOWN for exactly one 5-minute
# cycle (the alert fires, the next cycle returns to the real state, and a
# 🟢 RECOVERED follows if the real state is up):
curl -X POST "$URL/test" -H "x-test-token: ***" \
  -H "content-type: application/json" \
  -d '{"action":"simulate-down","monitor":"apex"}'
```

Note: if the chosen monitor is *already* really down (e.g. `apex` while the
Upstash quota is exhausted), the simulated cycle extends the existing down
and no RECOVERED fires until the real state clears. Pick a currently-up
monitor (check `/status` first) when you want the full DOWN→RECOVERED pair.

## 5. Operator procedures

### 5.1 Initial setup (the §10 operator inputs, ≈20 min)

1. **UptimeRobot** — free account; note the API key (Settings → API). The
   CI `lane2` job creates both monitors itself (`addMonitor`, idempotent).
   E-mail alert contact: ensure the account's alert contacts include your
   e-mail. Optional: Pushover contact (spec notes it untested).
2. **Telegram bot** — @BotFather: `/newbot` → note the token; give it a name
   like `foodshare watchdog`. Create the group/chat
   `foodshare-watchdog`, add the bot, post any message in the chat, then
   get the chat id (e.g. via `@userinfobot` in the chat, or
   `https://api.telegram.org/bot<TOKEN>/getUpdates` after posting).
3. **Healthchecks** — free account → New Check:
   name `foodshare-watchdog-selfcheck`, **Ping URL** (copy it, never commit
   it), Period 5 min, **Grace 15 min**. Wire the alert channel (e-mail /
   ntfy / whatever you already use).
4. **Cloudflare** — API token with exactly `Workers Scripts: Edit` +
   `Workers KV Storage: Edit` on account `organicnz` (Workers routes are
   account-scoped — the site-level UI hides the worker permission; scope at
   the account). Do **not** reuse `CLOUDFLARE_API_TOKEN` (DNS/tunnel scope).
5. **Upstash** —
   - REST URL + a **read-only** REST token for the existing `foodshare`
     Redis (token with read scope only — the probe issues one
     `GET foodshare:watchdog:probe`; nothing is written).
   - Developer API: your account e-mail + an API key (Upstash dashboard →
     API token) + the database ID (dashboard → the `foodshare` database →
     its ID).
6. **INTERNAL_SERVICE_SECRET** — read the estate's current value from the
   backend secrets store (`./scripts/deploy.sh get-secret
   INTERNAL_SERVICE_SECRET` from a checkout on the estate host, per the
   backend runbook). The watchdog's `api_health` check presents it as a
   Bearer token.
7. **Phone** — reachable for the live demo (acceptance A3) whenever you
   unblock the builder card.

Set each value as a GitHub secret on `Foodshareclub/foodshare-backend`:

```bash
gh secret set CF_API_TOKEN_WORKERS <value> --repo Foodshareclub/foodshare-backend
gh secret set WATCHDOG_TELEGRAM_BOT_TOKEN <value> --repo Foodshareclub/foodshare-backend
gh secret set WATCHDOG_TELEGRAM_CHAT_ID <value> --repo Foodshareclub/foodshare-backend
gh secret set WATCHDOG_HEALTHCHECKS_PING_URL <value> --repo Foodshareclub/foodshare-backend
gh secret set WATCHDOG_INTERNAL_SERVICE_SECRET <value> --repo Foodshareclub/foodshare-backend
gh secret set UPSTASH_READ_ONLY_REST_TOKEN <value> --repo Foodshareclub/foodshare-backend
gh secret set UPSTASH_REST_URL <value> --repo Foodshareclub/foodshare-backend
gh secret set UPSTASH_DEV_API_EMAIL <value> --repo Foodshareclub/foodshare-backend
gh secret set UPSTASH_DEV_API_KEY <value> --repo Foodshareclub/foodshare-backend
gh secret set UPSTASH_DEV_API_DB_ID <value> --repo Foodshareclub/foodshare-backend
gh secret set UPTIMEROBOT_API_KEY <value> --repo Foodshareclub/foodshare-backend
# WATCHDOG_TEST_TOKEN is generated by the builder (random 32-hex) — already set.
```

Then push anything to `scripts/watchdog/**` (or run the workflow) to deploy.
The pipeline's `gate` job fails with the exact missing-secret list until
all of the above are present — that list is the gate.

**Expected red at go-live** (do not chase these): `apex` 500 while the
Upstash Free quota is exhausted, and `supabase_auth` 402 while the cloud
quota is exhausted — one DOWN alert each at go-live (both `known_down`
flagged → 24-hourly reminders after), plus the 🟠 QUOTA message within the
first 30-minute probe. Recovery produces 🟢 RECOVERED automatically.

### 5.2 Token rotation

General order for any token the worker presents to a third party:
**set the new value where the worker reads it, then rotate the upstream
secret, then verify via `/status`.** The ⚪ CONFIG alert is the designed
loud failure if the order is wrong — treat it as "rotation in progress or
stuck", not as a new incident.

| Token | Rotation |
|---|---|
| `WATCHDOG_TEST_TOKEN` | `gh secret set` the new 32-hex value; no worker restart (CI re-syncs on next deploy) — or `wrangler secret put WATCHDOG_TEST_TOKEN` immediately. Verify: `/test` with the new token → 200. |
| Telegram bot token | @BotFather `/revoke` → new token → `wrangler secret put WATCHDOG_TELEGRAM_BOT_TOKEN`. Verify with `/test` action `test` (🧪 on the phone) and `self.telegram_last_send` advancing in `/status`. |
| CF token | New token (Workers:Edit + KV:Edit) → `gh secret set CF_API_TOKEN_WORKERS` → next deploy uses it. The worker itself is unaffected until deploy. |
| Upstash read-only REST token | Regenerate in the Upstash dashboard → `wrangler secret put UPSTASH_READ_ONLY_REST_TOKEN` + `UPSTASH_REST_URL` if the URL moved. Verify: the next 30-min probe stops the ⚪ CONFIG probe-error alerts (no further ⚪ within an hour) and the daily ALIVE line shows a sane `limit`. |
| Upstash Developer API key | Dashboard → rotate → `wrangler secret put UPSTASH_DEV_API_KEY`. Verified at the next 06:00Z daily read (an ⚪ CONFIG message fires meanwhile if the old key dies). |
| `WATCHDOG_INTERNAL_SERVICE_SECRET` | Two-sided (estate **and** watchdog): 1) estate side: `./scripts/deploy.sh set-secret INTERNAL_SERVICE_SECRET <new>` on the estate (deploys the secret to the function's runtime); 2) watchdog side: `wrangler secret put WATCHDOG_INTERNAL_SERVICE_SECRET <new>`; 3) verify: within one cycle, `/status` `checks.api_health.state` is `up` with `body_status` healthy/degraded. If the estate side is still on the old secret while the worker has the new one, the worker sees 401 → ⚪ CONFIG + ping fallback until the estate deploy completes. |
| UptimeRobot API key | Account → Settings → API → regenerate → `gh secret set UPTIMEROBOT_API_KEY`. The monitors survive (they belong to the account); the next `lane2` run re-validates. |
| Healthchecks ping URL | Only changes if the check is recreated: new URL → `wrangler secret put WATCHDOG_HEALTHCHECKS_PING_URL`. Until the next run, Healthchecks sees a gap — create the replacement check with grace ≥ 15 min to avoid a false page. |

### 5.3 Account recovery

- **CF account access lost** (2FA device gone, billing locked): the worker,
  its KV state, and `/status` all freeze. Healthchecks pages you (lane 3).
  Recover per Cloudflare's account-recovery flow; **state survives in KV**
  — nothing needs re-creation, just access. The `watchdog-state` namespace
  and the worker survive any token churn: tokens are credentials, not
  resources.
- **UptimeRobot**: free account recovery via their e-mail support; recreating
  the two monitors is `addMonitor` ×2 (CI `lane2` does it on any deploy, or
  re-run the workflow manually — it is idempotent).
- **Healthchecks**: recreate the check with the same 5-min period / 15-min
  grace and push the new URL (§5.2).
- **Telegram**: `/revoke` gives a new token for the same bot — the chat id
  and the chat itself survive. If the bot is deleted, create a new one and
  re-add it to the `foodshare-watchdog` chat (new chat id too).

### 5.4 The monthly proof ritual (spec §6, verbatim duties)

1. **Read** the month ALIVE message on the phone (month 1st, ~09:00Z).
   If it is absent: open Healthchecks — the watchdog is dead; diagnose per
   the failure-mode matrix before anything else.
2. **Confirm** the Upstash Developer API daily read shows the current limit
   and plan — the ALIVE message carries both (`upstash: limit …, plan …`);
   cross-check against the Upstash dashboard. (Not from `/status` — the
   public surface carries no Upstash telemetry, §4.)
3. **Confirm** the vendor-side budget alert still exists: Upstash dashboard
   → the database's alert settings (Free: vendor e-mail alerts; Paid:
   native budget alerts at 70%/90% — if the plan flipped free→paid this
   month, the ALIVE message carries a ⚠ note demanding this check).
4. **Confirm** `self.healthchecks_ping_ok: true` and recent pings in the
   Healthchecks dashboard (a green dashboard with a missing ALIVE message
   means the worker runs but Telegram is broken — a different row of the
   matrix).
5. **Note** in the month's review whether any lane paged you for a real
   outage vs. a false alarm; false alarms are spec bugs — file a card
   against the watchdog spec, not a tweak-and-continue.

### 5.5 UptimeRobot monitors — manual path

The CI `lane2` job creates the monitors automatically (idempotent). If you
ever need to do it by hand (API key unavailable, or to change the e-mail
contact), Settings → Monitors → Add New Monitor:

| Field | `foodshare apex` | `foodshare api health` |
|---|---|---|
| Friendly name | `foodshare apex` | `foodshare api health` |
| URL | `https://foodshare.club/` | `https://api.foodshare.club/functions/v1/api-v1-cache?check=ping` |
| Type | HTTP(S) | HTTP(S) |
| Interval | 5 minutes | 5 minutes |
| Retries | 30 s | 30 s |
| Alert contacts | your e-mail | your e-mail |

The api monitor probes the **public tokenless ping** — by design, no secret
on the UptimeRobot side.

## 6. Failure-mode matrix (spec §13)

"Watchdog down" must fail **loud**, never silent — that is the whole point
of the three-lane design.

| Failure | Symptom | Who pages you | Notes |
|---|---|---|---|
| Worker code throws (bug) | run fails; no Healthchecks ping that cycle | **Healthchecks** (after 15-min grace) | fix + redeploy; `wrangler deployments` logs show the stack |
| CF cron starved / worker suspended | same as above | **Healthchecks** | account-level problem — verify CF account health |
| **CF account gone / billing-locked** | same as above, plus `/status` unreachable | **Healthchecks** + **UptimeRobot** (its 2 monitors keep probing the *site*, not the worker) | account recovery first; worker state is KV-side and survives access loss |
| CF network partition (worker alive, can't reach estate) | all lane-1 checks down; Healthchecks pings fine | **Telegram** (all checks DOWN — expect a burst, throttled) + **UptimeRobot** (site-side) | cross-check UptimeRobot: if UptimeRobot is green, the outage is CF-side |
| Estate down (VPS) | lane-1 down + UptimeRobot down; worker pings Healthchecks fine | **Telegram + UptimeRobot** | the normal outage path — this is what the postmortem said was missing |
| Upstash quota exhausted | 🟠 QUOTA with Limit/Usage on the phone; apex 500 + api errors | **Telegram** (🟠 once + 24 h) | known condition — plan decision card owns the fix; the alert tells you it's *still* true (no public state — see §4) |
| Upstash REST URL / token wrong | probe errors (not a quota error) | **Telegram** (⚪ CONFIG once + 24 h) | a dead probe must not read as "quota fine" |
| `WATCHDOG_INTERNAL_SERVICE_SECRET` stale | `api_health` 401 → config track + ping fallback | **Telegram** (⚪ CONFIG) | ping fallback keeps api-plane liveness visible meanwhile |
| Telegram down / bot token rotated | sends fail; worker keeps running + pinging | **UptimeRobot** (site lane keeps working) + Healthchecks green; `self.telegram_last_send` frozen | rotate per §5.2; the design assumption is e-mail (lane 2) carries the house while Telegram is broken |
| Healthchecks dead (vendor) | no page when the worker dies | **UptimeRobot** (site lane) + you notice `/status.ts` going stale | recreate the check (§5.3) |
| **Watchdog + CF + UptimeRobot all down** | nothing | **nothing automatic** — this is the residual the spec names explicitly | accepted residual, mitigated by the daily/weekly habit of glancing at `/status` (bookmark it); a fourth vendor was declined on cost grounds |
| xFi Advanced Security re-enabled | `api.`/`studio.` probes from this LAN reset (SNI-block signature) — **from the CF Worker, checks stay correct** | only if the site is *also* down for everyone | the worker is not on your LAN; xFi cannot blind it. See §7. |

## 7. The xFi note (read this before trusting a LAN probe)

The xFi gateway's "Advanced Security" (xFi Protect / ISP-assisted bot
protection) silently SNI-blocks `api.` and `studio.` subdomain probes from
the home LAN: TLS resets, HTTP 000, "TLS handshake failed". It is a
**stateful filter, not an absolute block** — the 2026-11-15/16 postmortems
recorded both the ~30 h block and later LAN 404s through the same SNI
signature. Consequences:

1. **LAN readings of `api.`/`studio.` are unreliable while Advanced
   Security is on.** Never diagnose those two planes from the LAN alone.
2. The watchdog's lane-1 checks for those hosts run from the CF network and
   are **unaffected** — that independence is the reason the watchdog exists.
3. The two-lane probe tooling (sibling card) refuses a LAN-only claim when
   it detects the SNI-block signature (its exit-2 path) and demands the
   independent `/status` reading before any claim is filed.
4. One-time lift (operator action, xFi web portal): disable Advanced
   Security / "xFi Protect" for the home line. Post-lift verification is
   the sibling card's B4: a clean two-lane agreement reading (LAN and
   Worker agree, HTTP 2xx/3xx, no reset signature).

## 8. Cost (spec §12, §12.8 zero-cost policy)

| Item | Plan | Recurring cost |
|---|---|---|
| CF Worker + KV + cron | Free (100k req/day, 100K reads/day, 1 GB) | **$0** |
| UptimeRobot | Free (50 monitors, 5-min interval) | **$0** |
| Healthchecks | Free (unlimited checks, 1-min min period) | **$0** |
| Telegram Bot API | Free (30 msg/s) | **$0** |

No paid CF service is added: `docs/CLOUDFLARE_ZERO_COST_POLICY.md` is upheld
— the account stays on the Free Website plan, and the worker lives on the
free `.workers.dev` subdomain. If any vendor ever requires payment for the
features this design uses (5-min intervals, the checks above), that is a
spec violation: file a card and remove that lane before paying.

## 9. Repo layout and maintenance

- Worker + tests + wrangler config + deploy script:
  `foodshare-backend/scripts/watchdog/` (`worker.ts`, `worker.test.ts`,
  `wrangler.jsonc`, `deploy.sh`). The worker is **backend-only by
  convention** — it is not part of the web vendored set.
- Deploy: `foodshare-backend/.github/workflows/watchdog-deploy.yml` — on
  push to main when `scripts/watchdog/**` changes: unit tests + wrangler
  dry-run → secret gate (exact missing list) → deploy (KV namespace
  idempotent create + secret sync) → post-deploy smoke (`GET /status` must
  serve the §9 contract JSON; `/test` must reject a bad token with 401) →
  lane-2 idempotent `addMonitor` ×2 + `getMonitors` evidence.
- CI toolchain note: the estate guard `bun run check:no-node` forbids Node
  in the repo (workflows included), so CI runs wrangler on the estate's Bun
  (`oven-sh/setup-bun` + `bunx --bun wrangler@4`) rather than the spec's
  original "Node 20 + npx" — same deploy, guard-compliant runner.
- Secrets: all in `Foodshareclub/foodshare-backend` GitHub secrets
  (spec §9 list); never committed, never written in full in board comments
  (fingerprint form per board convention).
- State: CF KV namespace `watchdog-state` (keys `chk:<name>`, `quota`,
  `devapi`, `self`, `counters`, `simulate:<name>`). State is data, not
  code: it survives token churn and worker redeploys.
