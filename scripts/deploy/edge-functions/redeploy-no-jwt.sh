#!/bin/bash

# Redeploy all edge functions with JWT verification disabled
# This script redeploys functions one by one with --no-verify-jwt flag

echo "🚀 Starting redeployment of all edge functions with JWT verification disabled..."
echo ""

# Array of functions to redeploy (excluding telegram-bot-foodshare which already has JWT disabled)
FUNCTIONS=(
  "resize-tinify-upload-image"
  "update-coordinates"
  "search-functions"
  "resend"
  "hf-inference"
  "update-post-coordinates"
  "cors-proxy-images"
  "check-upstash-services"
  "smart-email-route"
  "monitor-email-health"
  "process-email-queue"
  "get-translations"
  "notify-new-post"
  "notify-new-user"
  "get-my-chat-id"
)

SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_FUNCTIONS=()

for func in "${FUNCTIONS[@]}"; do
  echo "📦 Deploying $func with --no-verify-jwt..."
  
  if supabase functions deploy "$func" --no-verify-jwt; then
    echo "✅ Successfully deployed $func"
    ((SUCCESS_COUNT++))
  else
    echo "❌ Failed to deploy $func"
    ((FAIL_COUNT++))
    FAILED_FUNCTIONS+=("$func")
  fi
  
  echo ""
  sleep 1  # Small delay between deployments
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Successful: $SUCCESS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo "Failed functions:"
  for func in "${FAILED_FUNCTIONS[@]}"; do
    echo "  - $func"
  done
  exit 1
else
  echo "🎉 All functions deployed successfully!"
  exit 0
fi
