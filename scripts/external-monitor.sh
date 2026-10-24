#!/usr/bin/env bash
# External blackbox monitor for the FoodShare estate.
#
# Run this from a machine that is NOT the backend — the web host is the
# natural place. The monitoring that runs inside the stack cannot report the
# stack's own outage: when the network is broken, the monitor is broken with
# it, and the silence looks like health. That is how a three-week outage
# happened.
#
#   scripts/external-monitor.sh            # check once, alert on failure
#   scripts/external-monitor.sh --no-alert # check only
#
# This file exists in two places. The copy that runs is the one in
# `foodshare-web` — the monitor is a timer on the web host, and the web
# host's copy is the one that executes. The copy here is the source both
# are kept in step with, so the two do not drift apart and leave the
# estate watched by a check that cannot tell the truth.
#
# Exit status: 0 healthy, 1 something is wrong.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALERT=1
[ "${1:-}" = "--no-alert" ] && ALERT=0

# The credentials the monitor needs. They live in a file rather than in the
# environment, because the monitor runs from a timer with no login session
# and no shell to source them.
if [ -f "${MONITOR_ENV_FILE:-$HOME/.config/foodshare/monitor.env}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${MONITOR_ENV_FILE:-$HOME/.config/foodshare/monitor.env}"
  set +a
fi

# The key Kong gates the API behind. It is the anon key, which is public by
# design -- it is in every browser that uses the site -- and it is the only
# thing that lets a request past Kong to the service behind it.
if [ -z "${ANON_KEY:-}" ] && [ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
fi
if [ -z "${ANON_KEY:-}" ] && [ -f "${WEB_ENV_FILE:-/home/organic/dev/foodshare-web/.env.production}" ]; then
  # The web app's own environment carries the key it uses, and the monitor
  # runs on the same host, so it reads it from there rather than asking for
  # a second copy of it.
  ANON_KEY=$(grep -E "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "${WEB_ENV_FILE:-/home/organic/dev/foodshare-web/.env.production}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'")
fi

# The endpoints that make up the estate, and what "working" means for each.
#
# The third field says whether the endpoint is behind Kong's key. The
# website is not, and it used to be checked as though it were: a missing
# key skipped the whole loop, so the one endpoint that could still be
# reached without a key was the one endpoint nobody checked.
#
# Auth is asked for on the api hostname, with the key Kong gates it
# behind. It used to be asked for at https://auth.foodshare.club/ -- the
# root of the split hostname -- which answers 404 whatever the auth
# service is doing, because Kong has no route for the root of a host. A
# check that can never pass is a check that trains people to ignore it.
ENDPOINTS=(
  "https://api.foodshare.club/functions/v1/api-v1-notifications/health|notification API|key"
  "https://api.foodshare.club/functions/v1/api-v1-email/health|email API|key"
  "https://api.foodshare.club/functions/v1/api-v1-health/health|health API|key"
  "https://foodshare.club/|website"
  "https://api.foodshare.club/auth/v1/health|auth|key"
)

failures=()
unchecked=0

for entry in "${ENDPOINTS[@]}"; do
  url="${entry%%|*}"
  rest="${entry#*|}"
  name="${rest%%|*}"
  needs_key="${rest#*|}"

  if [ "$needs_key" = "key" ] && [ -z "${ANON_KEY:-}" ]; then
    # Counted, not failed, one endpoint at a time: the key is missing once,
    # and reporting it once per endpoint said the same thing five times and
    # hid the endpoints that could still be checked.
    unchecked=$((unchecked + 1))
    continue
  fi

  # curl writes 000 itself when it cannot reach the host, so the code is
  # taken from it rather than appended: "|| echo 000" would make a failed
  # request read as 000000.
  code=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' \
    -H "apikey: ${ANON_KEY:-}" -H "Authorization: Bearer ${ANON_KEY:-}" \
    "$url" 2>/dev/null)
  [ -z "$code" ] && code=000
  if [ "$code" = "200" ]; then
    echo "ok    $name ($url) -> $code"
  else
    echo "FAIL  $name ($url) -> $code"
    failures+=("$name ($url) answered $code")
  fi
done

# A process health route can be green while public product reads are broken.
# Exercise the same anonymous feed -> owner-detail path as the web preflight.
check_listing_flow() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "FAIL  listing journey: jq is unavailable"
    return 1
  fi
  local base feed listing_id detail
  base="${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-https://api.${SITE_DOMAIN:-foodshare.club}}}"
  base="${base%/}/functions/v1/api-v1-products"
  feed=$(curl -fsS --max-time 20 --max-filesize 1048576 \
    -H "apikey: ${ANON_KEY}" "$base?postType=food&limit=1" 2>/dev/null) || {
    echo "FAIL  listing journey: feed request failed"
    return 1
  }
  listing_id=$(printf '%s' "$feed" | jq -er '
    select(.success == true and (.data | type) == "array" and (.data | length) > 0)
    | .data[0].id
    | select(type == "number" or type == "string")
    | tostring | select(test("^[A-Za-z0-9_-]+$"))
  ' 2>/dev/null) || {
    echo "FAIL  listing journey: feed did not provide a valid listing"
    return 1
  }
  detail=$(curl -fsS --max-time 20 --max-filesize 1048576 \
    -H "apikey: ${ANON_KEY}" "$base?id=$listing_id&include=owner" 2>/dev/null) || {
    echo "FAIL  listing journey: owner detail request failed"
    return 1
  }
  printf '%s' "$detail" | jq -e --arg id "$listing_id" \
    '.success == true and (.data | type) == "object" and (.data.id | tostring) == $id' \
    >/dev/null 2>&1 || {
    echo "FAIL  listing journey: detail did not match the feed"
    return 1
  }
  echo "ok    listing journey: feed and owner detail agree"
}

if [ -z "${ANON_KEY:-}" ]; then
  unchecked=$((unchecked + 1))
elif ! check_listing_flow; then
  failures+=("anonymous listing journey failed")
fi

if [ "$unchecked" -gt 0 ]; then
  echo "FAIL  $unchecked endpoint(s) could not be checked: the anon key is not set"
  failures+=("$unchecked endpoint(s) could not be checked: the anon key is not set")
fi

# A tunnel with no connector is a 1033 from Cloudflare, and the connector
# being alive is not the same as the origin being reachable — so the
# endpoints above are the ones that matter, and the connector is only
# reported for context.
if command -v podman >/dev/null 2>&1; then
  for container in $(podman ps --format '{{.Names}}' 2>/dev/null | grep -i cloudflared); do
    # The connector image is distroless — there is no shell in it to run a
    # probe with, so a probe here would always fail. The endpoints above
    # are the real test: they only answer if the tunnel is connected and
    # the origin is reachable.
    state=$(podman inspect --format '{{.State.Status}}' "$container" 2>/dev/null || echo missing)
    if [ "$state" = "running" ]; then
      echo "ok    tunnel connector $container is running"
    else
      echo "FAIL  tunnel connector $container is $state"
      failures+=("tunnel connector $container is $state")
    fi
  done
fi

# The state file is written on every run, healthy or not, because the
# "back" alert is decided by what the last run said. It used to be written
# only on a failure, and the healthy path returned before the "back" alert
# could fire — so the monitor could announce an outage and never announce
# its end, and the state it compared against was always a failure.
STATE_FILE="${MONITOR_STATE_FILE:-$HOME/.local/state/foodshare/monitor.state}"
mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true
previous=$(cat "$STATE_FILE" 2>/dev/null || echo "")
current=""
if [ ${#failures[@]} -gt 0 ]; then
  current=$(printf '%s' "${failures[*]}")
fi

if [ ${#failures[@]} -eq 0 ]; then
  if [ -n "$previous" ] && [ "$ALERT" = 1 ]; then
    bash "$SCRIPT_DIR/notify-telegram.sh" "FoodShare is back" "Every endpoint is answering again." || \
      echo "external-monitor: the alert could not be sent" >&2
  fi
  printf '%s' "$current" > "$STATE_FILE" 2>/dev/null || true
  exit 0
fi

message="The FoodShare estate is not healthy:\n$(printf '%s\n' "${failures[@]}" | sed 's/^/- /')"
echo "$message" >&2

# Alert only when the verdict changes: a check that runs every five
# minutes and fails every time would send the same alert 288 times a day.
if [ "$ALERT" = 1 ] && [ "$previous" != "$current" ]; then
  bash "$SCRIPT_DIR/notify-telegram.sh" "FoodShare is down" "$message" || \
    echo "external-monitor: the alert could not be sent" >&2
fi
printf '%s' "$current" > "$STATE_FILE" 2>/dev/null || true

exit 1
