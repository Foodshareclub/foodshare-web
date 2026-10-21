#!/usr/bin/env bash
# Invoked by GitHub Actions on each existing production web host.
#
# The service is a Quadlet unit: a Podman container described by
# ~/.config/containers/systemd/foodshare-web.container. The unit's own
# `Image=` is the moving `:latest` tag, which is what a fresh install
# starts from. This script writes a drop-in next to it that pins the
# immutable digest which was validated, and the drop-in is what makes a
# deployment reproducible: the tag can move between two hosts, the digest
# cannot.
#
# Two paths can be overridden, and only for the test: the environment file
# the unit reads, and the directory the units are installed in.
set -euo pipefail

ENV_FILE="${FOODSHARE_WEB_ENV_FILE:-/etc/foodshare/foodshare-web.env}"
UNIT_DIR="${FOODSHARE_WEB_UNIT_DIR:-$HOME/.config/containers/systemd}"
DROPIN_DIR="$UNIT_DIR/foodshare-web.container.d"
DROPIN_FILE="$DROPIN_DIR/50-image.conf"

if [ "$(podman container inspect --format '{{.State.Running}}' foodshare-web 2>/dev/null || true)" != true ]; then
  echo "The existing Podman web service must be running before deployment" >&2
  exit 1
fi
if command -v docker >/dev/null 2>&1 && [ "$(docker container inspect --format '{{.State.Running}}' foodshare-web 2>/dev/null || true)" = true ]; then
  echo "A Docker foodshare-web container is also running; refusing to deploy while two runtimes could own the service" >&2
  exit 1
fi
if [ ! -f "$UNIT_DIR/foodshare-web.container" ]; then
  echo "The Quadlet unit is not installed at $UNIT_DIR/foodshare-web.container; run scripts/quadlet-install.sh first" >&2
  exit 1
fi
verify_listing_api() {
  podman exec -i foodshare-web bun run - <<'JS'
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error('Public API configuration is missing');
async function get(query) {
  const response = await fetch(base + '/functions/v1/api-v1-products?' + query, {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Listing API HTTP ' + response.status);
  const body = await response.json();
  if (body.success !== true) throw new Error('Listing API returned an error');
  return body.data;
}
const listings = await get('postType=food&limit=1');
if (!Array.isArray(listings)) throw new Error('Invalid listing feed');
if (listings.length) {
  const detail = await get('id=' + encodeURIComponent(listings[0].id) + '&include=owner');
  if (detail.id !== listings[0].id) throw new Error('Invalid listing detail');
}
JS
}
if [ "${1:-}" = --check ]; then
  podman exec foodshare-web curl --fail --silent --max-time 15 http://localhost:3000/api/health >/dev/null
  verify_listing_api
  echo "Existing Podman web service and Quadlet unit verified"
  exit 0
fi

: "${DEPLOY_IMAGE:?An immutable image reference is required}"
: "${DEPLOY_SHA:?The validated commit is required}"
: "${GITHUB_TOKEN:?Registry authentication is required}"
: "${GITHUB_ACTOR:?Registry identity is required}"
[[ "$DEPLOY_IMAGE" =~ ^ghcr\.io/foodshareclub/foodshare-web@sha256:[a-f0-9]{64}$ ]] || exit 1
[[ "$DEPLOY_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1

umask 077
snapshot=$(mktemp -d)
registry_auth=$(mktemp)
trap 'rm -rf "$snapshot" "$registry_auth"' EXIT
cp "$ENV_FILE" "$snapshot/env"
previous_image=$(podman container inspect --format '{{.Image}}' foodshare-web)
printf '%s' "$GITHUB_TOKEN" | REGISTRY_AUTH_FILE="$registry_auth" podman login ghcr.io --username "$GITHUB_ACTOR" --password-stdin >/dev/null
REGISTRY_AUTH_FILE="$registry_auth" podman pull "$DEPLOY_IMAGE"
revision=$(podman image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$DEPLOY_IMAGE")
if [ "$revision" != "$DEPLOY_SHA" ]; then
  echo "Pulled image does not match the validated commit" >&2
  exit 1
fi

# Preserve existing host configuration and update only the supplied application
# settings. Values never appear in command arguments or deployment logs.
#
# The values are written quoted, the way they were before. What is not the
# way they were before is the `$$`: Compose expands `$` in a value, and the
# old script doubled it so Compose would hand the container a single one.
# A systemd environment file does not expand `$` at all, so doubling it here
# would put two literal dollars in the value instead of one.
python3 - "$ENV_FILE" "$snapshot/env.staged" <<'PY'
import json, os, pathlib, sys
source, target = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
keys = '''NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
SITE_DOMAIN NEXT_PUBLIC_APP_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SENTRY_DSN
SENTRY_ORG SENTRY_PROJECT SENTRY_RELEASE NEXT_PUBLIC_SENTRY_RELEASE
NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED
NEXT_PUBLIC_OAUTH_APPLE_ENABLED NEXT_PUBLIC_OAUTH_GITHUB_ENABLED
CLOUDFLARE_TUNNEL_TOKEN'''.split()
values = {key: os.environ[key] for key in keys if os.environ.get(key)}
# The tunnel token is read by cloudflared as TUNNEL_TOKEN and by everything
# else as CLOUDFLARE_TUNNEL_TOKEN. Compose could give a container one name
# for the other's value; a systemd environment file cannot, so both names
# are written and the value is the same.
if 'CLOUDFLARE_TUNNEL_TOKEN' in values:
    values.setdefault('TUNNEL_TOKEN', values['CLOUDFLARE_TUNNEL_TOKEN'])
lines = source.read_text().splitlines() if source.exists() else []
lines = [line for line in lines
         if line.split('=', 1)[0] not in values and not line.startswith('NODE_TLS_REJECT_UNAUTHORIZED=')]
lines += [key + '=' + json.dumps(value) for key, value in values.items()]
target.write_text('\n'.join(lines) + '\n')
target.chmod(0o600)
PY
install -m 600 "$snapshot/env.staged" "$ENV_FILE"

rollback() {
  echo "Web health failed; restoring this host's previous image and application settings" >&2
  install -m 600 "$snapshot/env" "$ENV_FILE"
  # The image that was running, by id. The unit's `:latest` tag may have
  # moved since it was pulled, so the tag is not what was running.
  printf 'Image=%s\n' "$previous_image" > "$DROPIN_FILE"
  systemctl --user daemon-reload
  systemctl --user restart foodshare-web
}
mkdir -p "$DROPIN_DIR"
printf 'Image=%s\n' "$DEPLOY_IMAGE" > "$DROPIN_FILE"
chmod 600 "$DROPIN_FILE"
systemctl --user daemon-reload
if ! systemctl --user restart foodshare-web; then
  rollback
  exit 1
fi
for attempt in $(seq 1 24); do
  if podman exec foodshare-web curl --fail --silent --max-time 10 http://localhost:3000/api/health >/dev/null &&
    podman exec foodshare-web curl --fail --silent --max-time 10 'http://localhost:3000/food?distance=any' >/dev/null &&
    verify_listing_api; then
    echo "Production web health, Food page, and listing API passed for $DEPLOY_SHA"
    exit 0
  fi
  sleep 5
done
rollback
exit 1
