#!/bin/bash

# 🔍 Telegram Bot Deployment Verification Script
# This script verifies that the enhanced bot is working correctly

set -e

FUNCTION_URL="https://api.foodshare.club/functions/v1/telegram-bot-foodshare"

echo "🔍 Verifying Telegram Bot Deployment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "${FUNCTION_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "   ✅ Health check passed"
else
    echo "   ❌ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Webhook Info
echo "2️⃣  Checking webhook configuration..."
WEBHOOK_RESPONSE=$(curl -s "${FUNCTION_URL}/webhook-info")
if echo "$WEBHOOK_RESPONSE" | grep -q "url"; then
    echo "   ✅ Webhook is configured"
    echo "   $(echo $WEBHOOK_RESPONSE | grep -o '"url":"[^"]*"')"
else
    echo "   ⚠️  Webhook might not be set up"
    echo "   Run: curl ${FUNCTION_URL}/setup-webhook"
fi
echo ""

# Test 3: Function Logs (last 10 entries)
echo "3️⃣  Checking recent function logs..."
echo "   (Requires Supabase CLI and authentication)"
if command -v supabase &> /dev/null; then
    echo "   Fetching logs..."
    supabase functions logs telegram-bot-foodshare --project-ref foodshare --limit 5 2>/dev/null || echo "   ⚠️  Could not fetch logs (authentication required)"
else
    echo "   ⚠️  Supabase CLI not installed"
fi
echo ""

# Test 4: Database Connection
echo "4️⃣  Verifying database tables..."
echo "   Required tables:"
echo "   - profiles (with telegram_id column)"
echo "   - posts (for food sharing)"
echo "   - telegram_user_activity (for stats)"
echo "   - messages (for tracking)"
echo ""
echo "   ℹ️  Run these SQL queries to verify:"
echo "   SELECT COUNT(*) FROM profiles WHERE telegram_id IS NOT NULL;"
echo "   SELECT COUNT(*) FROM telegram_user_activity;"
echo ""

# Test 5: Environment Variables
echo "5️⃣  Environment variables checklist..."
echo "   Required variables:"
echo "   - BOT_TOKEN (Telegram bot token)"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - APP_URL (https://foodshare.club)"
echo "   - WEBHOOK_URL (function URL)"
echo ""
echo "   ℹ️  Set via: supabase secrets set --project-ref foodshare"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Function is deployed and responding"
echo "✅ Health endpoint working"
echo ""
echo "📱 Test your bot manually:"
echo "   1. Open Telegram"
echo "   2. Search for your bot"
echo "   3. Send: /start"
echo "   4. Try: /share, /find, /nearby, /profile, /impact"
echo ""
echo "📚 Documentation:"
echo "   - Features: supabase/functions/telegram-bot-foodshare/ENHANCED_FEATURES.md"
echo "   - Testing: supabase/functions/telegram-bot-foodshare/TESTING_GUIDE.md"
echo "   - Refactor: supabase/functions/REFACTOR_SUMMARY.md"
echo ""
echo "🎉 Deployment verification complete!"
