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
# Podman is the only container runtime this estate uses. There is no Docker
# daemon on the host, on the CI runner, or on a developer machine, so the
# arbitration between two runtimes cannot happen and the case where the
# service exists in both is gone with it. What remains is the guarantee
# that matters: the deployment talks to the runtime that owns the running
# service, and it stops rather than assuming.
#
# Two paths can be overridden, and only for the test: the environment file
# the unit reads, and the directory the units are installed in.
set -euo pipefail

ENV_FILE="${FOODSHARE_WEB_ENV_FILE:-/etc/foodshare/foodshare-web.env}"
UNIT_DIR="${FOODSHARE_WEB_UNIT_DIR:-$HOME/.config/containers/systemd}"
DROPIN_DIR="$UNIT_DIR/foodshare-web.container.d"
DROPIN_FILE="$DROPIN_DIR/50-image.conf"

# The unit says where the configuration is, and the deployment writes
# where the unit reads.
#
# Two generations of the unit exist in this repository: one that reads
# the environment file from /etc, and a newer one that reads it from the
# operator's home. A host carries one of them, and the unit is what
# decides -- the deployment follows it, so it works on either.
#
# A host with no unit at all gets this repository's unit, and that unit
# names the default path, so the default is what is written.
unit_environment_file=""
if [ -f "$UNIT_DIR/foodshare-web.container" ] && [ -z "${FOODSHARE_WEB_ENV_FILE:-}" ]; then
  unit_environment_file=$(grep -E "^EnvironmentFile=" "$UNIT_DIR/foodshare-web.container" 2>/dev/null | head -1 | cut -d= -f2- || true)
  if [ -n "$unit_environment_file" ]; then
    if [ -z "${HOME:-}" ]; then
      echo "The unit on this host reads its environment from $unit_environment_file, and the" >&2
      echo "home directory is not in the environment, so the path cannot be resolved." >&2
      exit 1
    fi
    ENV_FILE="${unit_environment_file//%h/$HOME}"
  fi
fi

# What this host has, printed when the deployment cannot go on. The failure
# it explains is the difference between "the app is not on this host" and
# "the app is on this host and something else is wrong", and a deployment
# that says only "run the install script" makes a reader guess.
report_host() {
  echo "--- what this host has ---" >&2
  echo "user: $(id -un)" >&2
  echo "containers belonging to this user:" >&2
  podman ps -a --format '{{.Names}}  {{.Status}}  {{.Image}}' 2>&1 | head -20 >&2 || true
  echo "units installed in $UNIT_DIR:" >&2
  ls -1 "$UNIT_DIR" 2>&1 | head -20 >&2 || true
  echo "environment file: $ENV_FILE" >&2
  if [ -f "$ENV_FILE" ]; then echo "  present" >&2; else echo "  missing" >&2; fi
}

# The units are installed after the environment file is written, which is
# not an ordering that looks like it means anything. It does: Quadlet
# generates the systemd unit from the template, and it refuses to generate
# a unit whose EnvironmentFile is not there. Install the unit first and
# the generator declines it, and the deployment then says the unit does
# not exist when it is sitting in the directory the whole time.
#
# The host's unit decides the generation.
#
# Two generations of the units exist in this repository: the older one at
# the top level, and a newer one under `systemd/`. A host carries one of
# them, and the deployment installs the matching set.
#
# It matters which. The two generations name their tunnel unit
# differently, so installing the wrong one puts a second tunnel on a host
# that already has one: two connectors, one token, and the second one is
# started by nothing and understood by no one.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
unit_source_dir="$ROOT"
unit_names="foodshare-web.container foodshare-cloudflared-web.container foodshare-web.network"
tunnel_unit_name="foodshare-cloudflared-web.container"
if [ -f "$UNIT_DIR/foodshare-web.container" ]; then
  if cmp -s "$UNIT_DIR/foodshare-web.container" "$ROOT/systemd/foodshare-web.container"; then
    unit_source_dir="$ROOT/systemd"
    unit_names="foodshare-web.container foodshare-cloudflared.container foodshare.network"
    tunnel_unit_name="foodshare-cloudflared.container"
  fi
fi

install_units() {
  local unit installed=0
  mkdir -p "$UNIT_DIR"
  for unit in $unit_names; do
    if [ ! -f "$UNIT_DIR/$unit" ] && [ -f "$unit_source_dir/$unit" ]; then
      install -m 644 "$unit_source_dir/$unit" "$UNIT_DIR/$unit"
      installed=1
    fi
  done
  if [ "$installed" = 1 ]; then systemctl --user daemon-reload; fi
}

# The container does not have to exist. It used to have to be running,
# which made the deployment unable to fix the one state it exists to fix: a
# service that is down. A stopped container still knows the image it was
# running, and that image is what the rollback restores, so nothing is
# lost by letting the deployment start it. The deployment starts it either
# way -- `systemctl --user restart` on a stopped unit starts it -- and the
# health check below is what decides whether the new image is good.
#
# A host that has never run the app is the same problem one step further
# on: there is no previous image to roll back to. The rollback puts the
# host back the way it was -- no pinned image, and the unit's own tag.
previous_image=$(podman container inspect --format '{{.Image}}' foodshare-web 2>/dev/null || true)

# The environment file does not have to exist yet. The deployment writes it
# from the values it was given, and the unit reads it when it starts.
#
# Requiring it to be there first was the second way a deployment could not
# bring a host back: a host whose environment file was lost, and a host
# that was reprovisioned, were hosts the deployment refused to touch and
# told a person to fix over SSH.
#
# Whether it was there is recorded, because the rollback has to put the host
# back the way it was: a file that was there is restored, and a file that
# was not is removed again.
had_env=0
if [ -f "$ENV_FILE" ]; then had_env=1; fi
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
# The registry credentials file is a path inside the snapshot directory,
# and it does not exist yet. podman reads the file it is given before it
# writes to it, and a file that is there but empty is not valid JSON, so
# podman refuses to log in:
#
#     Error: get credentials: reading JSON file "...": unexpected end of JSON input
#
# A path that is not there yet is what podman expects.
registry_auth="$snapshot/registry-auth.json"
trap 'rm -rf "$snapshot"' EXIT
if [ "$had_env" = 1 ]; then cp "$ENV_FILE" "$snapshot/env"; fi
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
UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN
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
# The environment file is written the way the install script writes it: the
# directory is made if it is not there, and the file is owned by the user
# the service runs as, so the next deployment can rewrite it.
#
# The directory under /etc is owned by root, so creating the file there
# needs the same elevation the install script uses. Overwriting a file
# that is already there does not -- the file belongs to the user -- so the
# plain write is tried first and the elevated one is the fallback.
write_env_file() {
  local source="$1"
  mkdir -p "$(dirname "$ENV_FILE")" 2>/dev/null ||
    sudo -n mkdir -p "$(dirname "$ENV_FILE")" 2>/dev/null || {
      echo "The directory $(dirname "$ENV_FILE") does not exist and cannot be created; run scripts/quadlet-install.sh first" >&2
      return 1
    }
  install -m 600 "$source" "$ENV_FILE" 2>/dev/null ||
    sudo -n install -m 600 -o "$(id -un)" "$source" "$ENV_FILE"
}

write_env_file "$snapshot/env.staged"


# The environment file is in place, so the units can be installed and the
# generator can build them.
install_units

# The tunnel's token is a podman secret on a host that runs the tunnel unit
# that reads one, and a line in the environment file on a host that runs
# the other. The environment file is written either way -- it is where the
# older unit looks -- but on a host that reads a secret, the secret is what
# the tunnel actually reads, and it is not there unless somebody made it.
#
# So the secret is made when the host's tunnel unit wants one and there is
# not one.
#
# An existing secret is never replaced. A secret is a file that a running
# container has mounted, and replacing it underneath that container is a
# way to break the tunnel that is working.
tunnel_needs_secret=0
if [ -f "$UNIT_DIR/$tunnel_unit_name" ] && grep -qE "^Secret=cf_tunnel_token" "$UNIT_DIR/$tunnel_unit_name"; then
  if ! podman secret inspect cf_tunnel_token >/dev/null 2>&1; then
    tunnel_needs_secret=1
  fi
fi
if [ "$tunnel_needs_secret" = 1 ]; then
  if [ -z "${CLOUDFLARE_TUNNEL_TOKEN:-}" ]; then
    echo "The tunnel on this host reads its token from a secret, and there is no" >&2
    echo "secret, and no token was given to make one with." >&2
    exit 1
  fi
  tunnel_token_file="$snapshot/tunnel.token"
  printf '%s' "$CLOUDFLARE_TUNNEL_TOKEN" > "$tunnel_token_file"
  chmod 600 "$tunnel_token_file"
  podman secret create cf_tunnel_token "$tunnel_token_file"
  rm -f "$tunnel_token_file"
  echo "Created the podman secret the tunnel on this host reads."
fi

if [ ! -f "$UNIT_DIR/foodshare-web.container" ]; then
  echo "The Quadlet unit could not be installed at $UNIT_DIR/foodshare-web.container" >&2
  report_host
  exit 1
fi

# The unit on the host has been read above, and the environment file this
# deployment writes is the one that unit reads.

restart_tunnel() {
  # BindsTo=foodshare-web.service stops the connector when the app restarts.
  # Starting the app again does not start that dependent service in reverse.
  if [ -f "$UNIT_DIR/$tunnel_unit_name" ]; then
    systemctl --user restart "${tunnel_unit_name%.container}"
  fi
}

rollback() {
  echo "Web health failed; restoring this host's previous image and application settings" >&2
  # The host is put back the way it was. A host that had an environment
  # file gets the file it had; a host that had none gets none again.
  if [ "$had_env" = 1 ]; then
    write_env_file "$snapshot/env"
  else
    rm -f "$ENV_FILE" 2>/dev/null || sudo -n rm -f "$ENV_FILE"
  fi
  # The image that was running, by id. The unit's `:latest` tag may have
  # moved since it was pulled, so the tag is not what was running. A host
  # that had never run the app had no image at all, so it goes back to the
  # image its own unit names.
  if [ -n "$previous_image" ]; then
    printf 'Image=%s\n' "$previous_image" > "$DROPIN_FILE"
  else
    rm -f "$DROPIN_FILE"
  fi
  systemctl --user daemon-reload
  systemctl --user restart foodshare-web
  restart_tunnel
}
# Why the unit is not there, when it is not.
#
# "Unit foodshare-web.service not found" is a symptom: the unit is
# generated from the template, and the generator is what says why it
# declined. The generator is asked directly, which is the same thing the
# CI does when it validates the units.
report_unit() {
  echo "--- why there is no foodshare-web.service ---" >&2
  if [ -x /usr/libexec/podman/quadlet ]; then
    /usr/libexec/podman/quadlet --dryrun "$UNIT_DIR/foodshare-web.container" 2>&1 | head -30 >&2 || true
  elif command -v quadlet >/dev/null 2>&1; then
    quadlet --dryrun "$UNIT_DIR/foodshare-web.container" 2>&1 | head -30 >&2 || true
  else
    echo "The Quadlet generator is not installed on this host." >&2
    echo "A unit is generated from the template, and without the generator" >&2
    echo "there is no unit however many templates are in the directory." >&2
  fi
  echo "--- the units in $UNIT_DIR ---" >&2
  ls -1 "$UNIT_DIR" 2>&1 | head -20 >&2 || true
}

mkdir -p "$DROPIN_DIR"
printf 'Image=%s\n' "$DEPLOY_IMAGE" > "$DROPIN_FILE"
chmod 600 "$DROPIN_FILE"
systemctl --user daemon-reload

# A deployment can be interrupted. A newer push cancels the run, and the
# runner can go away -- and either way the host is left holding the new
# image with no answer about whether it is good. The rollback only ran
# when the health check failed, which is the one way out that was
# handled.
#
# So the rollback runs on the way out, whatever the way out is. The
# deployment is finished when the health check has passed and not before,
# and anything else -- a signal, a failed command, a killed runner --
# leaves the host the way it was.
deployment_finished=0
on_exit() {
  local status=$?
  if [ "$deployment_finished" = 0 ] && [ "$image_pinned" = 1 ]; then
    echo "The deployment was interrupted; putting the host back the way it was" >&2
    rollback || true
  fi
  rm -rf "$snapshot"
  return $status
}
# The host holds the new image from the moment the drop-in names it, so
# that is the moment the rollback becomes necessary. Not when the unit is
# restarted: an interruption between the two would leave the host with
# the new image and no answer about it.
image_pinned=1
trap on_exit EXIT
# A signal is an exit like any other: the trap above runs on the way out.
trap 'exit 143' TERM INT

# The unit has to start when the machine does. A unit that is not enabled
# leaves the site dark after a reboot, which is how it stayed dark for
# three weeks.
systemctl --user enable foodshare-web >/dev/null 2>&1 || true
if ! systemctl --user restart foodshare-web; then
  report_unit
  rollback
  exit 1
fi
if ! restart_tunnel; then
  echo "The public tunnel failed to restart; restoring the previous deployment" >&2
  rollback
  exit 1
fi
for attempt in $(seq 1 24); do
  if podman exec foodshare-web curl --fail --silent --max-time 10 http://localhost:3000/api/health >/dev/null &&
    podman exec foodshare-web curl --fail --silent --max-time 10 'http://localhost:3000/food?distance=any' >/dev/null &&
    verify_listing_api; then
    echo "Production web health, Food page, and listing API passed for $DEPLOY_SHA"
    deployment_finished=1
    exit 0
  fi
  sleep 5
done
rollback
exit 1
