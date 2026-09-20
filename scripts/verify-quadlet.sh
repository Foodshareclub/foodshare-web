#!/usr/bin/env bash
# Verify Quadlet units: valid directives, no docker-compose-isms, copies in sync.
# Usage: bash scripts/verify-quadlet.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fail=0

pass() { echo "  ✓ $1"; }
fail_msg() { echo "  ✗ $1"; fail=$((fail + 1)); }

echo "Quadlet verification"
for unit in foodshare-web.container foodshare-cloudflared-web.container foodshare-web-network.network; do
  [ -f "$ROOT/$unit" ] && pass "$unit exists" || { fail_msg "$unit missing"; continue; }
done

# Required stanzas/keys in web unit
for key in "^\[Unit\]" "^\[Container\]" "^\[Service\]" "^\[Install\]" "^Image=" "^ContainerName=foodshare-web" "^PublishPort=3000:3000" "^HealthCmd=" "^EnvironmentFile=" "WantedBy=default.target"; do
  grep -Eq "$key" "$ROOT/foodshare-web.container" && pass "web unit: $key" || fail_msg "web unit missing: $key"
done

# Cloudflared unit must carry a valid tunnel Exec and none of the old corruption
grep -Eq "^Exec=tunnel .* run" "$ROOT/foodshare-cloudflared-web.container" && pass "cloudflared Exec intact" || fail_msg "cloudflared Exec broken"
if grep -Eq '英寸|rainfall|<tool_call>|dash.cloudflare-.cloudflare' "$ROOT/foodshare-cloudflared-web.container"; then
  fail_msg "cloudflared unit contains garbled bytes from old corruption"
else
  pass "cloudflared unit is clean text"
fi

# Reject docker-compose-isms that fail `quadlet --dryrun`
for bad in 'image = ' 'port = \[' 'restart = "unless-stopped"' 'healthcheck = \[' 'read_only' 'cap_drop' 'security_opt' 'when-started=' 'envFILE' 'portmap' 'logdriver' 'logopts'; do
  if grep -Eq "$bad" "$ROOT"/*.container "$ROOT/.github/quadlet/"*.container 2>/dev/null; then
    fail_msg "docker-ism detected: $bad"
  fi
done
pass "no docker-compose-isms in units"

# Copies in .github/quadlet must match canonical root units
for unit in foodshare-web.container foodshare-cloudflared-web.container; do
  if [ -f "$ROOT/.github/quadlet/$unit" ] && cmp -s "$ROOT/$unit" "$ROOT/.github/quadlet/$unit"; then
    pass ".github/quadlet/$unit in sync"
  else
    fail_msg ".github/quadlet/$unit out of sync with root unit"
  fi
done

# Keep optional Quadlet assets valid; production uses its existing Docker services.
grep -Eq "needs: build-and-publish" "$ROOT/.github/workflows/web.yml" && pass "deploy needs build-and-publish" || fail_msg "deploy still needs a non-existent job"
grep -Eq "needs: docker" "$ROOT/.github/workflows/web.yml" && fail_msg "dangling 'needs: docker' still present" || pass "no dangling needs: docker"
grep -Eq "bash scripts/deploy-production.sh" "$ROOT/.github/workflows/web.yml" && pass "deploy uses the verified production rollout" || fail_msg "deploy is missing the production rollout script"
grep -Eq "health-curl-fail" "$ROOT/.github/workflows/web.yml" && fail_msg "invalid --health-curl-fail flag still present" || pass "no invalid podman flags"

if [ "$fail" -gt 0 ]; then echo "$fail check(s) failed."; exit 1; fi
echo "All Quadlet checks passed."
