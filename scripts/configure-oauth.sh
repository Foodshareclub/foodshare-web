#!/bin/bash
# =============================================================================
# OAuth Configuration Script for Self-Hosted Supabase
# =============================================================================
# This script helps configure OAuth providers in your self-hosted Supabase instance
#
# Usage:
#   ./scripts/configure-oauth.sh google
#   ./scripts/configure-oauth.sh github
#   ./scripts/configure-oauth.sh facebook
#   ./scripts/configure-oauth.sh apple
#
# Prerequisites:
#   - SSH access to VPS
#   - OAuth credentials from provider console
# =============================================================================

set -e

PROVIDER=$1
VPS_HOST="${VPS_HOST:-organic@vps.foodshare.club}"
BACKEND_PATH="${BACKEND_PATH:-/home/organic/dev/foodshare-backend}"

if [ -z "$PROVIDER" ]; then
  echo "Usage: $0 <provider>"
  echo "Available providers: google, github, facebook, apple"
  exit 1
fi

PROVIDER_UPPER=$(echo "$PROVIDER" | tr '[:lower:]' '[:upper:]')

echo "=============================================================================  "
echo "Configuring $PROVIDER_UPPER OAuth for Self-Hosted Supabase"
echo "============================================================================="
echo ""

# Prompt for credentials
read -p "Enter $PROVIDER_UPPER Client ID: " CLIENT_ID
read -sp "Enter $PROVIDER_UPPER Client Secret: " CLIENT_SECRET
echo ""

# Determine redirect URI
REDIRECT_URI="https://api.foodshare.club/auth/v1/callback"

echo ""
echo "Configuration:"
echo "  Provider: $PROVIDER_UPPER"
echo "  Client ID: ${CLIENT_ID:0:20}..."
echo "  Redirect URI: $REDIRECT_URI"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

# SSH to VPS and configure
echo ""
echo "Connecting to VPS and configuring..."
echo ""

ssh "$VPS_HOST" <<EOF
set -e

cd "$BACKEND_PATH"

# Backup existing .env
if [ -f .env ]; then
  cp .env .env.backup.\$(date +%Y%m%d_%H%M%S)
  echo "✓ Backed up existing .env"
fi

# Remove existing configuration for this provider
sed -i '/GOTRUE_EXTERNAL_${PROVIDER_UPPER}/d' .env 2>/dev/null || true

# Add new configuration
cat >> .env <<EOL

# $PROVIDER_UPPER OAuth Configuration (added $(date))
GOTRUE_EXTERNAL_${PROVIDER_UPPER}_ENABLED=true
GOTRUE_EXTERNAL_${PROVIDER_UPPER}_CLIENT_ID=$CLIENT_ID
GOTRUE_EXTERNAL_${PROVIDER_UPPER}_SECRET=$CLIENT_SECRET
GOTRUE_EXTERNAL_${PROVIDER_UPPER}_REDIRECT_URI=$REDIRECT_URI
EOL

echo "✓ Updated .env with $PROVIDER_UPPER OAuth configuration"

# Restart Supabase auth service
if docker ps | grep -q supabase.*auth; then
  docker compose restart auth
  echo "✓ Restarted Supabase auth service"
elif docker ps | grep -q gotrue; then
  docker restart gotrue
  echo "✓ Restarted GoTrue service"
else
  echo "⚠ Warning: Could not find auth service to restart"
  echo "  Please restart manually: docker compose restart auth"
fi

echo ""
echo "✓ $PROVIDER_UPPER OAuth configured successfully!"
EOF

echo ""
echo "============================================================================="
echo "Next Steps:"
echo "============================================================================="
echo ""
echo "1. Enable in Web App:"
echo "   gh secret set NEXT_PUBLIC_OAUTH_${PROVIDER_UPPER}_ENABLED --body \"true\" --repo Foodshareclub/foodshare-web"
echo ""
echo "2. Trigger deployment:"
echo "   git commit --allow-empty -m \"chore: enable $PROVIDER OAuth\" && git push"
echo ""
echo "3. Test OAuth flow:"
echo "   Visit https://foodshare.club and try signing in with $PROVIDER"
echo ""
echo "============================================================================="
