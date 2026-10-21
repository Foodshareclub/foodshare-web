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
# Exit status: 0 healthy, 1 something is wrong.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALERT=1
[ "${1:-}" = "--no-alert" ] && ALERT=0

# The Telegram credentials for the alert. They live in a file rather than
# in the environment, because the monitor runs from a timer with no login
# session and no shell to source them.
if [ -f "${MONITOR_ENV_FILE:-$HOME/.config/foodshare/monitor.env}" ]; then
  set -a
  # shellcheck disable=SC1091
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
# Auth is asked for on the api hostname, with the key Kong gates it
# behind. It used to be asked for at https://auth.foodshare.club/ -- the
# root of the split hostname -- which answers 404 whatever the auth
# service is doing, because Kong has no route for the root of a host. A
# check that can never pass is a check that trains people to ignore it.
ENDPOINTS=(
  "https://api.foodshare.club/functions/v1/api-v1-notifications/health|notification API"
  "https://api.foodshare.club/functions/v1/api-v1-email/health|email API"
  "https://api.foodshare.club/functions/v1/api-v1-health/health|health API"
  "https://foodshare.club/|website"
  "https://api.foodshare.club/auth/v1/health|auth"
)

failures=()
report=""

for entry in "${ENDPOINTS[@]}"; do
  url="${entry%%|*}"
  name="${entry#*|}"
  if [ -z "${ANON_KEY:-}" ]; then
    echo "::error::ANON_KEY is not set, so the monitor cannot check the API"
    failures+=("the anon key is not set, so the API could not be checked")
    continue
  fi
  code=$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' \
    -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" \
    "$url" 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then
    echo "ok    $name ($url) -> $code"
  else
    echo "FAIL  $name ($url) -> $code"
    failures+=("$name ($url) answered $code")
  fi
  report="$report$name: $code\n"
done

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

if [ ${#failures[@]} -eq 0 ]; then
  exit 0
fi

message="The FoodShare estate is not healthy:\n$(printf '%s\n' "${failures[@]}" | sed 's/^/- /')"
echo "$message" >&2

# Alert only when the verdict changes: a check that runs every five
# minutes and fails every time would send the same alert 288 times a day.
STATE_FILE="${MONITOR_STATE_FILE:-$HOME/.local/state/foodshare/monitor.state}"
mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true
previous=$(cat "$STATE_FILE" 2>/dev/null || echo "")
current=$(printf '%s' "${failures[*]}")

if [ "$ALERT" = 1 ] && [ "$previous" != "$current" ]; then
  bash "$SCRIPT_DIR/notify-telegram.sh" "FoodShare is down" "$message" || \
    echo "external-monitor: the alert could not be sent" >&2
elif [ -n "$previous" ] && [ -z "$current" ] && [ "$ALERT" = 1 ]; then
  bash "$SCRIPT_DIR/notify-telegram.sh" "FoodShare is back" "Every endpoint is answering again." || true
fi
printf '%s' "$current" > "$STATE_FILE" 2>/dev/null || true

exit 1
