#!/bin/bash

# ============================================================================
# Deploy All Edge Functions - No JWT, Fully Optimized
# ============================================================================
# 
# This script deploys all edge functions with:
# - No JWT verification (--no-verify-jwt flag)
# - Latest packages and modern patterns
# - Heavy caching and performance optimizations
# - Proper error handling and monitoring
#
# Usage: ./deploy-all-no-jwt-optimized.sh
# ============================================================================

set -e

echo "🚀 Starting deployment of all edge functions (No JWT, Optimized)"
echo "================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter for tracking
TOTAL=0
SUCCESS=0
FAILED=0

# Function to deploy with no JWT verification
deploy_function() {
    local func_name=$1
    TOTAL=$((TOTAL + 1))
    
    echo -e "${BLUE}[$TOTAL] Deploying: ${func_name}${NC}"
    
    if supabase functions deploy "$func_name" --no-verify-jwt; then
        SUCCESS=$((SUCCESS + 1))
        echo -e "${GREEN}✓ Successfully deployed: ${func_name}${NC}"
    else
        FAILED=$((FAILED + 1))
        echo -e "${RED}✗ Failed to deploy: ${func_name}${NC}"
    fi
    
    echo ""
}

# Deploy all functions
echo "Deploying edge functions..."
echo ""

# Core functions
deploy_function "check-upstash-services"
deploy_function "cors-proxy-images"
deploy_function "get-my-chat-id"
deploy_function "get-translations"
deploy_function "hf-inference"

# Email functions
deploy_function "monitor-email-health"
deploy_function "notify-new-post"
deploy_function "notify-new-user"
deploy_function "process-email-queue"
deploy_function "resend"
deploy_function "smart-email-route"

# Utility functions
deploy_function "resize-tinify-upload-image"
deploy_function "search-functions"
deploy_function "update-coordinates"
deploy_function "update-post-coordinates"

# Telegram bot (already no JWT)
deploy_function "telegram-bot-foodshare"

# Summary
echo "================================================================"
echo -e "${BLUE}Deployment Summary:${NC}"
echo -e "  Total:   ${TOTAL}"
echo -e "  ${GREEN}Success: ${SUCCESS}${NC}"
echo -e "  ${RED}Failed:  ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All functions deployed successfully!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some functions failed to deploy. Check the logs above.${NC}"
    exit 1
fi
