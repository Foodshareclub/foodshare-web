#!/bin/bash
# Simple script to add all env vars to Vercel project
# Run this after: vercel link (to link to foodshare-pearl project)

set -e

echo "Adding environment variables to Vercel..."
echo ""

# Read .env and add each variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  [[ -z "$key" ]] && continue
  [[ -z "$value" ]] && continue
  
  echo "Adding: $key"
  echo "$value" | vercel env add "$key" production --yes 2>/dev/null || echo "  (already exists)"
  
done < .env

echo ""
echo "✅ Done! Now redeploy with: vercel --prod"
