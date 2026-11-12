# Read-only Next.js runtime cache repair — November 12, 2026

A reported page showed maintenance UI and Server Component digest 1463303924
with a 14:44 timestamp, before the verified e3260074 deployment. The current
container was healthy and did not contain that digest in its retained logs.
This does not establish the original digest's cause.

Current logs did reproduce a separate operational defect: Next.js raised EROFS
for /app/.next/cache/images and /app/.next/server/route-cache, including unhandled
image-cache rejections. The deployed systemd-generation unit set ReadOnly=true
without writable Next.js caches. The canonical root generation carried only an
unbounded image-cache mount and omitted the rendered-page cache.

Both unit generations now configure only these disposable cache mounts:
- /app/.next/cache: 256 MiB tmpfs
- /app/.next/server/route-cache: 128 MiB tmpfs

The mounts use sticky directory permissions for the unprivileged runtime user,
with nosuid,nodev,noexec. The installed Podman CLI rejects uid/gid tmpfs options;
that rejected isolated probe made no production changes. The supported mount
options passed an isolated test with the exact production image: writes to both
cache directories succeeded, while application-root writes remained denied.
No application bundle directory is overmounted, and no full writable root is enabled.
These caches use VPS memory; no Mac-local cache directory is created.

The normal deployment script updates only these two Tmpfs fields, preserving
unrelated host settings and other mounts. It snapshots the original unit and
restores it on failed health checks or interruption, together with existing image
and private-environment recovery. Tunnel-generation selection follows its network
contract instead of requiring byte-identical template contents, so host comments
or managed cache fields cannot select a different connector.

Local verification: 31 executable deployment/rollback tests passed, 121 assertions.
Bash syntax, canonical Quadlet mirror checks and scoped whitespace checks passed.
A real isolated container verified both cache writes and denied code writes.
Production application and browser verification must be recorded separately;
a healthy health endpoint alone does not establish a successful page render.


## Installed runtime and browser evidence

The normal guarded rollout installed operations commit
5c6c4743180d91b53d7306363bc5d686ecb3dd34 while retaining the already-validated
application image e3260074e375b4d74c00f7571810b803e2fff7e1,
digest sha256:bdb427c08f45d927a28237c2573e959e49b17bf0b8b6eeaa6f48e8f81eb09d96.
The rollout's image revision, API preflight, health, Food page and listing checks
passed. No application bundle rebuild or private setting change was required.

The installed container reports ReadonlyRootfs=true and exactly the two intended
bounded Next.js tmpfs mounts. Real requests produced nine image-cache entries
and two route-cache entries. statfs reported exact limits of 268,435,456 and
134,217,728 bytes. The post-browser logs contained no EROFS, unhandledRejection,
FATAL or reported-digest entries.

At 23:36:14 UTC (15:36:14 PST), a fresh production browser verified:
- /: HTTP 200, 40 listing links, no maintenance/error boundary or reported digest.
- /food: HTTP 200, 40 listing links, no maintenance/error boundary or reported digest.
- /forum/coming-soon: HTTP 200, no maintenance/error boundary or reported digest.

No optimized-image request failed and there were no browser page errors.
The Food page screenshot was visually inspected. This verifies these routes
and the cache repair, not every application feature or the cause of the old
14:44 digest. Browser receipts/screenshots are retained under the Studio
FoodShare umbrella at artifacts/server-render-20261112.
Production /api/health reported database, auth, storage and Redis all up.
Exact-revision CI remains separate from these local and installed runtime results.
