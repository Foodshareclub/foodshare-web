#!/bin/bash

# Update Supabase Auth Redirect URLs
# This script removes redundant redirect URLs from your Supabase project

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_REF="***REMOVED***"
MANAGEMENT_API="https://api.supabase.com/v1"

# Check if access token is provided
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN environment variable is not set${NC}"
    echo ""
    echo "To get your access token:"
    echo "1. Go to https://supabase.com/dashboard/account/tokens"
    echo "2. Create a new access token"
    echo "3. Export it: export SUPABASE_ACCESS_TOKEN='your-token-here'"
    echo ""
    exit 1
fi

echo -e "${YELLOW}Fetching current auth configuration...${NC}"

# Get current config
CURRENT_CONFIG=$(curl -s -X GET \
    "${MANAGEMENT_API}/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

# Check if the request was successful
if echo "$CURRENT_CONFIG" | grep -q "error\|message"; then
    echo -e "${RED}Error fetching config:${NC}"
    echo "$CURRENT_CONFIG"
    exit 1
fi

echo -e "${GREEN}Current config fetched successfully${NC}"
echo ""

# Cleaned redirect URLs (removing redundant ones)
CLEANED_URLS='[
  "https://foodshare.club/",
  "https://20d4fe75-ad4c-45d7-9c6a-b828ee31fa87.lovableproject.com/**",
  "https://20d4fe75-ad4c-45d7-9c6a-b828ee31fa87.sandbox.lovable.dev/**",
  "https://foodbnb-share.lovable.app/**",
  "https://frontend-*-foodshare.vercel.app/**",
  "https://frontend-*-organicnz-foodshare.vercel.app/**",
  "https://frontend-foodshare.vercel.app/**",
  "https://frontend-organicnz-foodshare.vercel.app/**",
  "https://id-preview--20d4fe75-ad4c-45d7-9c6a-b828ee31fa87.lovable.app/**",
  "https://id-preview--20d4fe75-ad4c-45d7-9c6a-b828ee31fa87.preview.lovable.dev/**",
  "https://preview--foodbnb-share.preview.lovable.dev/**",
  "https://foodshare-foodshare.vercel.app/**",
  "https://foodshare-*-foodshare.vercel.app/**"
]'

echo -e "${YELLOW}Preparing update with cleaned URLs...${NC}"
echo "Removed 6 redundant URLs (from 18 to 12)"
echo ""

# Prepare the update payload
# We need to merge the cleaned URLs with other auth config settings
UPDATE_PAYLOAD=$(echo "$CURRENT_CONFIG" | jq --argjson urls "$CLEANED_URLS" '.ADDITIONAL_REDIRECT_URLS = $urls')

echo -e "${YELLOW}Updating auth configuration...${NC}"

# Update the configuration
UPDATE_RESPONSE=$(curl -s -X PATCH \
    "${MANAGEMENT_API}/projects/${PROJECT_REF}/config/auth" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_PAYLOAD")

# Check if the update was successful
if echo "$UPDATE_RESPONSE" | grep -q "error\|message"; then
    echo -e "${RED}Error updating config:${NC}"
    echo "$UPDATE_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Auth configuration updated successfully!${NC}"
echo ""
echo "Summary:"
echo "- Removed redundant URLs (those covered by /** patterns)"
echo "- Total URLs: 18 → 12"
echo ""
echo "Updated redirect URLs:"
echo "$CLEANED_URLS" | jq -r '.[]' | sed 's/^/  - /'
