#!/bin/bash
# Add only the most critical environment variables that are missing or outdated

set -e

echo "Adding critical environment variables to Vercel..."
echo ""

# Critical variables that must be up-to-date
CRITICAL_VARS=(
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NODE_ENV"
  "CI"
  "BREVO_API_KEY"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
)

count=0
for var in "${CRITICAL_VARS[@]}"; do
  # Get value from .env
  value=$(grep "^${var}=" .env | cut -d'=' -f2-)
  
  if [[ -z "$value" ]]; then
    echo "⚠️  Skipping $var (not found in .env)"
    continue
  fi
  
  count=$((count + 1))
  echo "[$count] Adding: $var"
  
  # Remove old value if exists
  vercel env rm "$var" production 2>&1 | grep -v "Debugger" | grep -v "Waiting for" > /dev/null || true
  
  # Add new value
  printf "%s\n" "$value" | vercel env add "$var" production 2>&1 | grep -v "Debugger" | grep -v "Waiting for" | head -1 || true
  
done

echo ""
echo "✅ Done! Added $count critical variables"
echo ""
echo "View at: https://vercel.com/organicnz/foodshare/settings/environment-variables"
