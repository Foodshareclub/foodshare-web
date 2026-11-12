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
