#!/usr/bin/env bash
# Invoked by GitHub Actions on each existing production web host.
set -euo pipefail

if [ "$(docker container inspect --format '{{.State.Running}}' foodshare-web 2>/dev/null)" != true ]; then
  echo "The existing Docker web service must be running before deployment" >&2
  exit 1
fi
if command -v podman >/dev/null 2>&1 && [ "$(podman container inspect --format '{{.State.Running}}' foodshare-web 2>/dev/null || true)" = true ]; then
  echo "Web services exist in both runtimes; refusing an ambiguous deployment" >&2
  exit 1
fi
docker compose -f docker-compose.yml config --quiet
verify_listing_api() {
  docker exec -i foodshare-web bun run - <<'JS'
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
  docker exec foodshare-web curl --fail --silent --max-time 15 http://localhost:3000/api/health >/dev/null
  verify_listing_api
  echo "Existing Docker web service and production Compose configuration verified"
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
registry_config=$(mktemp -d)
trap 'rm -rf "$snapshot" "$registry_config"' EXIT
cp .env.production "$snapshot/env.production"
previous_image=$(docker container inspect --format '{{.Image}}' foodshare-web)
printf '%s' "$GITHUB_TOKEN" | docker --config "$registry_config" login ghcr.io --username "$GITHUB_ACTOR" --password-stdin >/dev/null
docker --config "$registry_config" pull "$DEPLOY_IMAGE"
revision=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$DEPLOY_IMAGE")
if [ "$revision" != "$DEPLOY_SHA" ]; then
  echo "Pulled image does not match the validated commit" >&2
  exit 1
fi

# Preserve existing host configuration and update only the supplied application
# settings. Values never appear in command arguments or deployment logs.
python3 - <<'PY'
import json, os, pathlib
path = pathlib.Path('.env.production')
keys = '''NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
SITE_DOMAIN NEXT_PUBLIC_APP_URL NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_SENTRY_DSN
SENTRY_ORG SENTRY_PROJECT SENTRY_RELEASE NEXT_PUBLIC_SENTRY_RELEASE
NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED
NEXT_PUBLIC_OAUTH_APPLE_ENABLED NEXT_PUBLIC_OAUTH_GITHUB_ENABLED'''.split()
values = {key: os.environ[key] for key in keys if os.environ.get(key)}
lines = [line for line in path.read_text().splitlines()
         if line.split('=', 1)[0] not in values and not line.startswith('NODE_TLS_REJECT_UNAUTHORIZED=')]
lines += [key + '=' + json.dumps(value.replace('$', '$$')) for key, value in values.items()]
temporary = path.with_suffix('.production.deploy')
temporary.write_text('\n'.join(lines) + '\n')
temporary.chmod(0o600)
temporary.replace(path)
PY

rollback() {
  echo "Web health failed; restoring this host's previous image and application settings" >&2
  cp "$snapshot/env.production" .env.production
  FOODSHARE_WEB_IMAGE="$previous_image" docker compose -f docker-compose.yml up -d --no-deps foodshare-web
}
if ! FOODSHARE_WEB_IMAGE="$DEPLOY_IMAGE" docker compose -f docker-compose.yml up -d --no-deps foodshare-web; then
  rollback
  exit 1
fi
for attempt in $(seq 1 24); do
  if docker exec foodshare-web curl --fail --silent --max-time 10 http://localhost:3000/api/health >/dev/null &&
    docker exec foodshare-web curl --fail --silent --max-time 10 'http://localhost:3000/food?distance=any' >/dev/null &&
    verify_listing_api; then
    echo "Production web health, Food page, and listing API passed for $DEPLOY_SHA"
    exit 0
  fi
  sleep 5
done
rollback
exit 1
