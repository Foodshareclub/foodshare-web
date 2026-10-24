# Cloudflare Tunnel Outage — Diagnosis and Recovery

**Incident date:** 2026-10-04
**Symptom reported:** magic links opened `https://ai.foodshare.club` and the browser reported
`ERR_SSL_PROTOCOL_ERROR` ("This site can't provide a secure connection").

Both halves of that report had a cause, and neither was the one it looked like. This runbook
records the evidence so the next occurrence is diagnosed in minutes rather than hours.

---

## 1. Read this first — the site was down, not just the magic links

The reported symptom was an auth redirect problem. The actual state was a **full site outage**:

| Host                 | DNS                | TLS        | HTTP                       |
| -------------------- | ------------------ | ---------- | -------------------------- |
| `foodshare.club`     | Cloudflare anycast | valid cert | **530** (origin DNS error) |
| `www.foodshare.club` | Cloudflare anycast | valid cert | **530** (origin DNS error) |
| `ai.foodshare.club`  | Cloudflare anycast | **fails**  | —                          |
| `api.foodshare.club` | Cloudflare anycast | **fails**  | —                          |

Every host resolved to the same pair of Cloudflare anycast addresses
(`104.21.5.177` / `172.67.133.175`) and there was **no wildcard DNS record** — a random
subdomain returned NXDOMAIN — so each host was an explicit record.

Certificate Transparency showed a `*.foodshare.club` wildcard with issuance as recent as
**2026-10-01**, and `podman machine list` reported the serving machine last up **2 days
before**. The site had been healthy days earlier.

## 2. Why the magic links pointed at the wrong host

`ai.foodshare.club` appears **nowhere in the application source**. The canonical origin is
unambiguous and is stated in three places:

- `src/lib/metadata.ts:13` — defaults to `https://foodshare.club`
- `src/app/actions/auth.ts:337` — `redirectTo: ${NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery`
- `src/app/actions/auth.ts:389` — `redirectTo: ${NEXT_PUBLIC_SITE_URL}/auth/callback`
- `.env.production` — `NEXT_PUBLIC_SITE_URL=https://foodshare.club`

Supabase builds every magic link from the project's **Site URL**, not from the code. So a
Site URL of `https://ai.foodshare.club` — a staging hostname, retained in the dashboard —
sends every password-recovery and magic link to a host that cannot serve TLS. That is the
exact reported symptom, and it is why the fix is a dashboard change and not a code change.

**Correct values:**

- Site URL: `https://foodshare.club`
- Redirect URLs must include: `https://foodshare.club/auth/callback`
  (the `?type=recovery` variant is the same path with a query string, so the base path covers it)

## 3. Why `ERR_SSL_PROTOCOL_ERROR` was not a redirect problem

```
$ openssl s_client -connect ai.foodshare.club:443 -tls1_3 -brief
  error:0A00010B:SSL routines:tls_validate_record_header:wrong version number
```

`wrong version number` means the server replied with **non-TLS data on port 443**. A browser
reports that as an invalid secure connection. No auth or redirect configuration can cause it.

`ai.` and `api.` are **DNS-only (unproxied) records pointing at Cloudflare's own anycast
addresses**. Cloudflare does not terminate TLS for a hostname that is not proxied in the zone,
so it answers in plain HTTP on 443. A DNS-only record on Cloudflare anycast IPs can never
serve HTTPS.

This also broke the **mobile app independently of any auth config** — `api.foodshare.club` is
hardcoded as the API host:

- `Sources/FoodShare/FoodShareApp.swift:89` — `supabaseURL: URL(string: AppEnvironment.supabaseURL ?? "https://api.foodshare.club")!`
- `Sources/FoodShare/Core/Networking/APIClient.swift:25` — `baseURL = "\(AppEnvironment.supabaseURL ?? "https://api.foodshare.club")/functions/v1"`

## 4. Why there was no origin at all (the actual outage)

The site is **self-hosted on the operator's Mac behind a Cloudflare Tunnel**, not on a hosting
provider. The chain is:

```
foodshare-web (Next.js :3000)  →  foodshare-web.network  →  Caddy  →  cloudflared  →  Cloudflare  →  foodshare.club
```

Quadlets in this repo: `foodshare-web.container`, `foodshare-web.network`,
`foodshare-cloudflared-web.container`, with `Caddyfile` proxying to `foodshare-web:3000`.

Cloudflare returned **530 Origin DNS error** because the tunnel was not connected. Two
independent causes, both required:

1. **The podman machine was stopped and its state was gone.** `podman machine start` failed with
   `identity file ... can't be loaded`, and `machine/applehv/` held only an empty `cache/`
   directory — no VM disk, no identity file. `podman machine list` still showed the machine
   registered, so the failure looked like a socket problem rather than a destroyed one.
2. **`/etc/foodshare/foodshare-web.env` did not exist.** Both containers declare
   `EnvironmentFile=/etc/foodshare/foodshare-web.env`, which supplies `CLOUDFLARE_TUNNEL_TOKEN`.
   Without it the tunnel cannot authenticate — so fixing podman alone would **not** have
   restored the site.

> A 530 means Cloudflare cannot reach the origin. It is never a certificate or redirect fault.
> Check the tunnel before anything else.

## 5. Recovery procedure

### Step 1 — restore the tunnel token (gates everything else)

The env file is root-owned and holds a live credential. It cannot be reconstructed from the
repository, and it must not be committed.

```bash
sudo mkdir -p /etc/foodshare
sudo install -m 600 -o root -g root /path/to/secure/foodshare-web.env /etc/foodshare/foodshare-web.env
```

It must define at minimum `CLOUDFLARE_TUNNEL_TOKEN` (per
`foodshare-cloudflared-web.container`), plus the web container's own variables.

If the token is lost, mint a new tunnel in **Cloudflare Zero Trust → Networks → Tunnels**.
**The DNS CNAME target changes when the tunnel is recreated** — update the Cloudflare record
in step 4 as part of the same change, or the new tunnel will be equally unreachable.

### Step 2 — rebuild the podman machine

Only needed when `podman machine start` fails with a missing identity file. Confirm there is
nothing to preserve first, because a destroyed machine has no disk to lose:

```bash
find ~/.local/share/containers/podman/machine/applehv -type f   # expect: no output
```

```bash
podman machine rm podman-machine     # answers an interactive confirm — pipe `yes`
podman machine init --cpus 4 --memory 4096 --disk-size 100
podman machine start
```

> `podman machine init` names the machine **`podman-machine-default`**, and this podman
> version has no `podman machine rename`. Every later `podman machine ssh <name>` must use
> whichever name `podman machine list` actually shows.

### Step 3 — install and start the quadlets

Quadlet unit files must exist **inside the VM**, under the ssh user's home — note that
`podman machine ssh` does **not** expand `~`, so use absolute paths:

```bash
M=podman-machine-default            # whatever `podman machine list` actually shows
D=/var/home/core/.config/containers/systemd

podman machine ssh "$M" -- mkdir -p "$D"
for f in foodshare-web.container foodshare-web.network foodshare-cloudflared-web.container; do
  podman machine cp "./$f" "$M:$D/$f"
done
podman machine ssh "$M" -- systemctl --user daemon-reload
podman machine ssh "$M" -- systemctl --user restart foodshare-web
podman machine ssh "$M" -- systemctl --user restart foodshare-cloudflared-web
```

Confirm both are actually running, not merely enabled:

```bash
podman machine ssh <name> -- systemctl --user status foodshare-cloudflared-web
```

> **A quadlet whose `EnvironmentFile=` is missing will not load at all** — systemd treats the
> missing file as a hard load error, so `systemctl --user start foodshare-web` reports
> `Unit … not found` even though `podman quadlet list` shows it. That is the expected symptom
> of step 1 being incomplete, not a separate fault.

### Step 4 — fix the `api.` and `ai.` records in Cloudflare

These must be **proxied** and routed to the tunnel, or pointed at the real origin. Never leave
them DNS-only on Cloudflare anycast addresses.

```
Type     Name    Target                          Proxy
CNAME    api     <tunnel-id>.cfargotunnel.com   Proxied (orange)
CNAME    ai      <tunnel-id>.cfargotunnel.com   Proxied (orange)
```

Delete the `A` records for `api` and `ai` — leaving them in place is what produced the
non-TLS response on port 443.

### Step 5 — correct Supabase Auth

**Supabase dashboard → Authentication → URL Configuration**

- **Site URL:** `https://foodshare.club`
- **Redirect URLs:** include `https://foodshare.club/auth/callback`
- Remove the stale `ai.foodshare.club` entry

Until this is corrected, every magic link lands on the wrong host regardless of how healthy the
tunnel is.

## 6. Verify

```bash
# Site — 530 until the tunnel connects, then 200
curl -sS -o /dev/null -w "%{http_code}\n" https://foodshare.club

# API host — must complete a TLS handshake
openssl s_client -connect api.foodshare.club:443 -brief </dev/null

# No stale magic-link host
dig +short ai.foodshare.club
```

A 530 with valid TLS means the tunnel is still down. A `wrong version number` handshake error
means the record is still DNS-only onto Cloudflare IPs. These are different faults and must not
be diagnosed from the same symptom.

## 7. Standing notes

- **A 302 to `www.safebrowse.io` on port 80 is a reputation interstitial, not a fault.** It is
  noise; it does not affect the HTTPS diagnosis.
- **Never record the tunnel token in this repository.** It belongs in
  `/etc/foodshare/foodshare-web.env` only, mode `600`.
- The `supabase` CLI in this environment is **not linked** to a project, so the auth Site URL
  cannot be read or corrected from the shell — it is a dashboard-only change.
- **Production `NEXT_PUBLIC_SITE_URL` is `https://foodshare.club`** (`.env.production`), and
  `.env.local` is `http://localhost:3000`. A magic link pointing at a staging host is a
  dashboard value that has drifted from the deployed configuration.
- **A GitHub PAT is embedded in plaintext in this repository's `origin` remote URL.** Anyone who
  can read `.git/config` has a working repository credential. Rotate the token in GitHub first,
  then replace the remote with a credential helper:

  ```bash
  git remote set-url origin https://github.com/Foodshareclub/foodshare-web.git
  gh auth setup-git
  ```

  Removing it from the URL does not invalidate it. Recorded during the 2026-10-04 incident response;
  the value is deliberately not reproduced here.
